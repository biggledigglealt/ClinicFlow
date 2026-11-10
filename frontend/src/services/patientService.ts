import { supabase } from '../lib/supabase'

export interface PatientProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string | null
}

export interface PatientProfileInput {
  firstName: string
  lastName: string
  phone?: string
}

export async function getPatientProfile(userId: string) {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('id, user_id, first_name, last_name, phone')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  return data as PatientProfile | null
}

export async function savePatientProfile(
  userId: string,
  input: PatientProfileInput,
) {
  const { data, error } = await supabase
    .from('patient_profiles')
    .upsert(
      {
        user_id: userId,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone?.trim() || null,
      },
      { onConflict: 'user_id' },
    )
    .select('id, user_id, first_name, last_name, phone')
    .single()

  if (error) throw error

  return data as PatientProfile
}
