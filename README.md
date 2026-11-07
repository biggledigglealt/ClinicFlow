# ClinicFlow

ClinicFlow is a team project for clinic scheduling and clinic operations. It is an administrative prototype, not a medical-records system or a tool for making clinical decisions.

## New to GitHub or coding? Start here

You do not need to install coding tools on your own computer. Use GitHub Codespaces to open the project in a browser-based VS Code environment. Follow the [first-day team onboarding guide](docs/TEAM_ONBOARDING.md) for help finding your assigned work and sharing changes with teammates.

### Start the app in Codespaces

1. [Create your own Codespace on `main`](https://github.com/codespaces/new?repo=zixxenK/ClinicFlow&ref=main). If your team lead has asked you to use a different branch, choose that branch instead.
2. Alternatively, open this repository on GitHub, select the green **Code** button, then the **Codespaces** tab and select **Create codespace on main**.
3. Wait for setup to finish. Codespaces installs Node.js and the project dependencies automatically. The first app start also downloads and starts the local Supabase containers.
4. In VS Code, open **Terminal → New Terminal**. A terminal is where you type commands for the project.
5. Copy and run:

   ```sh
   npm run dev
   ```

6. Codespaces opens the forwarded port `5173` when the app is ready. Keep the terminal running while you use the app. To stop the app, click the terminal and press `Ctrl+C`.

No `.env.local` file or forwarded Supabase URL needs to be configured. The frontend connects to Supabase through the same forwarded port as the app. Each teammate should create their own Codespace; its local accounts and data are separate from everyone else's. Use fake email addresses and synthetic data.

### Run from your own computer instead

For a local setup, install Docker Desktop and Node.js 22.12 or newer from [nodejs.org](https://nodejs.org/); npm is included with Node.js. From the repository root, install dependencies once with `npm run setup`, then start everything with `npm run dev`. In Windows PowerShell, use `npm.cmd run setup` and `npm.cmd run dev` if PowerShell blocks the `npm` command. On macOS, use `npm run setup` and `npm run dev` in Terminal.

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

Each teammate gets a separate local database in their Codespace or on their own computer; local records and accounts are not shared between teammates. Docker is required for the local database. Codespaces installs the project dependencies during setup. On your own computer, install Node.js 22.12 or newer and Docker Desktop, then run `npm.cmd run setup` in Windows PowerShell or `npm run setup` in macOS Terminal once.

Start the database-backed app from the repository root:

```sh
npm run dev
```

This single command starts Supabase, applies pending migrations, loads synthetic clinic data, reads the local publishable key, and starts Vite on port `5173`. It does not reset local accounts or records. No `.env.local` file or URL editing is needed. The frontend proxies API requests through its own origin, so the browser uses the correct host both locally and in Codespaces. API and storage secret keys are never added to frontend configuration.

In Codespaces, open the forwarded port `5173`. On your own computer, open `http://127.0.0.1:5173`. Local signup creates a usable account immediately without email confirmation. Password recovery emails are captured in Mailpit; open the forwarded `54324` port in Codespaces or `http://127.0.0.1:54324` locally.

Press **Ctrl+C** in the terminal to stop the app. To stop Supabase too, run `npm.cmd run db:stop` on Windows or `npm run db:stop` on macOS/Linux. The next `npm run dev` starts the saved local database again. Supabase Studio is available on port `54323`.

Use `npm run db:migrate` to apply schema changes without resetting local accounts. `npm run db:reset` deletes local Auth users and database records before loading synthetic records; use it only when you intend to clear local data. Local Auth settings are for development with synthetic data. Before using a hosted project, configure email confirmation, allowed Auth redirects, and an SMTP provider.

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
