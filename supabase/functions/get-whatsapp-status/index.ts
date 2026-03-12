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
    if (!authHeader) return ok({ connected: false, state: 'unauthorized' })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) return ok({ connected: false, state: 'unauthenticated' })

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', caller.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) return ok({ connected: false, state: 'no_org' })

    // Busca instance_name do banco
    const { data: config } = await supabaseClient
      .from('whatsapp_config')
      .select('instance_name')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!config?.instance_name) {
      return ok({ connected: false, state: 'not_configured' })
    }

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!.replace(/\/$/, '')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!

    const stateResp = await fetch(
      `${evolutionUrl}/instance/connectionState/${config.instance_name}`,
      { headers: { 'apikey': evolutionKey } }
    )

    if (!stateResp.ok) {
      return ok({ connected: false, state: 'error' })
    }

    const stateData = await stateResp.json()
    const state = stateData?.instance?.state ?? stateData?.state ?? 'unknown'
    const connected = state === 'open'

    // Atualiza connected no banco quando conectar
    if (connected) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabaseAdmin
        .from('whatsapp_config')
        .update({ connected: true, updated_at: new Date().toISOString() })
        .eq('organization_id', orgId)
    }

    return ok({ connected, state })

  } catch (error: any) {
    console.error('[get-whatsapp-status] Erro:', error.message)
    return ok({ connected: false, state: 'error', error: error.message })
  }
})
