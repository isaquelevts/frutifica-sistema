import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return ok({ error: 'Sem autorização' })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) return ok({ error: 'Não autenticado' })

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('roles, organization_id')
      .eq('id', caller.id)
      .single()

    const isAdmin = profile?.roles?.includes('admin') || profile?.roles?.includes('superadmin')
    if (!isAdmin) return ok({ error: 'Apenas administradores podem executar esta ação' })

    const orgId = profile.organization_id
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!.replace(/\/$/, '')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!

    // Nome único da instância por organização (alphanumeric, sem hifens)
    const instanceName = 'frutifica' + orgId.replace(/-/g, '').substring(0, 8)
    console.log('[setup-whatsapp-instance] instanceName:', instanceName)

    // Tenta criar instância — ignora erro se já existir
    const createResp = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName, integration: 'WHATSAPP-BAILEYS' }),
    })
    const createData = await createResp.json().catch(() => ({}))
    console.log('[setup-whatsapp-instance] create result:', JSON.stringify(createData))

    // Verifica estado de conexão atual
    const stateResp = await fetch(
      `${evolutionUrl}/instance/connectionState/${instanceName}`,
      { headers: { 'apikey': evolutionKey } }
    )
    const stateData = await stateResp.json().catch(() => ({}))
    console.log('[setup-whatsapp-instance] state:', JSON.stringify(stateData))

    const state = stateData?.instance?.state ?? stateData?.state ?? 'close'

    // Salva instance_name no banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabaseAdmin
      .from('whatsapp_config')
      .upsert(
        {
          organization_id: orgId,
          instance_name: instanceName,
          connected: state === 'open',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )

    if (state === 'open') {
      return ok({ connected: true, instanceName })
    }

    // Busca QR code
    const qrResp = await fetch(
      `${evolutionUrl}/instance/connect/${instanceName}`,
      { headers: { 'apikey': evolutionKey } }
    )

    if (!qrResp.ok) {
      const errText = await qrResp.text()
      console.error('[setup-whatsapp-instance] QR error:', qrResp.status, errText)
      return ok({ error: `Erro ao gerar QR code (${qrResp.status}): ${errText}` })
    }

    const qrData = await qrResp.json()
    console.log('[setup-whatsapp-instance] QR keys:', Object.keys(qrData))

    // Evolution API pode retornar base64 em lugares diferentes conforme a versão
    const qrCode = qrData.base64 ?? qrData.qrcode?.base64 ?? null

    if (!qrCode) {
      console.error('[setup-whatsapp-instance] QR não encontrado:', JSON.stringify(qrData))
      return ok({ error: 'QR code não retornado pela Evolution API. Verifique os logs.' })
    }

    return ok({ connected: false, instanceName, qrCode })

  } catch (error: any) {
    console.error('[setup-whatsapp-instance] Erro interno:', error.message)
    return ok({ error: error.message ?? 'Erro interno' })
  }
})
