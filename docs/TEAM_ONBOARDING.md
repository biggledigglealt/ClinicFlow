# ClinicFlow team onboarding

This guide is for teammates who are new to coding or GitHub. You can do the setup in a browser with GitHub Codespaces; you do not need to install a code editor on your computer.

## 1. Get access and open the project

1. Ask the team lead to confirm that your GitHub account has access to the ClinicFlow repository.
2. [Create your own Codespace on `main`](https://github.com/codespaces/new?repo=zixxenK/ClinicFlow&ref=main). Alternatively, open the repository on GitHub and select **Code → Codespaces → Create codespace on main**. If the team is already working on a different branch, ask which branch to use.
3. Wait for setup to finish. The first setup installs the Supabase CLI and frontend packages.
4. You are now in VS Code in your browser. The file list is on the left. Select **Terminal → New Terminal** to open the command area at the bottom.

If the Codespace reports an error, copy the error text and ask the team for help. Do not paste passwords, tokens, or other secrets into chat or an issue.

## 2. Run and view the app

In the terminal, run:

```sh
npm --prefix frontend run dev -- --host 0.0.0.0
```

This starts the local development server. Codespaces forwards port `5173`; select **Open in Browser** next to that port to see the app. Leave the command running while you work. When you want to stop the server, click its terminal and press `Ctrl+C`.

When you edit and save frontend code, Vite normally refreshes the preview automatically. The current app is a prototype: its sample content is not connected to a working database or booking API.

## 3. Find your task

Check with your team before starting if task ownership or the latest assignment is unclear.

| Workstream | Owner(s) | First goal |
| --- | --- | --- |
| Database and security | Cameron | Review the Supabase schema, access approach, and privacy-safe audit logging before hosted deployment. |
| Device-adaptive UI | Shyaan and Alex | Make existing and new screens work on phone, tablet, and desktop sizes. |
| Clinic finder | Juliana | Implement the clinic search and selection flow. |
| Calendar and scheduling | Christopher | Implement calendar navigation and appointment time selection. |

These ownership notes are a starting point, not a reason to work in isolation. Agree on shared data shapes and interfaces before separate features depend on them. Ask before editing another owner's files or changing a shared design.

## 4. Database and Supabase development setup

Supabase with PostgreSQL is the current development target. The repository includes a migration, RLS policies, local CLI configuration, frontend Auth helpers, and synthetic database tests. The team should review provider fit, cost, privacy, and access rules before applying the migration to a hosted project or using real information. Use synthetic records only.

The hosted migration has not been applied. Never put a service-role or secret key in the frontend. The publishable key is public and belongs only in the ignored `frontend/.env.local` file.

For local database work, install the root CLI and frontend packages, then run the local Supabase services (Docker required):

```sh
npm ci
npm ci --prefix frontend
npm run db:start
npm run db:reset
npm run db:test
```

In Windows PowerShell, run these as `npm.cmd` commands (for example, `npm.cmd run db:start`).

Set `frontend/.env.local` from the local API URL and publishable key shown by `npm run db:start`. In Codespaces, use the forwarded HTTPS URL for port `54321`, and use the forwarded frontend URL for auth redirects. Stop local services with `npm run db:stop`. The schema source is `supabase/migrations/`; do not duplicate schema changes in frontend code.

Local `db:reset` removes locally created Auth users and database records before applying migrations and the synthetic clinics in `supabase/seed.sql`. Use `db:test` when you only need to rerun the access-control tests without resetting local accounts.

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

The frontend has Supabase Auth login/signup/logout, patient profile onboarding, and a live clinic finder against the configured Supabase database. Appointment booking, staff provisioning and schedules, cancellation/rescheduling, and notification delivery are not connected yet. Accessibility and notification panels still show illustrative content. `backend/` contains legacy prototype modules and tests; the hosted Supabase project has not been linked or migrated.
