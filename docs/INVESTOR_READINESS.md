# Investor demo and product readiness

**Reviewed:** 2026-11-12  
**Status:** Interactive prototype; not ready for production use or a commercial launch.

ClinicFlow demonstrates administrative clinic search, appointment scheduling, and clinic operations. It is not an electronic medical record or a clinical decision-support product. Use synthetic data only.

## What is demonstrable today

- The React, TypeScript, and Vite web app includes clinic search, list and map views, appointment booking, and patient and staff workflows.
- The repository includes Supabase migrations, row-level policies, synthetic Ottawa demo data, and 66 planned pgTAP assertions. CI is configured to run frontend lint/build and local database checks on pull requests.
- The Vercel branch URL returned HTTP 200 during this review. That confirms the page is served; it does not confirm the backend, sign-in, booking, or the latest local source changes.
- A previous local validation is recorded in [the subsystem overview](subsystem-overview.md). It covers local Supabase and synthetic fixtures, not a hosted production system.

## Readiness gaps

| Area | Current evidence | Needed before relying on it commercially |
| --- | --- | --- |
| Clinic directory | Demo clinics and lookup points are synthetic Ottawa data. The local import workflow checks source provenance, but no real clinic listings have been imported. | Obtain a reliable, maintainable source and verify clinic details, appointment services, and directory update ownership. |
| Hosted backend | A Vercel page is reachable. Hosted schema/migration history and Auth configuration have not been verified from this repository. | Verify the intended Supabase project, migrations, RLS, Auth redirects, recovery/sign-up flows, backups, and access ownership. |
| Security and privacy | Local database tests cover selected role boundaries. The application stores a minimal booking profile and appointment data. No independent review or privacy assessment is recorded. | Complete a threat model, security review, privacy impact assessment, retention policy, incident process, and access review before using real personal information. |
| Notifications | Email jobs are testable with local Mailpit. There is no hosted email provider or scheduled delivery worker; SMS and push are not implemented. | Choose and configure a provider and background worker, then verify retries, suppression, delivery, and support ownership. |
| Accessibility and devices | Responsive layouts and saved accessibility settings are implemented. Screen-reader and physical-device validation are not recorded. | Test keyboard, screen reader, contrast, language, and supported device/browser combinations with representative users. |
| Reliability and support | CI covers code checks and a local Supabase test run. No production service-level target, monitoring/alerting, on-call owner, or recovery drill is documented. | Define operating targets, monitoring, incident response, backup recovery, and a named support owner. |
| Market evidence | The repository contains a course project brief, not documented customer discovery or a validated commercial model. | Interview clinics and patients, confirm buyer and budget, run a pilot, and measure adoption, retention, and operating cost. |

## Safe demo checklist

1. Confirm the deployment is built from the intended commit and uses the intended hosted Supabase project.
2. With a synthetic account, verify sign-up or sign-in, clinic search, booking, and the calendar on the deployed URL.
3. Keep synthetic clinic records clearly identified as demos. Do not imply that map pins or availability describe real clinics.
4. Do not enter real patient or staff information, and do not describe the prototype as PIPEDA-certified or production-ready.

## Launch decision

The web prototype can support a clearly labelled product demonstration after its deployed backend and booking flow are checked. The unresolved directory, hosted operations, security/privacy, reliability, accessibility, and market-evidence gaps are material; a reachable Vercel URL alone does not make the product sellable or ready for real clinic operations.
