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

The current database foundation is not yet connected to the appointment UI. Booking, cancellation, and profile-update RPCs, notification delivery, and service-layer integration remain implementation work. Use synthetic data until the team reviews hosted deployment and privacy requirements.
