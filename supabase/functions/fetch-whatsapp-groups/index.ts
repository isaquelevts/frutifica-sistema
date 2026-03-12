import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Sem autorização' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar identidade e role do caller
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('roles')
      .eq('id', caller.id)
      .single()

    const isAdmin = callerProfile?.roles?.includes('admin') || callerProfile?.roles?.includes('superadmin')
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem acessar esta função' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { evolution_api_url, api_key, instance_name } = await req.json()

    if (!evolution_api_url || !api_key || !instance_name) {
      return new Response(JSON.stringify({ error: 'evolution_api_url, api_key e instance_name são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar grupos na Evolution API
    const baseUrl = evolution_api_url.replace(/\/$/, '')
    const response = await fetch(
      `${baseUrl}/group/fetchAllGroups/${instance_name}?getParticipants=false`,
      {
        method: 'GET',
        headers: {
          'apikey': api_key,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: `Evolution API retornou erro ${response.status}: ${errorText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groups = await response.json()

    // Normaliza para sempre retornar array de { id, subject }
    const normalized = Array.isArray(groups)
      ? groups.map((g: any) => ({ id: g.id, subject: g.subject || g.name || g.id }))
      : []

    return new Response(JSON.stringify({ groups: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
