# ClinicFlow

**Find clinics, compare appointment times, and manage schedules in one place.**

[![CI](https://github.com/zixxenK/ClinicFlow/actions/workflows/ci.yml/badge.svg?branch=feature%2Fsupabase-foundation)](https://github.com/zixxenK/ClinicFlow/actions/workflows/ci.yml)
[Open the preview](https://clinic-flow-git-feature-supabase-foundation-equillibrium1.vercel.app/)

ClinicFlow is a responsive web prototype for clinic discovery, appointment booking, and day-to-day scheduling. It supports patient and clinic staff workflows, with a focus on clear availability and simple operations.

> ClinicFlow is a prototype. Clinic listings and records are synthetic. Do not enter real patient or staff information.

## What it does

- Search clinic listings by location, service, distance, and appointment availability.
- Compare results on a map and in a list.
- Book, view, reschedule, and cancel appointments.
- Manage clinic and staff schedules, appointment status, and waitlist offers.
- Use English or French, with saved accessibility preferences.

ClinicFlow is administrative scheduling software. It is not an electronic medical record and does not provide diagnosis, treatment, or clinical decision support.

## Run locally

Requirements: Node.js 22.12 or newer and Docker Desktop.

```sh
npm run setup
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The startup command starts local Supabase, applies migrations, loads synthetic clinic data, and launches the web app. Keep Docker and the terminal running while you use it.

In GitHub Codespaces, dependencies install during setup. Run `npm run dev`, then open forwarded port `5173`.

Local signup is immediate. Password recovery and appointment emails are captured by Mailpit at [http://127.0.0.1:54324](http://127.0.0.1:54324); Supabase Studio is at [http://127.0.0.1:54323](http://127.0.0.1:54323).

Stop the local database services with:

```sh
npm run db:stop
```

## Checks

Run the application checks from the repository root:

```sh
node --test backend/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
npm run db:test
```

Database tests require Docker and local Supabase. They use synthetic accounts and fixtures.

## Technology

- React, TypeScript, and Vite
- Supabase Auth and PostgreSQL
- Capacitor project shells for Android and iOS

## Project documentation

- [Team onboarding](docs/TEAM_ONBOARDING.md)
- [System overview](docs/subsystem-overview.md)
- [Clinic listing verification and import](docs/clinic-listing-verification.md)
- [Notification delivery](docs/notifications.md)
- [Database and access model](backend/README.md)

## Deployment configuration

The frontend build expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Only use a publishable key in frontend configuration; never put a Supabase secret or service-role key in a `VITE_` variable. Local development configures its own local Supabase connection. Do not use real information with hosted deployments until their database, authentication, and access settings have been reviewed.
