import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    // Cliente com o token do usuário que chamou a função
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verificar identidade do caller
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar se é superadmin
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('roles')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile?.roles?.includes('superadmin')) {
      return new Response(JSON.stringify({ error: 'Proibido: apenas superadmin pode executar esta ação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { org_id } = await req.json()
    if (!org_id) {
      return new Response(JSON.stringify({ error: 'org_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente com service_role para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar todos os profiles da org ANTES de deletar
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('organization_id', org_id)

    if (profilesError) {
      return new Response(JSON.stringify({ error: `Erro ao buscar profiles: ${profilesError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletar todos os auth.users da organização
    const results: Array<{ id: string; email: string; error: string | null }> = []
    for (const profile of (profiles ?? [])) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.id)
      results.push({
        id: profile.id,
        email: profile.email,
        error: deleteError?.message ?? null,
      })
    }

    const successCount = results.filter(r => !r.error).length
    const errorCount = results.filter(r => r.error).length

    return new Response(JSON.stringify({
      success: true,
      summary: { total: results.length, success: successCount, errors: errorCount },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
