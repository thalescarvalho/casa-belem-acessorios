import { createClient } from 'npm:@supabase/supabase-js@2'

// Cliente com a service_role key — ignora RLS. Usado exclusivamente dentro de
// Edge Functions (nunca exposto ao frontend). As Edge Functions são o único
// lugar autorizado a escrever diretamente em public.payments e a atualizar
// public.orders.status a partir de eventos do gateway de pagamento.
export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados nas secrets da function.',
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
