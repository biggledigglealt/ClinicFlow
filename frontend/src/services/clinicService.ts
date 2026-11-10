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
  listing_status: 'demo' | 'verified'
  source_name: string | null
  source_url: string | null
  source_checked_on: string | null
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

  const searchResults = (data ?? []) as Array<{
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
    distance_km: number | string
    next_available_at: string | null
  }>
  if (searchResults.length === 0) return []

  const { data: provenance, error: provenanceError } = await supabase
    .from('clinics')
    .select('id, listing_status, source_name, source_url, source_checked_on')
    .in('id', searchResults.map((clinic) => clinic.id))
  if (provenanceError) throw provenanceError
  const provenanceById = new Map((provenance ?? []).map((item) => [item.id, item]))

  return searchResults.flatMap((clinic) => {
    const source = provenanceById.get(clinic.id)
    if (!source || (source.listing_status !== 'demo' && source.listing_status !== 'verified')) return []
    return [{
      ...clinic,
      distance_km: Number(clinic.distance_km),
      listing_status: source.listing_status,
      source_name: source.source_name,
      source_url: source.source_url,
      source_checked_on: source.source_checked_on,
    }]
  })
}

export async function listClinicServiceOptions() {
  const { data, error } = await supabase
    .from('clinics')
    .select('services')
    .eq('is_active', true)
    .in('listing_status', ['demo', 'verified'])

  if (error) throw error

  return [...new Set((data ?? []).flatMap((clinic) => clinic.services ?? []))]
    .sort((a, b) => a.localeCompare(b))
}

export async function listActiveClinicsForStaffProvisioning() {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}
