# Deliverable D alignment and prototype status

This note reflects the repository after the local implementation updates. The user-facing product remains an administrative appointment and clinic operations system; it does not handle medical records or clinical decisions. Synthetic data only.

## Detailed-design criteria and implementation

| Criterion | Prototype status | Evidence / remaining limit |
| --- | --- | --- |
| Patient appointment workflow | Implemented | Patients can find availability, book, view, cancel, and reschedule. Database functions validate operations; exclusion constraints prevent overlapping active appointments for a patient or provider. Default appointment duration is 30 minutes; trusted clinic admins can select 15–120 minutes in 15-minute increments. |
| Clinic hours, staff hours, closures, and appointment management | Implemented for trusted staff | Active clinic members can view daily appointments, change recurring clinic/staff hours according to role, set appointment duration, create unavailable blocks, check in, cancel, mark completed, and record no-shows. Memberships and staff profiles are provisioned outside public signup. UI schedule editing supports one recurring interval per day. |
| Waitlist | Implemented, with a non-reserved offer | Patients can join/leave. A matching cancellation creates a one-hour offer for one eligible patient, with a specific slot and an in-app notice. Accepting the offer calls the same validated booking function. The slot is not reserved; a competing booking can win and acceptance can fail. |
| Clinic Finder | Implemented for synthetic sample coverage | Manual city/postal search, maximum distance, service/new-patient/availability filters, approximate distance sorting, and next availability are connected to the PostgreSQL search function. Current directory examples and location points are synthetic Ottawa/K1N/K2G data. They are not a verified or comprehensive clinic directory. |
| Minimal data and access control | Implemented in the prototype | Supabase Auth stores credentials. Booking profile stores name and optional phone; there are no date-of-birth, medical-record, or clinical-note fields. RLS limits patient and active-member access. Elevated roles cannot be assigned through public signup. |
| Audit logging | Expanded | Triggers log appointment changes plus selected patient-profile, membership, schedule, schedule-block, announcement, waitlist, and accessibility-preference changes. Logs store actor/action/entity/time without patient names or contact data. Reads and failed actions are not audited. |
| Accessibility | Partially implemented | Saved text-size, contrast, language, and text-to-speech preferences. Text size/contrast are applied, and supported browsers can read appointment details. Language is saved and speech uses an English/French locale, but the entire UI is not translated into French; screen-reader/device tests remain. |
| Notifications | In-app behavior implemented; external delivery remains | Booking, cancellation, reschedule, and waitlist triggers create generic notices. The notification centre polls every 15 seconds while open, displays an unread badge, and lets a user mark notices read. No email/SMS/push provider, retry worker, or background reminder delivery exists. The one-minute delivery goal is unverified when the app is closed. |
| Responsive/mobile platform | Web and native project setup implemented; native verification remains | The 700 CSS-pixel layout switches between one and two columns and uses bottom navigation on narrow layouts. Capacitor Android/iOS projects and a custom Auth callback are configured. Native compilation, hosted redirect allowlisting, callback handoff, and physical-device testing are not complete. |

## Validation completed

- Frontend production build and lint passed before the final documentation updates; rerun after the current changes.
- Local Supabase migration `20261103000000_waitlist_acceptance_and_audit.sql` was applied to the local database only.
- `npx.cmd supabase test db` passed 46 database/RLS assertions, including booking, waitlist offers and acceptance, role boundaries, preference ownership, invalid schedule-block rejection, and cancellation auditing.
- External Supabase deployment, concurrent live traffic, Android/Gradle, iOS/Xcode, email/SMS, and physical-device behavior were not tested.

## Remaining work for the submitted Deliverable D

- Make the final report, drawings, BOM, test plan, Trello evidence, and conclusion describe the same implemented scope and explicitly label unverified work.
- The combined in-progress Markdown still includes template prompts, draft text, and outdated prototype claims. Copy the updated subsystem wording from [the detailed-design draft](DELIVERABLE_D_DETAILED_DESIGN.txt) and refresh figure labels, captions, numbering, table of contents, and cover date.
- Confirm that the submitted Excel BOM and Test Plan are filled in, attached, and use measurable results/pass conditions. Do not claim a test has passed before recording its result.
- Complete task owners, estimates, dates, current progress, and the requested Trello screenshot in the report.
- Broaden the Clinic Finder only with verified clinic/location data; synthetic Ottawa fixtures are for demonstration and testing.
- Finish the French translation and accessibility/device checks if those remain required by the team target.
- If external notifications remain a target, add a provider, background worker, retry behavior, and delivery-time tests before claiming the one-minute objective.
- Build and test the Android/iOS packages on supported native toolchains; hosted Supabase must allow the custom callback URL before native email verification/recovery works.

## Database environment boundary

The new migration was applied only to local Supabase. It has not been pushed to the linked hosted project. A migration-history listing observed the linked project through version `20261102000000`; do not push the new migration without the team's explicit deployment decision and a hosted-state review.
