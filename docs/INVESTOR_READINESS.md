# Investor demo and product readiness

**Reviewed:** 2026-11-12  
**Status:** Interactive prototype. It is not ready for real clinic operations or a commercial launch.

ClinicFlow demonstrates administrative clinic search, appointment scheduling, and clinic operations. It is not an electronic medical record or a clinical decision-support product. Use synthetic data only.

## Verified demo state

- The [Production site](HOSTED_PREVIEW_URL_REMOVED) and [integration preview](https://clinic-flow-git-feature-supabase-foundation-equillibrium1.vercel.app/) both returned HTTP 200 on 2026-11-12.
- The integration preview serves the current clinic finder styling and calendar build. The Production domain still serves the older `main` build; use the preview for a current product demonstration.
- Both frontends point to the same hosted Supabase project. With the app's publishable key, Auth health returned HTTP 200, public sign-up is enabled, and email auto-confirm is off. A user must verify their email.
- The hosted `search_clinics` RPC returned HTTP 200 and one result for Ottawa within 25 km. The Data API exposed two active clinic rows, both marked `demo`. No real verified clinic listing was returned.
- No live account creation, sign-in, booking, cancellation, staff operation, or private-data access was performed in this review. The hosted migration history and backup configuration were not inspected.
- Local checks on the current source passed: 3 legacy Node tests, frontend lint, production build, and 66 pgTAP assertions. The build emits a bundle-size advisory. `npm audit` reported zero vulnerabilities in root and frontend dependencies on 2026-11-12.

The preview and Production environment sharing one database is a material risk: sign-ups and bookings made during a preview demo can persist in the Production backend. Keep both data and accounts synthetic until a separate staging backend exists.

## Readiness gaps

| Area | Current evidence | Needed before relying on it commercially |
| --- | --- | --- |
| Deployment and demo | Preview has current code; Production is on the older `main` build. Both use the same Supabase project. Email confirmation is required, and this review did not complete a live booking. | Separate staging from Production, verify sign-up and booking end to end using a controlled demo account, and promote only a reviewed build. |
| Clinic directory | The hosted database exposes two active demo listings; an Ottawa/25 km search returns one. No real verified listings are present. | Choose a reliable source, validate real clinic details and availability, assign a directory owner, and agree how listings stay current. |
| Hosted backend | Hosted Auth health and the public clinic-search RPC respond. The exact remote migration history, booking functions, RLS boundaries, backups, and redirect configuration have not been verified. | Reconcile migrations, verify authenticated patient/staff flows and least-privilege access, and confirm backup/recovery ownership. |
| Security and privacy | Local pgTAP tests cover selected role boundaries. Profiles contain a name and optional phone, and appointments are stored. No independent security review or privacy impact assessment is recorded. | Complete threat modeling, security/privacy review, retention and deletion rules, incident response, and an access review before using real personal information. |
| Notifications | Appointment email jobs go to local Mailpit. Hosted appointment reminders, SMS, and push are not configured. Supabase Auth verification email is separate and is required for account creation. | Select and verify a production provider and worker, then test retries, suppression, delivery, and support ownership. |
| Accessibility and devices | Responsive layouts and saved accessibility settings are implemented. Screen-reader and physical-device validation are not recorded. | Test keyboard, screen reader, contrast, language, and supported device/browser combinations with representative users. |
| Reliability and support | CI and local database tests exist. No production service-level target, monitoring/alerting, on-call owner, or recovery drill is documented. | Define operating targets, monitoring, incident response, backup recovery, and a named support owner. |
| Market evidence | One client feedback conversation is recorded in the course deliverable. It includes design feedback and a recommendation to research clinic/patient needs and integrations. It is not representative demand or a pilot. The draft $50/month figure was questioned by the client and is not validated willingness to pay. | Interview a broader set of clinics and patients, confirm the buyer and purchasing process, test integration needs and willingness to pay, then run a measured pilot. |
| Economics and traction | No validated pricing, revenue, paid pilot, retention, acquisition cost, or market-size estimate is recorded. | Build a sourced market estimate and cost model, and report only measured customer and usage evidence. |

## Safe demo checklist

1. Use the integration preview, not the older Production build, for the current interface.
2. Use a synthetic account with access to its verification email. Email confirmation is required.
3. Use Ottawa with a 25 km radius to show the current public search. The matching clinic and schedule are labelled demo data.
4. Explain that preview and Production share a backend; do not enter real patient or staff information.
5. Demonstrate booking only after the team has confirmed that a synthetic account can complete the live flow. Do not imply that the demo listings represent real clinics.

## Launch decision

The current preview can support a clearly labelled prototype demonstration. The stale Production build, shared backend, demo-only directory, unverified hosted appointment flow, and missing market/security/operational evidence prevent a claim that ClinicFlow is ready to sell or operate in a clinic.

See [the evidence-based investor brief](INVESTOR_BRIEF.md), [subsystem overview](subsystem-overview.md), and [clinic listing verification plan](clinic-listing-verification.md) for supporting detail.
