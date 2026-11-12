# Investor demo and product readiness

**Reviewed:** 2026-11-12  
**Status:** Interactive prototype. It is not ready for real clinic operations or a commercial launch.

ClinicFlow demonstrates administrative clinic search, appointment scheduling, and clinic operations. It is not an electronic medical record or a clinical decision-support product. Use synthetic data only.

## Verified demo state

- On 2026-11-12 at 22:38 UTC, the [Production site](HOSTED_PREVIEW_URL_REMOVED) and [integration preview](https://clinic-flow-git-feature-supabase-foundation-equillibrium1.vercel.app/) both returned HTTP 200. This confirms reachability only; it does not verify the rendered app or a user workflow.
- The integration preview serves the current clinic finder styling and calendar build. The Production domain still serves the older `main` build; use the preview for a current product demonstration.
- Both frontends point to the same hosted Supabase project. With the app's publishable key, Auth health returned HTTP 200, public sign-up is enabled, and email auto-confirm is off. A user must verify their email.
- The hosted `search_clinics` RPC returned HTTP 200 and two results for Ottawa within 25 km. The Data API exposed two active clinic rows, both marked `demo`. No real verified clinic listing was returned.
- The tracked frontend environment file is `frontend/.env.example`; `.env.local` and `.env.hosted.local` are ignored and untracked in this working copy. This is a working-tree check, not a full secret scan of Git history.
- No live account creation, sign-in, booking, cancellation, staff operation, or private-data access was performed in this review. The hosted migration history and backup configuration were not inspected.
- GitHub Actions passed for integration commit `2388acf` ([run 43320578809](https://github.com/zixxenK/ClinicFlow/actions/runs/43320578809)); the workflow covers backend tests, frontend lint/build, migrations, and local database access tests. The latest `main` run for commit `5b06677` ([run 42916502532](https://github.com/zixxenK/ClinicFlow/actions/runs/42916502532)) failed at frontend lint on 2026-11-10. Current uncommitted UI edits, including visible labels for overlapping appointment slots, passed a local production build; the build still reports a bundle-size advisory, and these edits are not covered by the GitHub run. `npm audit` reported zero vulnerabilities in root and frontend dependencies on 2026-11-12.

The preview and Production environment sharing one database is a material risk: sign-ups and bookings made during a preview demo can persist in the Production backend. Keep both data and accounts synthetic until a separate staging backend exists.

## Readiness gaps

| Area | Current evidence | Needed before relying on it commercially |
| --- | --- | --- |
| Deployment and demo | Production tracks `main`, whose current tip is `5b06677`; its latest CI run failed frontend lint. Integration is at `2388acf` and its latest CI run passed. Both public URLs responded HTTP 200 on 2026-11-12, but this review did not complete a live booking. Both deployments use the same Supabase project, and email confirmation is required. | Fix or supersede the failing `main` check, promote the reviewed integration build, separate staging from Production, and verify sign-up and booking end to end with a controlled demo account. |
| Clinic directory | The hosted database exposes two active demo listings; an Ottawa/25 km search returns both. No real verified listings are present. The repository seed gives the two clinics separate synthetic providers but identical Monday–Friday 09:00–17:00 clinic and staff hours, so their baseline slots match. The availability RPC accepts a clinic ID and filters by that clinic. | Choose a reliable source, validate real clinic details and availability, differentiate synthetic schedules for a convincing demo, assign a directory owner, and agree how listings stay current. |
| Hosted backend | Hosted Auth health and the public clinic-search RPC respond. The new migration returns clinic/staff slots even when they overlap the signed-in patient's other booking; the calendar labels those slots as conflicts, while the database exclusion constraint still prevents double booking. The change is not yet deployed to the hosted backend. Its GitHub CI run is pending. The exact remote migration history, booking functions, RLS boundaries, backups, and redirect configuration have not been verified. | Apply and verify the migration in staging, verify authenticated patient/staff flows and least-privilege access, and confirm backup/recovery ownership before production. |
| Security and privacy | Local pgTAP tests cover selected role boundaries. Profiles contain a name and optional phone, and appointments are stored. No independent security review, Ontario privacy impact assessment, or PHIPA review is recorded. A Trello invitation URL was found in two deliverables and public Git history. It has been removed from this working copy, but earlier commits still contain it. | Revoke the exposed Trello invitation immediately; publish the redaction after revocation. Complete threat modeling and qualified Ontario privacy/legal review, then define retention/deletion rules, incident response, and access review before using real personal information. |
| Notifications | Appointment email jobs go to local Mailpit. Hosted appointment reminders, SMS, and push are not configured. Supabase Auth verification email is separate and is required for account creation. | Select and verify a production provider and worker, then test retries, suppression, delivery, and support ownership. |
| Accessibility and devices | Responsive layouts and saved accessibility settings are implemented. Screen-reader and physical-device validation are not recorded. | Test keyboard, screen reader, contrast, language, and supported device/browser combinations with representative users. |
| Reliability and support | CI and local database tests exist. No production service-level target, monitoring/alerting, on-call owner, or recovery drill is documented. | Define operating targets, monitoring, incident response, backup recovery, and a named support owner. |
| Market evidence | One course-project feedback conversation is summarized in the [investor-safe evidence note](client-feedback-summary.md). It includes design feedback and a recommendation to research clinic/patient needs and integrations. It is not representative demand or a pilot. The draft $50/month figure was questioned and is not validated willingness to pay. A [customer discovery protocol](customer-discovery-plan.md) is prepared but has not been run. No permission to share the raw course transcript with investors is recorded. | Confirm consent before distributing the raw transcript. Recruit clinic and patient participants, conduct the documented interviews, confirm the buyer and purchasing process, test integration needs and pricing, then seek a measured pilot. |
| Economics and traction | No validated pricing, revenue, paid pilot, retention, acquisition cost, or market-size estimate is recorded. | Build a sourced market estimate and cost model, and report only measured customer and usage evidence. |
| IP and ownership | The repository describes a course-team prototype and has no license or recorded contributor/university IP decision. | Confirm rights from every contributor, university/course/client terms, name/trademark clearance, and third-party data/software licensing before offering or transferring equity. |

## Safe demo checklist

1. Use the integration preview, not the older Production build, for the current interface.
2. Use a synthetic account with access to its verification email. Email confirmation is required.
3. Use Ottawa with a 25 km radius to show both current public results. The clinics and schedules are labelled demo data.
4. Explain that preview and Production share a backend; do not enter real patient or staff information.
5. Demonstrate booking only after the team has confirmed that a synthetic account can complete the live flow. Do not imply that the demo listings represent real clinics.

## Launch decision

The current preview can support a clearly labelled prototype demonstration. The stale Production build, shared backend, demo-only directory, unverified hosted appointment flow, exposed Trello invitation in repository history, and missing market/security/operational evidence prevent a claim that ClinicFlow is ready to sell or operate in a clinic.

See [the evidence-based investor brief](INVESTOR_BRIEF.md), [subsystem overview](subsystem-overview.md), and [clinic listing verification plan](clinic-listing-verification.md) for supporting detail.
