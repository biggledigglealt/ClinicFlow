export const clinicflowSchema = {
  patients: {
    description: 'Stores unique patient identifiers and minimal booking profile details.',
    fields: ['patientId', 'firstName', 'lastName', 'dob', 'contact', 'registrationDate'],
    privacy: 'Collect only minimum necessary data for scheduling and administration.',
  },
  staff: {
    description: 'Tracks clinic personnel details and scheduling constraints.',
    fields: ['staffId', 'firstName', 'lastName', 'role', 'availability'],
    privacy: 'Restrict access by role and clinic assignment.',
  },
  clinics: {
    description: 'Maintains facility metadata required for patient booking and clinic lookup.',
    fields: ['clinicId', 'name', 'address', 'contact'],
    privacy: 'Expose only necessary public-facing contact and location information.',
  },
  appointments: {
    description: 'Links patient, staff, and clinics to manage booking status and availability.',
    fields: ['appointmentId', 'patientId', 'staffId', 'clinicId', 'date', 'time', 'status'],
    privacy: 'Protect appointment data with authenticated access and audit logging.',
  },
  auditLogs: {
    description: 'Records important system activity for traceability and compliance.',
    fields: ['logId', 'actionType', 'actorId', 'timestamp', 'details'],
    privacy: 'Keep logs focused on scheduling and access events.',
  },
}

export function getSchemaSummary() {
  return clinicflowSchema
}
