# ClinicFlow subsystem overview

ClinicFlow is an administrative clinic-finding and appointment prototype. It is not an electronic medical record and does not provide diagnosis, treatment, prescriptions, or clinical decision support. All clinic, provider, patient, and schedule records used for development and tests must be synthetic.

The browser application is built with React, TypeScript, and Vite. Capacitor Android and iOS projects are present so the same frontend can be packaged in native shells. Native compilation and device testing have not been completed.

## Subsystem status

| Subsystem | Implemented in the prototype | Remaining limits |
| --- | --- | --- |
| Patient Appointment Management | Signed-in patients can search availability, book, view, cancel, and reschedule appointments. Clinic staff with an active membership can view a clinic's daily schedule, edit recurring clinic/staff hours according to their role, set appointment duration, add unavailable periods, cancel bookings, check patients in, and mark completed/no-show outcomes. Availability, appointment lists, and staff schedules refresh every 15 seconds while open. The database is authoritative and rechecks each write. The default duration is 30 minutes; clinic administrators can select 15–120 minutes in 15-minute increments. | Staff identities and clinic roles must be provisioned through a trusted process outside public signup. The staff schedule editor supports one recurring interval per weekday. No appointment reminder is sent when the app is closed. |
| Clinic Finder | Patients manually enter a city or Canadian postal code, set a search radius, filter by service, new-patient status, and availability, and see distance-sorted clinic cards with next availability. The search does not request device location or save the typed location. | Clinic and provider data are synthetic Ottawa examples. Search-point coverage is Ottawa, K1N, and K2G; the directory is not comprehensive or verified for public use. Distance is approximate straight-line distance from a configured lookup point. |
| Database and Data Management | Supabase Auth manages account credentials and sessions. PostgreSQL stores a minimal booking profile (name and optional phone), clinics, memberships, schedules, appointments, waitlists, announcements, accessibility preferences, notifications, and audit records. RLS limits patient and staff access. Booking and appointment changes go through validated database functions; exclusion constraints prevent overlapping active appointments for either a staff member or a patient. Audit triggers store actor, action, entity, and time without names or contact details. | The prototype does not audit reads or failed requests. Trusted staff/administrator provisioning remains external to the user interface. The schema and tests are a course prototype, not a production security or privacy certification. |
| Accessibility Settings | Signed-in users can save language preference, text size, high contrast, and text-to-speech settings. Text size and contrast are applied; supported browsers can read appointment information aloud. | The language preference and document language are saved, and speech uses English or French voice settings, but the full interface is not translated into French. Screen-reader and real-device accessibility testing remains to be done. |
| Notification System | Database events create generic in-app notices for booking, cancellation, rescheduling, and waitlist offers. The notification centre displays unread notices, supports marking them read, polls every 15 seconds while open, and exposes an unread count in navigation. Clinic announcements are shown for the selected clinic. | Notices are in-app only. Email/SMS/push providers, background reminders, delivery retries, and delivery while the app is closed are not implemented. The one-minute target is not verified for offline delivery. Waitlist offers expire after one hour but do not reserve the slot; acceptance rechecks availability and can fail if another patient books first. |

## Platform and layout

The web layout uses a 700 CSS-pixel breakpoint, stacked content on narrow screens, two columns on wider screens, and anchor navigation. On narrow layouts, navigation moves to a bottom bar. Capacitor configuration routes signup, verification, and recovery callbacks through the `ca.uottawa.clinicflow://auth-callback` app link. Hosted Supabase Auth must allow this redirect before native authentication can work there. Android/iOS project files are generated, but Android SDK/Gradle and Xcode builds, email-link handoff, and device testing remain unverified.

## Validation completed

- `npm.cmd run build` in `frontend/` checks TypeScript and creates the web build.
- `npm.cmd run lint` in `frontend/` checks the frontend source.
- `npx.cmd supabase test db` runs the local PostgreSQL/RLS tests. The current suite contains 46 passing assertions, including booking, cancellation offers, offer acceptance, role boundaries, accessibility preference ownership, invalid schedule-block rejection, and schedule-block actor checks.
- These checks use the local Supabase project. They do not test hosted deployment, concurrent live traffic, email/SMS delivery, mobile builds, or physical devices.

See [Deliverable D alignment](DELIVERABLE_D_ALIGNMENT.md) for requirement status and [the detailed-design draft](DELIVERABLE_D_DETAILED_DESIGN.txt) for report-ready wording and figure guidance.
