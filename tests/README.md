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

The current database test checks patient, clinic staff, and audit-log access boundaries, plus the overlapping-appointment constraints, in `supabase/tests/database/rls.test.sql`. It does not yet cover concurrent booking requests, booking-hours validation, cancellation, rescheduling, notifications, or administrator provisioning; those depend on database functions and workflows that are not implemented yet.

Tests must not introduce clinical or treatment-related logic or use real patient information.
