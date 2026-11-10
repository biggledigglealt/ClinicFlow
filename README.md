# ClinicFlow

ClinicFlow is a course prototype for clinic search, appointment scheduling, and clinic operations. It is an administrative tool, not an electronic medical record system or a clinical decision-support tool. Development and testing must use synthetic data only.

## Current development and deployment status

The current integration branch is `feature/supabase-foundation`. It contains the Supabase-backed application and is ahead of `main`. Team feature work should branch from this integration branch, go through pull requests back into it, and be merged to `main` after integration checks pass.

A Vercel site is available at [clinic-flow-sigma-snowy.vercel.app](https://clinic-flow-sigma-snowy.vercel.app/)

The validated database environment is local Supabase. Hosted Supabase configuration and migration history have not been verified. Review the hosted project with its owner before deploying migrations or configuring production access.

## What the prototype supports

The React, TypeScript, and Vite application uses Supabase Auth and PostgreSQL. The local prototype supports:

- Patient registration and sign-in, account recovery, and a minimal booking profile.
- Clinic search using manually entered Ottawa locations and synthetic clinic records.
- Service, distance, new-patient, and appointment-availability filters, with sortable results.
- Appointment availability, booking, cancellation, rescheduling, and upcoming appointment views.
- Clinic staff scheduling and appointment operations for trusted clinic members.
- Waitlist offers, in-app notifications, accessibility preferences, and selected audit logging.

Clinic data is synthetic and limited to Ottawa examples, including postal-prefix lookup points K1N and K2G. It is not a verified or comprehensive clinic directory. The prototype does not contain clinical notes, diagnoses, prescriptions, or treatment plans.

Capacitor Android and iOS project shells are present, but native builds, authentication handoff, and physical-device testing have not been verified. Appointment email jobs can be tested locally with Mailpit; hosted email delivery, scheduled background sending, SMS, and push notifications are not configured.

## Start the application in GitHub Codespaces

1. Open the repository in GitHub Codespaces and select the `feature/supabase-foundation` branch.
2. Wait for Codespaces setup to finish.
3. Open **Terminal → New Terminal** and run:

   ```sh
   npm run dev
   ```

4. Open forwarded port `5173` when Codespaces offers it. Keep the terminal running while using the app.

Each Codespace has its own local Supabase database, accounts, and synthetic records. Teammates do not share local database state. Use fake email addresses and synthetic information.

## Run locally

Install Node.js 22.12 or newer and Docker Desktop. From the repository root, install dependencies once:

```sh
npm run setup
```

Start the app and its local Supabase services:

```sh
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). In Windows PowerShell, use `npm.cmd` if PowerShell blocks the `npm` command.

The startup script starts Supabase, applies pending migrations, loads synthetic clinic data, and starts Vite. It does not reset local accounts or database records. The frontend routes local API requests through Vite's development proxy.

Local signup is configured for development and does not require email confirmation. Password recovery email is captured in Mailpit:

- Local: [http://127.0.0.1:54324](http://127.0.0.1:54324)
- Codespaces: open forwarded port `54324`

Supabase Studio is available locally at [http://127.0.0.1:54323](http://127.0.0.1:54323).

### Supabase commands

Run these from the repository root:

```sh
npm run db:start
npm run db:migrate
npm run db:test
npm run db:stop
```

Use `npm run db:reset` only when you intend to delete local Auth users and database records and reload the synthetic seed data. Do not reset a database containing work you need to keep.

To process due email jobs locally, run:

```sh
npm run notify:local
```

The worker sends test messages to local Mailpit only. It is not a hosted email service or an automatic production reminder worker.

## Hosted deployment requirements

The production Vite build requires these environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Set them in the hosting provider's environment settings and rebuild the frontend. Never use a Supabase service-role or secret key in frontend variables. A deployed frontend also requires a reachable Supabase project with the required migrations, policies, Auth settings, and redirect URLs. Review those settings with the project owner before deployment. Local Supabase is not reachable from Vercel.

For a Vercel preview, use the repository's `frontend/` directory, build with `npm run build`, and publish `dist/`. A preview is not ready for client testing until sign-in, clinic search, and appointment operations have been verified against its configured backend.

## Validation

Run the repository checks from the project root:

```sh
node --test backend/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
npm run db:test
```

The backend tests cover legacy helper modules. The PostgreSQL tests use pgTAP against local Supabase and synthetic fixtures. A passing build or database test does not verify hosted deployment, native mobile builds, physical-device behaviour, or live concurrent traffic.

## Team work and branches

The current integration branch is `feature/supabase-foundation`; `main` is the stable branch. Each contributor should use a separate feature branch based on the integration branch, rather than committing directly to the shared branch.

```sh
git fetch origin
git switch feature/supabase-foundation
git pull
git switch -c feature/short-task-name
```

After making and checking a change:

```sh
git status
git add path/to/changed-file
git commit -m "Describe the change"
git push -u origin HEAD
```

Open a pull request with `feature/supabase-foundation` as the base branch. Review and test each change before merging it into the integration branch. Once the integrated prototype is ready, open a pull request from `feature/supabase-foundation` to `main`.

| Workstream | Owner(s) |
| --- | --- |
| Database and security | Cameron |
| Device-adaptive UI | Shyaan and Alex |
| Clinic Finder | Juliana |
| Calendar and scheduling | Christopher |

Coordinate shared interfaces and database changes with the team. Database schema changes belong in `supabase/migrations/`; test them against local Supabase using synthetic data.

## Privacy and project scope

- Use synthetic data only. Do not put real patient or staff information in code, screenshots, issues, pull requests, or test data.
- Do not commit passwords, tokens, service-role keys, or `.env` files.
- Keep ClinicFlow focused on clinic search, appointment booking, scheduling, reminders, and operational workflows.
- Do not add medical records, diagnoses, prescriptions, treatment plans, or clinical decision support.
- Keep audit logs limited to operational identifiers and actions; never log passwords, access tokens, patient names, dates of birth, contact details, or full request contents.

## Repository layout

- `frontend/` — React, TypeScript, and Vite application, plus Capacitor shells.
- `supabase/` — local Supabase configuration, migrations, seed data, and database tests.
- `scripts/` — local startup, migration, seed, and notification-worker commands.
- `backend/` — legacy prototype helper modules and tests.
- `docs/` — onboarding, subsystem, privacy, and implementation-status notes.
- `Deliverables/` — course deliverables and project brief.
