# ClinicFlow team onboarding

This guide is for teammates who are new to coding or GitHub. You can do the setup in a browser with GitHub Codespaces; you do not need to install a code editor on your computer.

## 1. Get access and open the project

1. Ask the team lead to confirm that your GitHub account has access to the ClinicFlow repository.
2. [Create your own Codespace on `main`](https://github.com/codespaces/new?repo=zixxenK/ClinicFlow&ref=main). Alternatively, open the repository on GitHub and select **Code → Codespaces → Create codespace on main**. If the team is already working on a different branch, ask which branch to use.
3. Wait for setup to finish. Codespaces installs Node.js and the project dependencies automatically.
4. You are now in VS Code in your browser. The file list is on the left. Select **Terminal → New Terminal** to open the command area at the bottom.

Each Codespace has its own local database and accounts. Teammates do not share local records; use synthetic data only.

If the Codespace reports an error, copy the error text and ask the team for help. Do not paste passwords, tokens, or other secrets into chat or an issue.

## 2. Run and view the app

In the terminal, run this one command:

```sh
npm run dev
```

This starts local Supabase, applies migrations, loads synthetic clinic data, and starts the frontend. Codespaces opens forwarded port `5173` when it is ready. Leave the command running while you work. When you want to stop the app, click its terminal and press `Ctrl+C`.

When you edit and save frontend code, Vite normally refreshes the preview automatically. Login, profile editing, clinic search, booking changes, staff operations, accessibility preferences, and in-app notifications connect to the Codespace's local Supabase database. Use synthetic data only.

If you are running the project directly on your own computer instead of Codespaces, install Node.js 22.12 or newer from [nodejs.org](https://nodejs.org/); npm is included with Node.js. From the repository root, run `npm run setup` once, then `npm run dev`. In Windows PowerShell, use `npm.cmd run setup` and `npm.cmd run dev` if PowerShell blocks the `npm` command. On macOS, use `npm run setup` and `npm run dev` in Terminal; npm selects packages for the computer's OS and processor.

## 3. Find your task

Check with your team before starting if task ownership or the latest assignment is unclear.

| Workstream | Owner(s) | First goal |
| --- | --- | --- |
| Database and security | Cameron | Maintain migrations, RLS, booking validation, waitlists, and audit coverage. |
| Device-adaptive UI | Shyaan and Alex | Test responsive and Capacitor layouts across screen sizes and devices. |
| Clinic finder | Juliana | Expand and validate clinic search data and the selection flow. |
| Calendar and scheduling | Christopher | Test patient booking changes and staff schedule/appointment operations. |

These ownership notes are a starting point, not a reason to work in isolation. Agree on shared data shapes and interfaces before separate features depend on them. Ask before editing another owner's files or changing a shared design.

## 4. Database and Supabase development setup

Supabase with PostgreSQL is the current development target. The repository includes a migration, RLS policies, local CLI configuration, frontend Auth helpers, and synthetic database tests. The team should review provider fit, cost, privacy, and access rules before applying the migration to a hosted project or using real information. Use synthetic records only.

A terminal transcript in the in-progress deliverable reports a hosted link and migration push, but the current remote state has not been verified. Ask the project owner to confirm the linked project and migration history before any hosted database action. Never put a service-role or secret key in the frontend. The local `npm run dev` command obtains a publishable key automatically; no environment file or forwarded API URL is needed. `.env.example` is only for builds configured to use a hosted project.

For local development outside Codespaces, install Docker Desktop and Node.js 22.12 or newer, then install dependencies from the repository root with `npm.cmd run setup` in Windows PowerShell or `npm run setup` in macOS Terminal. Start the entire database-backed app with `npm run dev`.

Local signup is immediate without email confirmation. Password recovery emails are captured by Mailpit at `http://127.0.0.1:54324` locally or the forwarded `54324` port in Codespaces. Supabase Studio is at `http://127.0.0.1:54323` locally. Stop Supabase with `npm.cmd run db:stop` on Windows or `npm run db:stop` on macOS/Linux. The schema source is `supabase/migrations/`; do not duplicate schema changes in frontend code.

Use `db:migrate` to apply pending migrations without resetting local accounts. `db:reset` removes locally created Auth users and database records before applying migrations and synthetic clinic, provider, and schedule records from `supabase/seed.sql`; run it only when you intentionally want a clean local database. Use `db:test` to rerun database checks without resetting local accounts.

Appointment email jobs can be processed locally with `npm.cmd run notify:local`; the worker targets Mailpit only and is not scheduled automatically. Hosted Supabase needs the correct web redirect URLs, email-confirmation settings, and a selected SMTP provider before external delivery. For native Capacitor verification or password recovery, add `ca.uottawa.clinicflow://auth-callback` to the hosted Auth redirect allowlist. Native builds and email callback handoff have not been verified.

## 5. Keep logs useful and private

The logging goal is to accurately record important administrative actions. A useful event can include a timestamp, action name, non-sensitive actor identifier, opaque record identifier, and success/failure outcome. Keep the details minimal. Never log passwords, access tokens, patient names, dates of birth, contact information, or entire request bodies. Test with synthetic data only.

## 6. Make a change safely

GitHub terms in plain language:

- **Repository (repo):** the shared project.
- **Branch:** your separate line of work, so unfinished changes do not go straight into `main`.
- **Commit:** a named, saved snapshot of your changes.
- **Pull request (PR):** a request for teammates to review your branch and merge it into `main`.

Before starting a task, finish or commit any existing work. Then create a fresh branch:

```sh
git switch main
git pull
git switch -c feature/short-task-name
```

For example, use `feature/clinic-search` for a clinic search change. Do not make feature changes directly on `main`, and do not share one feature branch between teammates.

Make a small change, save the file, and check the running app. Before asking for review, run the checks in the next section. Then save and publish your work:

```sh
git add path/to/your-changed-file
git commit -m "Describe the change"
git push -u origin HEAD
```

Replace `path/to/your-changed-file` with the path to the file you changed; list each changed file if there is more than one. `git add` stages the files you name, `git commit` saves a named snapshot, and `git push` publishes your branch to GitHub. Run `git status` first and check that you are only staging your own task files. VS Code's **Source Control** view can also stage and commit changes.

On GitHub, open **Compare & pull request** for your branch. Check that the base branch is `main`, summarize what changed, list the checks you ran, and request a teammate's review. Address feedback on the same branch. Do not force-push, discard changes, or resolve a conflict by deleting files unless your team has agreed on the fix.

## 7. Run the checks

Run these from the repository root:

```sh
node --test backend/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

All three should finish successfully before review. If one fails, read the error, fix an issue in your change, and run that check again. If you cannot resolve it, include the error in your pull request and ask for help; do not claim a failed check passed.

## 8. Scope and privacy

- Use made-up sample data only. Do not use real patient, staff, or appointment details, even in screenshots.
- Never commit `.env` files, passwords, API keys, or tokens. `.gitignore` excludes common local environment files, but still check what you stage.
- Keep features limited to clinic finding, appointment scheduling, accessibility, reminders, and administrative operations.
- Do not add clinical notes, medical records, diagnoses, treatment planning, prescriptions, or medical decision support.

## Current project status

The frontend supports account recovery/password changes, editable patient profiles, clinic search, booking/cancellation/rescheduling, staff schedule tools, waitlist offers, accessibility controls, English/French interface labels, and in-app notifications. Appointment email events enter a private outbox and can be sent to local Mailpit by running the local worker. A production provider, scheduled reminder worker, SMS, and push are not configured. Local clinic/provider data is synthetic and limited to Ottawa, K1N, and K2G; the verified-listing importer is local-only and no real listings have been imported. Native builds, callback handoff, and real-device accessibility testing remain unverified. `backend/` contains legacy prototype modules and tests. Do not push local migration changes to a hosted project without confirming its state and redirect settings with the project owner.
