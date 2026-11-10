import { supabase } from '../lib/supabase'

export interface ClinicMembership {
  id: string
  clinic_id: string
  staff_id: string
  role: 'staff' | 'admin'
  clinic: { id: string; name: string; time_zone: string } | null
}

export interface ScheduleInterval {
  opensAt: string
  closesAt: string
}

export interface ClinicAppointment {
  id: string
  patient_first_name: string
  patient_last_name: string
  staff_first_name: string
  staff_last_name: string
  start_at: string
  end_at: string
  status: string
  checked_in_at: string | null
}

export interface WaitlistEntry {
  id: string
  clinic_id: string
  preferred_from: string | null
  preferred_until: string | null
  offered_start_at: string | null
  offered_end_at: string | null
  offer_expires_at: string | null
  status: 'waiting' | 'offered' | 'accepted' | 'removed' | 'expired'
  created_at: string
}

export interface ClinicAnnouncement {
  id: string
  clinic_id: string
  title: string
  message: string
  published_at: string | null
  expires_at: string | null
}

export interface UserNotification {
  id: string
  title: string
  message: string
  notification_type: string
  appointment_id: string | null
  read_at: string | null
  created_at: string
}

export interface AccessibilityPreferences {
  language: 'en' | 'fr'
  text_size: 'small' | 'medium' | 'large' | 'extra_large'
  high_contrast: boolean
  text_to_speech: boolean
}

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  language: 'en',
  text_size: 'medium',
  high_contrast: false,
  text_to_speech: false,
}

export async function getMyClinicMemberships(userId: string) {
  const { data: staff, error: staffError } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (staffError) throw staffError
  if (!staff) return [] as ClinicMembership[]

  const { data, error } = await supabase
    .from('clinic_memberships')
    .select('id, clinic_id, staff_id, role, clinic:clinics(id, name, time_zone)')
    .eq('staff_id', staff.id)
    .eq('is_active', true)
  if (error) throw error
  return (data ?? []) as unknown as ClinicMembership[]
}

export async function listClinicAppointmentsForDay(clinicId: string, date: string) {
  const { data, error } = await supabase.rpc('list_clinic_appointments_for_day', {
    p_clinic_id: clinicId,
    p_date: date,
  })
  if (error) throw error
  return (data ?? []) as ClinicAppointment[]
}

export async function setAppointmentStatus(appointmentId: string, status: 'completed' | 'no_show') {
  const { error } = await supabase.rpc('set_appointment_outcome', {
    p_appointment_id: appointmentId,
    p_outcome: status,
  })
  if (error) throw error
}

export async function checkInAppointment(appointmentId: string) {
  const { error } = await supabase.rpc('check_in_appointment', { p_appointment_id: appointmentId })
  if (error) throw error
}

export async function cancelAppointment(appointmentId: string) {
  const { error } = await supabase.rpc('cancel_appointment', { p_appointment_id: appointmentId })
  if (error) throw error
}

export async function rescheduleAppointment(appointmentId: string, staffId: string, startAt: string) {
  const { error } = await supabase.rpc('reschedule_appointment', {
    p_appointment_id: appointmentId,
    p_staff_id: staffId,
    p_start_at: startAt,
  })
  if (error) throw error
}

export async function setClinicHours(clinicId: string, day: number, intervals: ScheduleInterval[]) {
  const { error } = await supabase.rpc('set_clinic_hours_intervals_for_day', {
    p_clinic_id: clinicId,
    p_day_of_week: day,
    p_intervals: intervals.map((interval) => ({
      opens_at: interval.opensAt,
      closes_at: interval.closesAt,
    })),
  })
  if (error) throw error
}

export async function setMyStaffHours(membershipId: string, day: number, intervals: ScheduleInterval[]) {
  const { error } = await supabase.rpc('set_staff_hours_intervals_for_day', {
    p_membership_id: membershipId,
    p_day_of_week: day,
    p_intervals: intervals.map((interval) => ({
      opens_at: interval.opensAt,
      closes_at: interval.closesAt,
    })),
  })
  if (error) throw error
}

