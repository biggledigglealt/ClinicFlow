# Deliverable D alignment and prototype status

This status note describes the current local prototype. ClinicFlow is an administrative clinic-finding and appointment system; it does not store clinical notes or provide clinical decisions. Use synthetic data only. The new migrations have been applied only to local Supabase and have not been pushed to the hosted project.

## Detailed-design criteria and implementation

| Criterion | Prototype status | Evidence / remaining limit |
| --- | --- | --- |
| Patient appointment workflow | Implemented | Patients can find availability, book, view, cancel, and reschedule appointments. PostgreSQL functions validate operations, and exclusion constraints prevent overlapping active appointments for a patient or provider. Appointment length defaults to 30 minutes and clinic administrators can set 15–120 minutes in 15-minute increments. Availability and upcoming appointment views refresh every 15 seconds while open. |
| Clinic hours, staff hours, closures, and appointment management | Implemented for trusted staff | Active clinic members can view daily appointments, edit recurring clinic or staff hours according to role, use split intervals, set appointment duration, create unavailable blocks, check in, cancel, and record completed/no-show outcomes. A platform administrator can provision an existing verified Auth account; public signup cannot grant staff access. |
| Waitlist | Implemented, with a non-reserved offer | Patients can join or leave. A matching cancellation creates a one-hour offer for one eligible patient and an in-app notice. Accepting the offer uses the validated booking function. The offer does not reserve the slot, so a competing booking can win. |
| Clinic Finder | Implemented for synthetic sample coverage | Manual city/postal search, maximum-distance, service, new-patient, and availability filters connect to the PostgreSQL search function. Approximate distances are sorted and next availability follows the clinic's configured appointment duration. Current clinic and location examples are synthetic Ottawa/K1N/K2G data, not a verified or comprehensive directory. A local CSV import path checks HTTPS provenance, required source details, coordinates, time zone, duplicates, and a 25 km radius from uOttawa. No real verified listings have been imported. |
| Minimal data and access control | Implemented in the prototype | Supabase Auth stores credentials. The booking profile stores a name and optional phone number; it has no date-of-birth, medical-record, or clinical-note fields. RLS limits patients to their own records and staff to active clinic memberships. Elevated roles cannot be assigned through public signup. |
| Audit logging | Implemented for selected actions | Triggers log appointment changes plus selected patient-profile, membership, schedule, schedule-block, announcement, waitlist, and accessibility-preference changes. Narrow functions audit patient appointment-list and clinic schedule reads. Rejected booking attempts are logged without request contents. Logs store actor/action/entity/time, not patient names or contact data. Other reads and failed actions are not audited. |
| Accessibility | Implemented for core controls; device validation remains | Saved text-size, contrast, language, and text-to-speech preferences are applied after sign-in, including when a saved language is restored. Fixed interface labels and help content have English/French versions; clinic and staff-entered information remains in its source language, and some database-generated errors may remain English. Screen-reader and real-device behavior still needs review. |
| Notifications | In-app and local email path implemented; production delivery remains | Booking, cancellation, reschedule, and waitlist events create generic in-app notices. The notification centre polls every 15 seconds while open. Appointment events also queue email confirmations, updates, and eligible 24-hour reminders without storing email addresses or message bodies in the outbox. A manually run local worker sends due jobs to Mailpit, retries failures up to five times, and reclaims stale jobs through a 15-minute lease. No hosted provider or scheduled background worker is configured; SMS/push are not implemented. The one-minute external delivery goal is unverified. |
| Responsive/mobile platform | Responsive web implementation; native verification remains | The 700 CSS-pixel layout uses a single column and bottom navigation at narrower widths, and two columns with inline navigation at wider sizes. Capacitor Android/iOS projects and an Auth callback are configured. Native compilation, hosted redirect allowlisting, callback handoff, and physical-device testing are incomplete. |

## Validation completed

- The React/TypeScript production build passed after the current feature changes. The bundle-size advisory is informational.
- Frontend lint passed without warnings.
- `npm.cmd --prefix frontend run cap:sync` copied the current web build and plugin metadata into both Capacitor shells. This does not compile native apps.
- Local Supabase migrations through `20261103000005_email_outbox_claim_lease.sql` were applied. No hosted project was contacted.
- Local `supabase test db` passed 66 pgTAP assertions. Coverage includes access boundaries, booking and overlap protection, invalid schedule data, split schedules, trusted staff provisioning, listing provenance, audit behavior, and Clinic Finder duration alignment.
- Synthetic queued and stale-claimed email jobs were processed by the local worker, marked sent, and found in Mailpit. Their Auth accounts and outbox rows were removed; the generic synthetic test messages remain in local Mailpit for inspection.
- Android/Gradle, iOS/Xcode, hosted SMTP, external Supabase deployment, concurrent live traffic, and physical-device behavior were not tested.

## Remaining work for the submitted Deliverable D

- Make the final report, diagrams, BOM, test plan, Trello evidence, and conclusion describe the same implemented scope and label unverified work.
- Replace template prompts and draft notes, insert final drawings and captions, refresh the table of contents, and use the correct submission date.
- Attach the completed Excel BOM and Test Plan. Keep proposed test results separate from measured results; do not mark unrun tests as passed.
- Include current Trello owners, duration estimates, progress, and the requested screenshot.
- Add only real clinic listings supported by documented public sources; keep the local synthetic examples clearly labelled.
- Review English/French wording and test accessibility with screen readers and physical devices.
- Select and review a production email provider, then configure a server-side scheduled worker, retries, allow-listed test recipients, and delivery tests before claiming the one-minute target. SMS and push remain future work.
- Build the Capacitor apps on supported native toolchains and test callback handoff on devices. Add the custom callback to the hosted Auth redirect allowlist only after the project owner reviews hosted settings.

## Database environment boundary

All migrations and verification in this status note are local. Do not push migrations or configure hosted credentials as part of local prototype validation; review the linked project's schema, Auth settings, and deployment plan with the project owner first.
