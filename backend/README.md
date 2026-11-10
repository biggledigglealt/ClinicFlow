# Backend and data layer

## Current implementation

The canonical database schema is the versioned Supabase migration in `supabase/migrations/`. It creates PostgreSQL tables for profiles, clinics, patient and staff profiles, clinic memberships and hours, appointments, waitlists, notifications, announcements, accessibility preferences, and audit logs. It enables Row Level Security, defines access policies, creates a profile after Supabase Auth signup, and audits appointment changes.

The frontend has a Supabase client and basic signup, login, logout, and current-user helpers in `frontend/src/lib/`. `backend/schema.mjs` is a reference summary of the migration, not a second database definition.

`backend/auth.mjs` contains legacy prototype helpers for the existing Node tests. They do not authenticate users, secure an API, persist audit logs, or connect the application to PostgreSQL. Supabase Auth is the intended identity provider; do not use the custom token helpers as application credentials.

## Access and privacy

- Supabase Auth owns passwords, sessions, and recovery.
- RLS limits profile, appointment, notification, waitlist, and preference records to the owner or authorized clinic staff.
- Clients have no direct appointment insert, update, or delete privileges. Booking, rescheduling, cancellation, check-in, and outcomes use validated database functions and overlap constraints.
- Staff membership and role provisioning are not exposed to public signup or client writes. Trusted provisioning remains an administrative step outside the prototype UI.
- Patient profiles collect name and optional phone only. Date of birth and clinical data are out of scope.
- Audit triggers record appointment and selected profile, membership, schedule, waitlist, announcement, and accessibility changes with actor, action, entity type/id, and time. They do not store patient details or request bodies; reads and failed actions are not audited.
- Use synthetic data only. The migration is a development foundation, not a production healthcare security review.

## Local database work

From the repository root, install dependencies and start the full local app (Docker required):

```sh
npm run setup
npm run dev
```

The app command starts Supabase, applies migrations, loads synthetic data, and configures the local frontend connection. No `.env.local` file is needed. Run `npm run db:test` to run the database tests. `db:reset` deletes local Auth users and database records, so use it only when a clean local database is intentional. The database tests live in `supabase/tests/database/rls.test.sql`.

A terminal transcript in the in-progress deliverable reports that a hosted project was linked and migrations were pushed, but this checkout's current remote state has not been verified. Confirm the linked project and migration history with its owner before any further hosted changes. Hosted Auth redirect URLs, email settings, and a security review also need confirmation before real use.

## Remaining work

- Provide trusted staff and administrator provisioning outside public signup.
- Verify the 20261103 waitlist/audit migration with the team before applying it to any hosted project.
- Configure hosted Supabase redirect allowlists for `ca.uottawa.clinicflow://auth-callback` before native email verification or recovery.
- Add verified clinic coordinates and city/postal lookup data beyond the synthetic Ottawa examples.
- Complete French interface translation and accessibility testing with screen readers and real devices.
- Add external email/SMS/push delivery, background reminders, and retry handling if those remain required by the approved criteria.
- Build and test Android/iOS packages on supported native toolchains; Xcode requires macOS.
- Extend audit coverage to failed actions and reads only if required by the team's approved privacy/security requirements.
