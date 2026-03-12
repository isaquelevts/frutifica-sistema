import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Mapeia nome do dia em português para o número do dia da semana (0=Dom, 1=Seg, ...)
const DAY_MAP: Record<string, number> = {
  'domingo':    0,
  'segunda':    1,
  'segunda-feira': 1,
  'terça':      2,
  'terca':      2,
  'terça-feira': 2,
  'terca-feira': 2,
  'quarta':     3,
  'quarta-feira': 3,
  'quinta':     4,
  'quinta-feira': 4,
  'sexta':      5,
  'sexta-feira': 5,
  'sábado':     6,
  'sabado':     6,
}

function getDayNumber(dayOfWeek: string): number | null {
  const normalized = dayOfWeek.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [key, val] of Object.entries(DAY_MAP)) {
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalizedKey === normalized) return val
  }
  return null
}

function formatDatePtBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function toDateString(date: Date): string {
  // Retorna YYYY-MM-DD no timezone de Brasília
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validar segredo do cron (evita chamadas externas não autorizadas)
    // Quando chamado do frontend (teste), usa Authorization JWT normal
    const cronSecret = Deno.env.get('CRON_SECRET')
    const incomingSecret = req.headers.get('x-cron-secret')
    const authHeader = req.headers.get('Authorization')

    const isCronCall = cronSecret && incomingSecret === cronSecret
    const isManualCall = !!authHeader

    if (!isCronCall && !isManualCall) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Se for chamada manual (do frontend), verifica se é admin
    if (isManualCall && !isCronCall) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader! } } }
      )
      const { data: { user: caller } } = await supabaseClient.auth.getUser()
      if (!caller) {
        return new Response(JSON.stringify({ error: 'Não autenticado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('roles')
        .eq('id', caller.id)
        .single()

      const isAdmin = profile?.roles?.includes('admin') || profile?.roles?.includes('superadmin')
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Cliente admin para leitura sem RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let body: any = {}
    try { body = await req.json() } catch { /* body pode ser vazio */ }

    const { organization_id: filterOrgId, force = false } = body

    // Buscar configs ativas
    let configQuery = supabaseAdmin
      .from('whatsapp_config')
      .select('*, organizations(name)')
      .eq('active', true)
      .not('group_jid', 'is', null)

    if (filterOrgId) {
      configQuery = configQuery.eq('organization_id', filterOrgId)
    }

    const { data: configs, error: configError } = await configQuery
    if (configError) throw new Error(`Erro ao buscar configs: ${configError.message}`)
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma configuração ativa encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calcular janela de 7 dias (ontem até 7 dias atrás) em horário de Brasília
    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const windowDates: { date: Date; dayNum: number; dateStr: string }[] = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(nowBRT)
      d.setDate(d.getDate() - i)
      windowDates.push({
        date: d,
        dayNum: d.getDay(),
        dateStr: toDateString(d),
      })
    }

    const results: { org: string; sent: boolean; pendingCount: number }[] = []

    for (const config of configs) {
      const orgId = config.organization_id
      const orgName = (config.organizations as any)?.name || 'Igreja'

      // Buscar células ativas da organização
      const { data: cells } = await supabaseAdmin
        .from('cells')
        .select('id, name, leader_name, day_of_week')
        .eq('organization_id', orgId)
        .eq('active', true)

      if (!cells || cells.length === 0) continue

      // Para cada célula, verificar quais datas da janela correspondem ao dia dela
      // e se não existe relatório para aquela data
      const pendingByDate: Map<string, { dateLabel: string; cells: string[] }> = new Map()

      for (const cell of cells) {
        const cellDayNum = getDayNumber(cell.day_of_week || '')
        if (cellDayNum === null) continue

        for (const wd of windowDates) {
          if (wd.dayNum !== cellDayNum) continue

          // Verificar se existe relatório
          const { data: report } = await supabaseAdmin
            .from('reports')
            .select('id')
            .eq('cell_id', cell.id)
            .eq('date', wd.dateStr)
            .maybeSingle()

          if (!report) {
            if (!pendingByDate.has(wd.dateStr)) {
              pendingByDate.set(wd.dateStr, {
                dateLabel: formatDatePtBR(wd.date),
                cells: [],
              })
            }
            const leaderName = cell.leader_name ? ` – ${cell.leader_name}` : ''
            pendingByDate.get(wd.dateStr)!.cells.push(`• ${cell.name}${leaderName}`)
          }
        }
      }

      const hasPending = pendingByDate.size > 0

      if (!hasPending && !force) {
        results.push({ org: orgName, sent: false, pendingCount: 0 })
        continue
      }

      // Montar mensagem
      let message = `🔔 *Lembrete de Relatório*\n_${orgName}_\n\n`

      if (hasPending) {
        message += `As seguintes células ainda não preencheram o relatório:\n\n`

        // Ordenar datas do mais antigo para o mais recente
        const sortedDates = Array.from(pendingByDate.entries()).sort(([a], [b]) => a.localeCompare(b))
        for (const [, { dateLabel, cells: cellLines }] of sortedDates) {
          // Capitaliza primeira letra do dia da semana
          const label = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
          message += `📅 *${label}*\n`
          message += cellLines.join('\n') + '\n\n'
        }
      } else {
        // force=true mas sem pendentes (envio de teste)
        message += `✅ Todas as células preencheram o relatório! Nenhuma pendência esta semana.\n\n`
      }

      message += `Acesse agora: https://sistemafrutifica.com`

      // Enviar via Evolution API
      const baseUrl = config.evolution_api_url.replace(/\/$/, '')
      const sendResponse = await fetch(
        `${baseUrl}/message/sendText/${config.instance_name}`,
        {
          method: 'POST',
          headers: {
            'apikey': config.api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: config.group_jid,
            text: message,
          }),
        }
      )

      const sent = sendResponse.ok
      if (!sent) {
        const errText = await sendResponse.text()
        console.error(`Erro ao enviar para org ${orgId}: ${sendResponse.status} ${errText}`)
      }

      results.push({ org: orgName, sent, pendingCount: pendingByDate.size })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
