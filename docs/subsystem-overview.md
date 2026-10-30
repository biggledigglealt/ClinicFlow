# Deliverable D subsystem overview

This project is organized around the five ClinicFlow subsystems described in the project deliverables:

1. Patient Appointment Management
2. Clinic Finder
3. Database and Data Management
4. Accessibility Settings
5. Notification System

## Scope
The prototype remains focused on administrative clinic operations, not EMR or clinical care workflows.

## Architecture notes
- The frontend handles the patient-facing experience.
- Supabase PostgreSQL is the current development data layer; its schema and RLS policies are versioned under `supabase/`.
- Notification events are triggered by appointment changes and clinic updates.
- Accessibility preferences are stored per patient and applied consistently.

## Privacy guardrails
- Collect only the minimum required booking information.
- Secure access through authentication and role-based checks.
- Maintain audit logs for key actions, including booking, cancellation, and profile updates.

The frontend currently connects Supabase Auth to login/signup/logout, saves the signed-in patient's minimal booking profile under RLS, and searches active clinics from PostgreSQL. Clinic finder demo rows are synthetic local seed data. Appointment availability and booking, staff provisioning and schedules, cancellation/rescheduling, notification delivery, and production accessibility controls remain implementation work. The hosted project has not been linked or migrated. Use synthetic data until the team reviews hosted deployment and privacy requirements.
