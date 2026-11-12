# ClinicFlow investor discussion outline

**Status:** Internal outline only. Do not circulate as a finished pitch deck. Market size, pricing, customer demand, unit economics, ownership, and funding ask are not established.

## 1. ClinicFlow

**Slide message:** ClinicFlow is a web prototype for clinic discovery, appointment booking, and lightweight scheduling operations.

**Show:** One current screenshot from the integration preview.

**Say:** The product is administrative software. It is not an EMR or clinical decision-support system.

**Verify before use:** Refresh the screenshot after the latest UI changes are deployed. Label the Ottawa listings as synthetic.

## 2. The problem to test

**Slide message:** Patients may have difficulty finding clinics with relevant availability; clinic staff may spend time coordinating bookings and schedule changes across existing tools.

**Evidence status:** This is the team's problem hypothesis. One course-project feedback conversation recommended more clinic and patient research; there is no representative demand study yet.

**Do not claim:** Reduced no-shows, saved staff hours, or improved patient access.

## 3. The proposed workflow

**Slide message:** A patient searches a clinic, reviews availability, and requests an appointment; clinic staff manage schedules and appointment operations.

**Show:** A short, rehearsed prototype flow using synthetic records only.

**Evidence status:** The code implements these workflows locally, but the hosted sign-up-to-booking flow has not been verified in this review.

## 4. Product today

**Slide message:** The prototype includes clinic search, distance and service filters, appointment availability and booking, staff schedule tools, waitlist offers, and accessibility settings.

**Proof:** The integration source passed its GitHub Actions run at commit `2388acf`; the local frontend production build passed after the current visual and conflict-label changes and emitted a large-chunk advisory. A new database migration still needs to run through CI and staging.

**Limitation:** The hosted directory currently returns two synthetic Ottawa listings, and the repository seed gives both the same weekday clinic/provider hours. Matching demo slots are a seed-data artifact, not proof that real clinics share schedules or availability. This is not a verified clinic directory.

## 5. Initial customer hypothesis

**Slide message:** Independent primary-care clinics in Ottawa are a candidate first segment because the prototype and synthetic examples are Ottawa-focused.

**Evidence status:** No clinic buyer, budget owner, signed pilot, or procurement path has been confirmed.

**Next proof:** Conduct the clinic interviews in the [customer discovery plan](customer-discovery-plan.md), including both daily users and people who approve purchases.

## 6. Alternatives and differentiation

**Slide message:** ClinicFlow may be a simpler administrative companion to existing clinic systems.

**Evidence status:** Existing coursework benchmarks Jane, TELUS Health, and CliniqApps. Those products already cover overlapping scheduling or clinic-management needs. The current work does not establish a unique advantage, viable integration model, or reason a clinic would switch.

**Next proof:** Recheck current competitor capabilities and pricing from primary sources, then ask clinic participants which gaps remain after their existing systems are considered.

## 7. Business model and market

**Slide message:** A clinic subscription is one business-model hypothesis.

**Evidence status:** No price, market-size estimate, revenue, or unit economics are validated. The `$50/month` number in course material was a target constraint, not tested pricing.

**Do not show:** A TAM/SAM/SOM chart or revenue forecast until the target clinic segment, sourced customer count, price, sales cycle, onboarding cost, support cost, and integration cost are evidenced.

## 8. Go-to-market evidence

**Slide message:** The next step is clinic discovery and a tightly scoped co-design or pilot, not broad deployment.

**Current proof:** One exploratory feedback conversation. No paying customers, signed pilot, retention data, or verified real-clinic listings are recorded.

**Next milestone:** Secure follow-up with clinic decision-makers, agree on a measurable workflow problem, and define a pilot only after privacy, integration, and operational requirements are understood.

## 9. Execution and risk

**Slide message:** The team has a working prototype and automated integration checks; commercial readiness still depends on product, data, and operating controls.

**Evidence:** The integration CI run is green. The latest `main` CI run failed frontend lint. Production and preview share one Supabase backend; hosted booking, backup/recovery, privacy review, and real clinic data are unverified.

**Next milestones:** Separate staging from Production, verify a synthetic account-to-booking journey, validate listings and ownership, and complete security and privacy review before real clinic use.

## 10. Team, ownership, and ask

**Slide message:** ClinicFlow began as a five-person university course project.

**Evidence status:** The repository contains no company formation record, cap table, contributor IP assignments, university/course IP clearance, or trademark clearance.

**Funding ask:** Not defined. Before presenting an ask, the team must agree whether it is seeking an investment, a sale/asset transfer, or a customer-funded pilot; then document amount, instrument or transaction structure, use of funds, milestones, and ownership authority.

## Release gate for this outline

Turn this outline into an external deck only after the team has:

1. revoked the exposed Trello invitation and published the current-file redaction;
2. confirmed contributor, university/course, client, brand, and third-party rights;
3. completed customer discovery and obtained explicit follow-up or pilot evidence;
4. sourced a bottom-up market estimate and measured pricing/cost assumptions;
5. verified the hosted demo end to end on a separate staging backend;
6. agreed on the ask, transaction type, team ownership, and use of funds.

Until then, use the [evidence-based investor brief](INVESTOR_BRIEF.md) and [readiness report](INVESTOR_READINESS.md) as internal diligence notes, not as claims of commercial readiness.
