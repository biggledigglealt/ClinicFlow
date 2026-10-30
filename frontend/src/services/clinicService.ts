import { supabase } from '../lib/supabase'

export interface Clinic {
  id: string
  name: string
  address: string
  city: string | null
  province: string | null
  phone: string | null
  description: string | null
}

export async function listActiveClinics(city = '') {
  let request = supabase
    .from('clinics')
    .select('id, name, address, city, province, phone, description')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const normalizedCity = city.trim()
  if (normalizedCity) request = request.ilike('city', `%${normalizedCity}%`)

  const { data, error } = await request

  if (error) throw error

  return (data ?? []) as Clinic[]
}