export async function setClinicAppointmentDuration(clinicId: string, durationMinutes: number) {
  const { error } = await supabase.rpc('set_clinic_appointment_duration', {
    p_clinic_id: clinicId,
    p_duration_minutes: durationMinutes,
  })
  if (error) throw error
}

export async function getClinicHoursForDay(clinicId: string, day: number) {
  const { data, error } = await supabase
    .from('clinic_hours')
    .select('opens_at, closes_at')
    .eq('clinic_id', clinicId)
    .eq('day_of_week', day)
    .order('opens_at')
  if (error) throw error
  return data ?? []
}

export async function getMyStaffHoursForDay(membershipId: string, day: number) {
  const { data, error } = await supabase
    .from('staff_hours')
    .select('opens_at, closes_at')
    .eq('membership_id', membershipId)
    .eq('day_of_week', day)
    .order('opens_at')
  if (error) throw error
  return data ?? []
}

export async function listScheduleBlocks(clinicId: string) {
  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('id, clinic_id, staff_id, starts_at, ends_at, reason')
    .eq('clinic_id', clinicId)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')
  if (error) throw error
  return data ?? []
}

export async function addScheduleBlock(input: {
  clinicId: string
  staffId?: string | null
  startsAt: string
  endsAt: string
  reason: 'unavailable' | 'closure' | 'break' | 'other'
  createdBy: string
}) {
  const { error } = await supabase.from('schedule_blocks').insert({
    clinic_id: input.clinicId,
    staff_id: input.staffId ?? null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    reason: input.reason,
    created_by: input.createdBy,
  })
  if (error) throw error
}

export async function deleteScheduleBlock(blockId: string) {
  const { error } = await supabase.from('schedule_blocks').delete().eq('id', blockId)
  if (error) throw error
}

export async function listMyWaitlistEntries(clinicId: string) {
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('id, clinic_id, preferred_from, preferred_until, offered_start_at, offered_end_at, offer_expires_at, status, created_at')
    .eq('clinic_id', clinicId)
    .in('status', ['waiting', 'offered'])
    .order('created_at')
  if (error) throw error
  return (data ?? []) as WaitlistEntry[]
}

export async function joinClinicWaitlist(userId: string, clinicId: string, preferredFrom: string | null) {
  const { data: patient, error: patientError } = await supabase
    .from('patient_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (patientError) throw patientError

  const { data: existing, error: existingError } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('patient_id', patient.id)
    .eq('clinic_id', clinicId)
    .in('status', ['waiting', 'offered'])
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return

  const { error } = await supabase.from('waitlist_entries').insert({
    patient_id: patient.id,
    clinic_id: clinicId,
    preferred_from: preferredFrom,
    status: 'waiting',
  })
  if (error) throw error
}

export async function leaveClinicWaitlist(entryId: string) {
  const { error } = await supabase.rpc('leave_waitlist', { p_waitlist_entry_id: entryId })
  if (error) throw error
}

export async function acceptClinicWaitlistOffer(entryId: string) {
  const { data, error } = await supabase.rpc('accept_waitlist_offer', {
    p_waitlist_entry_id: entryId,
  })
  if (error) throw error
  return data as string
}

export async function listClinicAnnouncements(clinicId: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, clinic_id, title, message, published_at, expires_at')
    .eq('clinic_id', clinicId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ClinicAnnouncement[]
}

export async function publishClinicAnnouncement(
  clinicId: string,
  userId: string,
  title: string,
  message: string,
  expiresAt: string | null,
) {
  const { error } = await supabase.from('announcements').insert({
    clinic_id: clinicId,
    created_by: userId,
    title: title.trim(),
    message: message.trim(),
    published_at: new Date().toISOString(),
    expires_at: expiresAt,
  })
  if (error) throw error
}

export async function getAccessibilityPreferences(userId: string) {
  const { data, error } = await supabase
    .from('accessibility_preferences')
    .select('language, text_size, high_contrast, text_to_speech')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as AccessibilityPreferences | null) ?? defaultAccessibilityPreferences
}

export async function saveAccessibilityPreferences(userId: string, preferences: AccessibilityPreferences) {
  const { error } = await supabase
    .from('accessibility_preferences')
    .upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function listMyNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, notification_type, appointment_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as UserNotification[]
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}
