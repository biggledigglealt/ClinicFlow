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
- The backend and database layer store appointment, clinic, and audit data.
- Notification events are triggered by appointment changes and clinic updates.
- Accessibility preferences are stored per patient and applied consistently.

## Privacy guardrails
- Collect only the minimum required booking information.
- Secure access through authentication and role-based checks.
- Maintain audit logs for key actions, including booking, cancellation, and profile updates.
