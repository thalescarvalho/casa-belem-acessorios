import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Address = Database['public']['Tables']['addresses']['Row']
export type AddressInput = Database['public']['Tables']['addresses']['Insert']

export async function fetchMyAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createAddress(input: AddressInput) {
  const { data, error } = await supabase.from('addresses').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateAddress(id: string, input: Partial<AddressInput>) {
  const { data, error } = await supabase
    .from('addresses')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAddress(id: string) {
  const { error } = await supabase.from('addresses').delete().eq('id', id)
  if (error) throw error
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const { error: clearError } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
  if (clearError) throw clearError
  const { error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
  if (error) throw error
}
