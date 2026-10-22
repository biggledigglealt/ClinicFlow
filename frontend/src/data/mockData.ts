export type Subsystem = {
  name: string
  status: string
  summary: string
  details: string[]
}

export const subsystemData: Subsystem[] = [
  {
    name: 'Patient Appointment Management',
    status: 'Core booking flow',
    summary: 'Book, view, reschedule, and cancel visits with a clear mobile-first flow.',
    details: ['Calendar-based availability', 'Double-booking safeguards', 'Review before confirmation'],
  },
  {
    name: 'Clinic Finder',
    status: 'Location-aware search',
    summary: 'Help patients identify the best clinic by distance, availability, and access profile.',
    details: ['Nearby clinic cards', 'Search by location', 'Clinic information panel'],
  },
  {
    name: 'Database & Data Management',
    status: 'Secure shared records',
    summary: 'Store patient, appointment, clinic, and audit data with role-based access controls.',
    details: ['Minimum-data collection', 'Audit logs', 'Authenticated API access'],
  },
  {
    name: 'Accessibility Settings',
    status: 'Inclusive by default',
    summary: 'Support language, text sizing, contrast, and user preference management.',
    details: ['English/French toggle', 'High contrast mode', 'Text scaling controls'],
  },
  {
    name: 'Notification System',
    status: 'Reminder engine',
    summary: 'Send appointment reminders and clinic updates through a predictable notification layer.',
    details: ['Push and inbox delivery', 'One-minute alert target', 'Activity logging'],
  },
]

export const overviewMetrics = [
  { label: 'Active clinics', value: '12' },
  { label: 'Booked visits', value: '184' },
  { label: 'Reminder SLA', value: '< 1 min' },
  { label: 'Privacy posture', value: 'Audit-ready' },
]

export const appointmentPreview = [
  'June 6 • 10:30 AM with Dr. Chen',
  'New patient intake check',
  'Clinic: East Ottawa Health Hub',
  'Reminder sent 24 hours before visit',
]
