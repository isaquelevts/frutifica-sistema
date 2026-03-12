import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sempre retorna 200 com { error } ou { groups } no body
// para garantir que data seja acessível no cliente (SDK não lê body em não-2xx)
const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return ok({ error: 'Sem autorização' })
    }

    // Verificar identidade e role do caller
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      console.error('[fetch-whatsapp-groups] Auth error:', authError?.message)
      return ok({ error: 'Não autenticado' })
    }

    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('roles, organization_id')
      .eq('id', caller.id)
      .single()

    const isAdmin = callerProfile?.roles?.includes('admin') || callerProfile?.roles?.includes('superadmin')
    if (!isAdmin) {
      return ok({ error: 'Apenas administradores podem acessar esta função' })
    }

    const orgId = callerProfile?.organization_id
    if (!orgId) {
      return ok({ error: 'Organização não encontrada' })
    }

    // Busca instance_name da org no banco
    const { data: config } = await supabaseClient
      .from('whatsapp_config')
      .select('instance_name')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!config?.instance_name) {
      return ok({ error: 'WhatsApp não configurado. Conecte primeiro escaneando o QR code.' })
    }

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!.replace(/\/$/, '')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!

    // Buscar grupos na Evolution API
    const fetchUrl = `${evolutionUrl}/group/fetchAllGroups/${config.instance_name}?getParticipants=false`
    console.log('[fetch-whatsapp-groups] Chamando Evolution API:', fetchUrl)

    let response: Response
    try {
      response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json',
        },
      })
    } catch (fetchErr: any) {
      console.error('[fetch-whatsapp-groups] Erro de rede:', fetchErr.message)
      return ok({ error: `Não foi possível conectar à Evolution API: ${fetchErr.message}` })
    }

    console.log('[fetch-whatsapp-groups] Status da resposta:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[fetch-whatsapp-groups] Erro da Evolution API:', response.status, errorText)
      return ok({ error: `Evolution API retornou erro ${response.status}: ${errorText}` })
    }

    const groups = await response.json()
    console.log('[fetch-whatsapp-groups] Total de grupos:', Array.isArray(groups) ? groups.length : 'não é array')

    // Normaliza para sempre retornar array de { id, subject }
    const normalized = Array.isArray(groups)
      ? groups.map((g: any) => ({ id: g.id, subject: g.subject || g.name || g.id }))
      : []

    return ok({ groups: normalized })

  } catch (error: any) {
    console.error('[fetch-whatsapp-groups] Erro interno:', error.message)
    return ok({ error: error.message ?? 'Erro interno' })
  }
})
