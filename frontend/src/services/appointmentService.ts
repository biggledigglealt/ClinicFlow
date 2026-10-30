import { supabase } from '../lib/supabase'

export interface AppointmentSlot {
  staff_id: string
  staff_first_name: string
  staff_last_name: string
  staff_job_title: string | null
  start_at: string
  end_at: string
}

export interface PatientAppointment {
  id: string
  start_at: string
  end_at: string
  status: 'booked' | 'confirmed'
  clinic: { name: string; time_zone: string } | null
  staff: { first_name: string; last_name: string; job_title: string | null } | null
}

type MaybeRelation<T> = T | T[] | null
type AppointmentRow = Omit<PatientAppointment, 'clinic' | 'staff'> & {
  clinic: MaybeRelation<{ name: string; time_zone: string }>
  staff: MaybeRelation<{ first_name: string; last_name: string; job_title: string | null }>
}

export async function getAvailableSlots(clinicId: string, date: string) {
  const { data, error } = await supabase.rpc('available_appointment_slots', {
    p_clinic_id: clinicId,
    p_date: date,
  })

  if (error) throw error

  return (data ?? []) as AppointmentSlot[]
}

export async function bookAppointment(
  clinicId: string,
  staffId: string,
  startAt: string,
) {
  const { data, error } = await supabase.rpc('book_appointment', {
    p_clinic_id: clinicId,
    p_staff_id: staffId,
    p_start_at: startAt,
  })

  if (error) throw error

  return data as string
}

export async function listMyUpcomingAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_at, end_at, status, clinic:clinics!appointments_clinic_id_fkey(name, time_zone), staff:staff_profiles!appointments_staff_id_fkey(first_name, last_name, job_title)')
    .in('status', ['booked', 'confirmed'])
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as AppointmentRow[]
  return rows.map((appointment) => ({
    ...appointment,
    clinic: Array.isArray(appointment.clinic)
      ? appointment.clinic[0] ?? null
      : appointment.clinic,
    staff: Array.isArray(appointment.staff)
      ? appointment.staff[0] ?? null
      : appointment.staff,
  }))
}
