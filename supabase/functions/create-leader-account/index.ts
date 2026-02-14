
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Verificar que quem chamou é admin
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user: caller } } = await supabaseClient.auth.getUser()
        if (!caller) return new Response('Unauthorized', { status: 401 })

        // Verificar role admin
        const { data: callerProfile } = await supabaseClient
            .from('profiles')
            .select('roles, organization_id')
            .eq('id', caller.id)
            .single()

        if (!callerProfile?.roles?.includes('admin')) {
            return new Response('Forbidden: admin only', { status: 403 })
        }

        // Usar service_role para criar o usuário
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { leaders } = await req.json()
        // leaders: Array<{ name, email, phone, password }>

        const results = []

        for (const leader of leaders) {
            try {
                // 1. Criar conta Auth
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: leader.email,
                    password: leader.password,
                    email_confirm: true, // Já confirma o email
                })

                if (authError) throw authError

                // 2. Criar profile
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        organization_id: callerProfile.organization_id,
                        name: leader.name,
                        email: leader.email,
                        roles: ['leader'],
                    })

                if (profileError) throw profileError

                results.push({
                    email: leader.email,
                    name: leader.name,
                    user_id: authData.user.id,
                    status: 'success',
                })
            } catch (error) {
                results.push({
                    email: leader.email,
                    name: leader.name,
                    user_id: null,
                    status: 'error',
                    error: error.message,
                })
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
