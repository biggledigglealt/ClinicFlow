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
  clinic_id: string
  start_at: string
  end_at: string
  status: 'booked' | 'confirmed'
  clinic: { name: string; time_zone: string } | null
  staff: { first_name: string; last_name: string; job_title: string | null } | null
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
  const { data, error } = await supabase.rpc('book_appointment_with_audit', {
    p_clinic_id: clinicId,
    p_staff_id: staffId,
    p_start_at: startAt,
  })

  if (error) throw error

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.success || !result.appointment_id) {
    throw new Error(result?.message ?? 'The booking could not be completed. Please try again.')
  }
  return result.appointment_id as string
}

export async function cancelPatientAppointment(appointmentId: string) {
  const { error } = await supabase.rpc('cancel_appointment', {
    p_appointment_id: appointmentId,
  })
  if (error) throw error
}

export async function reschedulePatientAppointment(
  appointmentId: string,
  staffId: string,
  startAt: string,
) {
  const { error } = await supabase.rpc('reschedule_appointment', {
    p_appointment_id: appointmentId,
    p_staff_id: staffId,
    p_start_at: startAt,
  })
  if (error) throw error
}

export async function listMyUpcomingAppointments() {
  const { data, error } = await supabase.rpc('list_my_upcoming_appointments')
  if (error) throw error
  const rows = (data ?? []) as Array<{
    id: string
    clinic_id: string
    start_at: string
    end_at: string
    status: string
    clinic_name: string
    clinic_time_zone: string
    staff_first_name: string
    staff_last_name: string
    staff_job_title: string | null
  }>
  return rows.map((appointment) => ({
    id: appointment.id,
    clinic_id: appointment.clinic_id,
    start_at: appointment.start_at,
    end_at: appointment.end_at,
    status: appointment.status as PatientAppointment['status'],
    clinic: { name: appointment.clinic_name, time_zone: appointment.clinic_time_zone },
    staff: {
      first_name: appointment.staff_first_name,
      last_name: appointment.staff_last_name,
      job_title: appointment.staff_job_title,
    },
  }))
}
