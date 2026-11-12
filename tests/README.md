# Automated validation plan

Run the existing prototype and frontend checks from the repository root:

```sh
node --test backend/*.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

The PostgreSQL Row Level Security integration tests use synthetic accounts and fixtures. They require Docker and the local Supabase services:

```sh
npm run db:start
npm run db:reset
npm run db:test
npm run db:stop
```

The current pgTAP suite plans 66 assertions in `supabase/tests/database/rls.test.sql`. It covers synthetic clinic provenance and search filters, patient/staff access boundaries, booking and overlap protection, waitlist acceptance, schedule interval rules, trusted staff provisioning, selected audit events, notification outbox behavior, and appointment-duration-aware search.

These are database integration checks, not browser end-to-end tests. They do not establish safe behavior under truly concurrent live requests, verify a hosted Supabase project's configuration, test hosted email delivery, or certify privacy/security. Those need separate checks in the intended environment.

Tests must not introduce clinical or treatment-related logic or use real patient information.
