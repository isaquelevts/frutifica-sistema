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

    // Verificar se o caller é admin ou superadmin
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('roles, organization_id')
      .eq('id', caller.id)
      .single()

    const isAdmin = callerProfile?.roles?.includes('admin') || callerProfile?.roles?.includes('superadmin')
    if (profileError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Proibido: apenas administradores podem executar esta ação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente admin com service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Garantir que o usuário a ser excluído pertence à mesma organização
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user_id)
      .single()

    if (targetProfile?.organization_id !== callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: 'Proibido: usuário pertence a outra organização' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletar do auth.users (o cascade apaga o profile automaticamente se configurado,
    // mas também apagamos explicitamente para garantir)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: `Erro ao excluir usuário: ${deleteAuthError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Garantir que o profile foi removido (caso não haja cascade no DB)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
