# ClinicFlow

ClinicFlow is a team project for clinic scheduling and clinic operations. It is an administrative prototype, not a medical-records system or a tool for making clinical decisions.

## New to GitHub or coding? Start here

You do not need to install coding tools on your own computer. Use GitHub Codespaces to open the project in a browser-based VS Code environment. Follow the [first-day team onboarding guide](docs/TEAM_ONBOARDING.md) for step-by-step instructions on starting the project, finding your assigned work, and sharing changes with teammates.

### Start the app in Codespaces

1. [Create your own Codespace on `main`](https://github.com/codespaces/new?repo=zixxenK/ClinicFlow&ref=main). If your team lead has asked you to use a different branch, choose that branch instead.
2. Alternatively, open this repository on GitHub, select the green **Code** button, then the **Codespaces** tab and select **Create codespace on main**.
3. Wait for the Codespace to finish setting up. It installs the frontend dependencies for you.
4. In VS Code, open **Terminal → New Terminal**. A terminal is where you type commands for the project.
5. Copy and run:

   ```sh
   npm --prefix frontend run dev -- --host 0.0.0.0
   ```

6. When Codespaces shows that port `5173` is ready, select **Open in Browser** to see the app. Keep the terminal running while you use the app. To stop it, click the terminal and press `Ctrl+C`.

If you are not using Codespaces, install Node.js 22.12 or newer and npm first, then run:

```sh
npm ci --prefix frontend
npm --prefix frontend run dev
```

## Who is working on what?

These are the current workstream owners from the team plan. Owners should keep their changes on their own branch and coordinate with one another before changing shared interfaces or files.

| Workstream | Owner(s) | Starting scope |
| --- | --- | --- |
| Database and security | Cameron | Compare database options; agree on a data model, access rules, and privacy-safe logging with the team before connecting a service. |
| Device-adaptive UI | Shyaan and Alex | Make the interface usable on phones, tablets, and desktop screens. |
| Clinic finder | Juliana | Build the clinic search and clinic selection experience. |
| Calendar and scheduling | Christopher | Build the calendar and appointment time-selection experience. |

Everyone should review how their feature fits with the others. For example, the clinic finder and calendar both need to agree on how a selected clinic and available appointment times are represented. Ask the team before changing another person's workstream.

### Database decision: compare before choosing

**The database provider has not been selected or connected yet.** Cameron's workstream is to compare options and bring a recommendation to the team; do not create a paid service or put real data in a cloud database before the team agrees.

The scheduling data has relationships: an appointment refers to a patient, a clinic, and a staff member. That makes a relational database such as **Supabase Postgres** a sensible option to evaluate first: tables, foreign keys, and database constraints can represent those links. **Firebase Cloud Firestore** is a document database that can be useful for flexible documents and real-time updates, but linked scheduling data may require more deliberate duplication and consistency rules.

Compare the actual options against the project requirements, team familiarity, access control, privacy, and current pricing/free-tier limits. Do not rely on broad claims that one database is always faster or better. Whichever provider the team selects, use its supported authentication and access controls; do not store passwords yourself. Use synthetic data only.

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

- The test command runs the existing backend prototype tests.
- The lint command checks frontend code for common issues.
- The build command checks TypeScript and builds the frontend.

## What is implemented today?

The frontend is a runnable React/TypeScript/Vite prototype. The backend folder currently contains schema and authentication helper modules with tests; a hosted database and a connected application API are **not** set up. The clinic finder, calendar, responsive behavior, logging, and security workstreams still need implementation and team review. A screen or sample value in the prototype is not evidence that a real booking or database connection works.

## Privacy and project scope

- Use synthetic/sample data only. Never put real patient or staff information in code, screenshots, issues, pull requests, or test data.
- Do not commit passwords, API keys, tokens, or `.env` files. Ask the team how approved secrets should be shared.
- Keep ClinicFlow focused on appointment booking, clinic information, reminders, and operational workflows.
- Do not add medical records, diagnoses, prescriptions, treatment plans, or clinical decision support.

## Project folders

- `frontend/` — React, TypeScript, and Vite application.
- `backend/` — backend prototype modules and tests.
- `tests/` — test planning and validation notes.
- `docs/` — team onboarding and subsystem notes.
- `Deliverables/` — project brief and course deliverables.

The `.devcontainer/` folder configures Codespaces. The `.github/` folder contains the pull request template and automated checks.
