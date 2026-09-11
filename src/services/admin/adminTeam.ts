import { supabase } from '@/lib/supabase'

export interface AdminUserWithProfile {
  user_id: string
  role: 'admin' | 'operator'
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

export async function fetchAdminTeam(): Promise<AdminUserWithProfile[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as unknown as AdminUserWithProfile[]) ?? []
}

export async function addAdminUserByEmail(email: string, role: 'admin' | 'operator') {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) {
    throw new Error(
      'Nenhum usuário cadastrado com este e-mail. Peça para a pessoa se cadastrar no site primeiro.',
    )
  }

  const { error } = await supabase.from('admin_users').upsert({ user_id: profile.id, role })
  if (error) throw error
}

export async function updateAdminUserRole(userId: string, role: 'admin' | 'operator') {
  const { error } = await supabase.from('admin_users').update({ role }).eq('user_id', userId)
  if (error) throw error
}

export async function removeAdminUser(userId: string) {
  const { error } = await supabase.from('admin_users').delete().eq('user_id', userId)
  if (error) throw error
}
