# Backend and data layer

This subsystem implements the core backend logic, secure storage, and authentication flow for ClinicFlow. It stays within the Deliverable C/D scope: patient booking, clinic visibility, notification sending, and operational administration for clinics. It does not expand into medical records, diagnosis, treatment planning, or EMR functionality.

## 1. Secure client-server communication and authentication

All client requests should travel over HTTPS/TLS and require a valid API token. The token is generated as a 32-byte random value represented as a 64-character hexadecimal string, matching the design requirement.

Example pattern:

```js
const token = Array.from(new Uint8Array(32), (byte) =>
  byte.toString(16).padStart(2, '0'),
).join('')
```

The token is stored for the user session and required for authenticated data retrieval and update requests. If exposed, it can be regenerated through a secure refresh flow. This supports the project’s privacy-by-default approach and least-privilege access model.

## 2. Database design

The backend relies on a structured database with five core tables.

### Patients
Stores minimal patient identifiers and contact details required for scheduling.
- patientId
- firstName
- lastName
- dob
- contact
- registrationDate

### Staff
Tracks clinic personnel and scheduling constraints.
- staffId
- firstName
- lastName
- role
- availability

### Clinics
Maintains facility metadata needed for lookup and appointment booking.
- clinicId
- name
- address
- contact

### Appointments
Links patient, staff, and clinics together to manage booking state.
- appointmentId
- patientId
- staffId
- clinicId
- date
- time
- status

### Audit logs
Captures important system actions for traceability and accountability.
- logId
- actionType
- actorId
- timestamp
- details

## 3. Application server logic

The application server acts as the coordinator between the client and the shared database. It handles:
- appointment creation and modification
- availability checks and double-booking prevention
- reminder generation and notification triggers
- role-based access checks
- audit logging for key administrative actions

## 4. Scope boundaries

This backend remains limited to the operational and administrative needs of the project:
- booking and rescheduling appointments
- searching and selecting clinics
- sending reminders and clinic announcements
- storing minimal patient data and audit logs

It intentionally excludes:
- medical charting
- treatment planning
- prescriptions
- clinical diagnoses
- broad EMR functionality

## 5. Implementation files

- `auth.mjs` — secure token generation and validation helpers
- `schema.mjs` — schema definitions for the five core tables
- `auth.test.mjs` — verification for token generation and audit log behavior
