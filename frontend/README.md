# ClinicFlow frontend

The frontend is a React, TypeScript, and Vite application. It contains the clinic finder and map, patient booking calendar, account/profile screens, accessibility settings, notifications, and clinic staff operations.

## Local development

From the repository root, use `npm run dev`. The root startup command starts local Supabase, applies migrations, loads synthetic clinic data, injects the local publishable key, and starts Vite. Docker must be running. Do not run `npm --prefix frontend run dev` by itself unless local Supabase is already running and `VITE_SUPABASE_PUBLISHABLE_KEY` is set.

Local Vite requests use the `/supabase` proxy to reach local Supabase. Local signup does not require email verification; Mailpit captures local email. See the [root README](../README.md) for setup and database commands.

## Build and lint

From the repository root:

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
```

The build writes static files to `frontend/dist/`.

## Hosted deployment

Vercel uses `frontend/` as the root directory, `npm run build` as the build command, and `dist` as the output directory. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment. Only a publishable key belongs in frontend configuration; never put a Supabase secret or service-role key in a `VITE_` variable.

Keep Preview and Production connected to separate Supabase projects before using real accounts or clinic data. The current Vercel Preview and Production bundles point to the same hosted project. Any signup or booking from either deployment may write to that shared backend.

Clinic listings currently identify synthetic examples as demo data. Do not use real patient information until the hosted schema, access policies, privacy controls, and operational procedures have been reviewed.
