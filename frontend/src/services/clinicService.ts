import { supabase } from '../lib/supabase'

export interface Clinic {
  id: string
  name: string
  address: string
  city: string | null
  province: string | null
  phone: string | null
  description: string | null
  time_zone: string
  services: string[]
  accepting_new_patients: boolean
  distance_km: number
  next_available_at: string | null
}

export interface ClinicSearchOptions {
  location: string
  maxDistanceKm: number
  services: string[]
  acceptingNewPatients: boolean
  onlyWithAvailability: boolean
}

export async function searchClinics(options: ClinicSearchOptions) {
  const { data, error } = await supabase.rpc('search_clinics', {
    p_location: options.location,
    p_max_distance_km: options.maxDistanceKm,
    p_services: options.services,
    p_accepting_new_patients: options.acceptingNewPatients,
    p_only_with_availability: options.onlyWithAvailability,
  })

  if (error) throw error

  return ((data ?? []) as Array<Omit<Clinic, 'distance_km'> & { distance_km: number | string }>).map(
    (clinic) => ({ ...clinic, distance_km: Number(clinic.distance_km) }),
  )
}

export async function listClinicServiceOptions() {
  const { data, error } = await supabase
    .from('clinics')
    .select('services')
    .eq('is_active', true)

  if (error) throw error

  return [...new Set((data ?? []).flatMap((clinic) => clinic.services ?? []))]
    .sort((a, b) => a.localeCompare(b))
}
