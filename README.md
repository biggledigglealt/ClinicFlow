# ClinicFlow

ClinicFlow is a team project for clinic scheduling and clinic operations. It is an administrative prototype, not a medical-records system or a tool for making clinical decisions.

## New to GitHub or coding? Start here

You do not need to install coding tools on your own computer. Use GitHub Codespaces to open the project in a browser-based VS Code environment. Follow the [first-day team onboarding guide](docs/TEAM_ONBOARDING.md) for help finding your assigned work and sharing changes with teammates.

### Start the app in Codespaces

1. [Create your own Codespace on `main`](https://github.com/codespaces/new?repo=zixxenK/ClinicFlow&ref=main). If your team lead has asked you to use a different branch, choose that branch instead.
2. Alternatively, open this repository on GitHub, select the green **Code** button, then the **Codespaces** tab and select **Create codespace on main**.
3. Wait for setup to finish. Codespaces installs Node.js and the project dependencies automatically.
4. In VS Code, open **Terminal → New Terminal**. A terminal is where you type commands for the project.
5. ClinicFlow needs its local Supabase services for signup, login, and scheduling. Make sure Docker is available, then start Supabase:

   ```sh
   npm run db:start
   ```

   Wait for the command to finish and note the publishable key it prints.
6. Copy `frontend/.env.example` to `frontend/.env.local`. In Codespaces, set `VITE_SUPABASE_URL` to the forwarded HTTPS URL for port `54321` (shown in the **Ports** tab), and set `VITE_SUPABASE_PUBLISHABLE_KEY` to the publishable key from `npm run db:start`. Do not use `127.0.0.1` as the browser-facing API URL in Codespaces. Restart Vite after changing `.env.local`.
7. Apply the database schema and load the synthetic sample records:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

8. Start the app:

   ```sh
   npm run dev
   ```

9. When Codespaces shows that port `5173` is ready, select **Open in Browser** to see the app. Keep the terminal running while you use the app. To stop it, click the terminal and press `Ctrl+C`. Stop Supabase separately with `npm run db:stop` when you are finished.

The Codespace runs the project in a Linux container, so the computer you use to access it does not change the setup. The same steps work from a Windows Intel laptop and a MacBook with Apple silicon.

### Run from your own computer instead

For a local setup, install Node.js 22.12 or newer from [nodejs.org](https://nodejs.org/); npm is included with Node.js. Then, from the repository root, install the dependencies once with `npm run setup` and start the app with `npm run dev`. In Windows PowerShell, use `npm.cmd run setup` and `npm.cmd run dev` if PowerShell blocks the `npm` command. On macOS, use `npm run setup` and `npm run dev` in Terminal. npm automatically installs packages for the computer's operating system and processor.

## Who is working on what?

These are the current workstream owners from the team plan. Owners should keep their changes on their own branch and coordinate with one another before changing shared interfaces or files.

| Workstream | Owner(s) | Starting scope |
| --- | --- | --- |
| Database and security | Cameron | Review the Supabase schema, access rules, and privacy-safe logging with the team before hosted deployment. |
| Device-adaptive UI | Shyaan and Alex | Make the interface usable on phones, tablets, and desktop screens. |
| Clinic finder | Juliana | Build the clinic search and clinic selection experience. |
| Calendar and scheduling | Christopher | Build the calendar and appointment time-selection experience. |

Everyone should review how their feature fits with the others. For example, the clinic finder and calendar both need to agree on how a selected clinic and available appointment times are represented. Ask the team before changing another person's workstream.

### Database direction

Supabase with PostgreSQL is the current development target. The repository includes a versioned schema, Row Level Security policies, local Supabase CLI configuration, and frontend client/Auth helpers. Review provider fit, cost, privacy, and access rules with the team before applying migrations to a hosted project. Do not use real patient data.

Use Supabase Auth for identity and sessions. Do not create application passwords or custom login tokens. Use synthetic data only.

### Local database setup

For a one-command local prototype launch on Windows, run **npm.cmd run prototype** from the repository root. It starts Supabase, applies pending migrations, reapplies the idempotent synthetic seed data, starts Vite, and opens the app in your browser. It uses the existing **frontend/.env.local** settings and does not reset local accounts. Press **Ctrl+C** to stop Vite; use **npm.cmd run db:stop** to stop Supabase.

Install the repository tooling and frontend dependencies:

```sh
npm ci
npm ci --prefix frontend
```

Docker is required to run the local Supabase services. Then use:

```sh
npm run db:start
npm run db:migrate
npm run db:reset
npm run db:test
```

In Windows PowerShell, use `npm.cmd` for these commands (for example, `npm.cmd run db:start`).

Copy `frontend/.env.example` to `frontend/.env.local` and set the local API URL and publishable key printed by `npm run db:start`. In Codespaces, use the forwarded URL for port `54321` instead of `localhost`; the frontend auth redirect uses the forwarded port `5173`. `.env.local` is ignored by Git. Stop local services with `npm run db:stop`.

Use `npm run db:migrate` to apply new schema changes while preserving local accounts and data. `npm run db:reset` recreates the local database, removes locally created Auth users and data, then loads synthetic clinic, provider, and schedule records from `supabase/seed.sql`.

Email confirmation is enabled in local Auth. Test it through the frontend signup form; creating a user from Studio's Users page is administrative provisioning and may bypass signup verification. Local confirmation messages are captured by Mailpit at `http://127.0.0.1:54324`; local email is not delivered to external inboxes. The signup screen provides a resend action. For the hosted project, enable email confirmation, set the allowed Auth redirect URLs, and configure an SMTP provider before expecting real verification emails.

Appointment events also create private local email outbox jobs for confirmations, cancellations, reschedules, and eligible 24-hour reminders. To process jobs that are due, run `npm.cmd run notify:local` in Windows PowerShell, then inspect Mailpit at `http://127.0.0.1:54324`. The worker is deliberately local-only. There is no hosted email provider or scheduled background worker, so do not treat this as automatic production delivery.

The checked-in migrations are in `supabase/migrations/`. A terminal transcript in the in-progress deliverable reports that a hosted project was linked and these migrations were pushed, but the current remote migration history and Auth settings have not been verified in this review. Confirm the live state with the project owner before linking or pushing anything. Review Auth redirect URLs and email-confirmation settings before using hosted data.
### Logging and privacy goals

The team wants accurate, useful logs for important administrative actions. As a starting point, record the time, action, non-sensitive actor identifier, affected record identifier, and whether the action succeeded. Keep logs focused: **never log passwords, access tokens, patient names, dates of birth, contact details, or full request contents.** Use fake data while developing and testing.

## How we work together

GitHub keeps the shared project and its change history. A **branch** is your own workspace for one change. A **commit** is a saved snapshot of your changes. A **pull request** (PR) asks the team to review your branch and add it to the shared `main` branch.

1. **Start from the latest `main`.** Before beginning a new task, make sure your previous changes are committed. In the terminal, run:

   ```sh
   git switch main
   git pull
   ```

2. **Create a branch for your task.** Use a short name that says what you are changing:

   ```sh
   git switch -c feature/clinic-search
   ```

   Replace `clinic-search` with a few words describing your task. Do not make feature changes directly on `main`.

3. **Make and check your change.** Save your files. The running app normally refreshes when you edit frontend code.
4. **Save a commit and publish your branch:**

   ```sh
   git add path/to/your-changed-file
   git commit -m "Add clinic search layout"
   git push -u origin HEAD
   ```

   Replace `path/to/your-changed-file` with the path to the file you changed; list each changed file if there is more than one. Replace the example commit message with a short description of your change. In VS Code, you can also use the **Source Control** icon to review, stage, commit, and publish changes.

5. **Open a pull request.** On GitHub, select **Compare & pull request** for your branch. Set the target/base branch to `main`, explain what you changed, and say what you tested. Ask a teammate to review it. Make requested changes on the same branch. After approval, follow the team's process to merge it.
6. **Start your next task with a fresh branch** from the latest `main`.

If Git reports a conflict or you are unsure what a command will do, stop and ask a teammate rather than force-pushing or deleting work.

## Run the project checks

Run these commands from the repository root before asking for review:

```sh
node --test backend/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

- The test command runs the existing backend prototype tests. Frontend lint and build commands check the React application.
- PostgreSQL tests run against local Supabase with Docker. `db:migrate` applies pending local migrations without resetting local users or records. Use `db:reset` only when you intentionally want to erase local Auth users and database data.

## What is implemented today?

The React/TypeScript/Vite prototype uses Supabase Auth and PostgreSQL. It supports account recovery and password changes, editable minimal patient profiles, clinic search against synthetic Ottawa data, configurable availability, patient booking/cancellation/rescheduling, and upcoming appointments. Clinic staff with trusted active memberships can manage split recurring hours and unavailable periods, view their daily schedule, set appointment duration, check patients in, cancel bookings, and mark completed/no-show outcomes. A platform administrator can provision an existing verified account for clinic staff access; public signup cannot grant staff roles. Waitlist offers are created when a matching appointment is cancelled and can be accepted through the validated booking function. Accessibility settings apply text size, contrast, English/French interface labels, and speech preferences; clinic and staff-entered content stays in its original language. In-app notifications are generated for booking changes and poll while the page is open. Appointment email events are queued and can be delivered to local Mailpit by manually running the local worker. A production email provider, scheduled background worker, SMS, and push delivery are not configured.

Capacitor Android and iOS project files are configured with an app callback for verification and password recovery. Native builds and device testing have not been completed. Clinic directory records remain synthetic and limited to Ottawa, K1N, and K2G; no verified listings have been imported. A CSV workflow validates HTTPS source details and a 25 km pilot radius around uOttawa, and writes verified records only to local Supabase. The old `backend/auth.mjs` token helpers are prototype code and are not the application's authentication system.

## Privacy and project scope

- Use synthetic/sample data only. Never put real patient or staff information in code, screenshots, issues, pull requests, or test data.
- Do not commit passwords, API keys, tokens, or `.env` files. Ask the team how approved secrets should be shared.
- Keep ClinicFlow focused on appointment booking, clinic information, reminders, and operational workflows.
- Do not add medical records, diagnoses, prescriptions, treatment plans, or clinical decision support.

## Project folders

- `frontend/` — React, TypeScript, and Vite application.
- `backend/` — legacy prototype modules and tests; PostgreSQL migrations are under `supabase/`.
- `supabase/` — local CLI configuration, database migrations, and database tests.
- `tests/` — test planning and validation notes.
- `docs/` — team onboarding and subsystem notes.
- [Deliverable D alignment audit](docs/DELIVERABLE_D_ALIGNMENT.md) — current implementation status, spec conflicts, and remaining report work.
- [Deliverable D detailed design draft](docs/DELIVERABLE_D_DETAILED_DESIGN.txt) — copy-ready subsystem descriptions and drawing guidance.
- `Deliverables/` — project brief and course deliverables.

The `.devcontainer/` folder configures Codespaces. The `.github/` folder contains the pull request template and automated checks.
