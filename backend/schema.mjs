// Reference summary for the canonical Supabase schema in supabase/migrations/.
// Keep this aligned with the SQL migration; PostgreSQL remains the source of truth.
export const clinicflowSchema = {
  profiles: ['id', 'email', 'global_role', 'preferred_language', 'created_at', 'updated_at'],
  clinics: [
    'id', 'name', 'address', 'city', 'province', 'postal_code', 'phone', 'email',
    'description', 'time_zone', 'is_active', 'created_at',
  ],
  patient_profiles: ['id', 'user_id', 'first_name', 'last_name', 'phone', 'created_at', 'updated_at'],
  staff_profiles: ['id', 'user_id', 'first_name', 'last_name', 'job_title', 'created_at'],
  clinic_memberships: ['id', 'clinic_id', 'staff_id', 'role', 'is_active', 'created_at'],
  clinic_hours: ['id', 'clinic_id', 'day_of_week', 'opens_at', 'closes_at'],
  staff_hours: ['id', 'membership_id', 'day_of_week', 'opens_at', 'closes_at'],
  appointments: [
    'id', 'patient_id', 'staff_id', 'clinic_id', 'start_at', 'end_at', 'status',
    'checked_in_at', 'created_at', 'updated_at',
  ],
  waitlist_entries: [
    'id', 'patient_id', 'clinic_id', 'preferred_from', 'preferred_until', 'status', 'created_at',
  ],
  notifications: [
    'id', 'recipient_id', 'appointment_id', 'title', 'message', 'notification_type',
    'read_at', 'scheduled_at', 'sent_at', 'created_at',
  ],
  announcements: [
    'id', 'clinic_id', 'created_by', 'title', 'message', 'published_at', 'expires_at', 'created_at',
  ],
  accessibility_preferences: [
    'user_id', 'language', 'text_size', 'high_contrast', 'text_to_speech', 'updated_at',
  ],
  audit_logs: ['id', 'actor_id', 'action_type', 'entity_type', 'entity_id', 'outcome', 'created_at'],
}

export function getSchemaSummary() {
  return clinicflowSchema
}
