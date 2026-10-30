# Backend and data layer

## Current implementation

The canonical database schema is the versioned Supabase migration in `supabase/migrations/`. It creates PostgreSQL tables for profiles, clinics, patient and staff profiles, clinic memberships and hours, appointments, waitlists, notifications, announcements, accessibility preferences, and audit logs. It enables Row Level Security, defines access policies, creates a profile after Supabase Auth signup, and audits appointment changes.

The frontend has a Supabase client and basic signup, login, logout, and current-user helpers in `frontend/src/lib/`. `backend/schema.mjs` is a reference summary of the migration, not a second database definition.

`backend/auth.mjs` contains legacy prototype helpers for the existing Node tests. They do not authenticate users, secure an API, persist audit logs, or connect the application to PostgreSQL. Supabase Auth is the intended identity provider; do not use the custom token helpers as application credentials.

## Access and privacy

- Supabase Auth owns passwords, sessions, and recovery.
- RLS limits profile, appointment, notification, waitlist, and preference records to the owner or authorized clinic staff.
- Clients have no direct appointment insert, update, or delete privileges. Booking, rescheduling, cancellation, and check-in need validated database functions before those workflows are enabled.
- Staff membership and role provisioning are not exposed to client writes; trusted provisioning still needs implementation.
- Patient profiles collect name and optional phone only. Date of birth and clinical data are out of scope.
- Appointment audit records contain actor, action, entity type/id, outcome, and timestamp, not patient details or request bodies.
- Use synthetic data only. The migration is a development foundation, not a production healthcare security review.

## Local database work

From the repository root, install dependencies and start the local Supabase services (Docker required):

```sh
npm ci
npm ci --prefix frontend
npm run db:start
npm run db:reset
npm run db:test
npm run db:stop
```

The database tests live in `supabase/tests/database/rls.test.sql`. To connect the Vite app to local Supabase, copy `frontend/.env.example` to the ignored `frontend/.env.local` and use the API URL and publishable key printed by the CLI.

The hosted project has not been linked or migrated from this repository. Hosted Auth redirect URLs and email settings, project linking, migration deployment, and a security review remain before using hosted data.

## Remaining implementation

- Validated booking, cancellation, rescheduling, and check-in database functions.
- Trusted staff and administrator provisioning.
- Availability validation for exceptions, closures, and schedule changes.
- Retryable notification outbox and delivery Edge Functions.
- Frontend auth state, profile completion, and service modules that replace static sample data.
- Realtime subscriptions after persistent notifications and booking operations are in place.