# ClinicFlow: investor brief working draft

**Evidence cutoff:** 2026-11-12  
**Use:** Internal working draft for investor preparation. Hypotheses below are not market claims.

## Product

ClinicFlow is a web prototype for clinic discovery, appointment booking, and lightweight scheduling operations. Patients can search and compare clinics and request available times. Clinic staff workflows cover schedules and appointment operations. The product is administrative; it does not replace an EMR or provide clinical care.

## Business thesis to test

**Problem hypothesis:** Patients may have difficulty finding clinics with relevant services and available times, while small clinics may spend staff time coordinating appointments across disconnected workflows.

**Initial customer hypothesis:** Independent primary-care clinics in Ottawa could be a practical first segment because the prototype and its synthetic data are Ottawa-focused. This is a candidate pilot segment, not a validated market choice.

**Buyer hypothesis:** A clinic owner or administrator may pay for a lightweight booking and operations tool if it reduces front-desk work and fits existing scheduling systems. The current prototype has no integrations with existing clinic systems, so integration requirements could invalidate this thesis.

**Differentiation hypothesis:** Combining public availability discovery with clinic-side scheduling in a simple, accessible interface may be useful. The prototype has not established that this is distinct enough from existing practice-management or booking products.

## Evidence available

- The repository contains a course project brief and one recorded client feedback conversation. The client asked how the proposed monthly price was researched and recommended more clinic/patient research and investigation of existing-system integrations.
- The current hosted app has two active synthetic clinic listings. An Ottawa search within 25 km returns one demo result.
- The prototype has local database tests and hosted public Auth/search endpoints. A complete hosted account-to-booking flow has not been verified in this review.
- No paying clinics, signed pilot, verified clinic directory, usage retention, or validated pricing evidence is recorded.

## Business model and market size

No pricing or revenue model has been validated. A `$50/month` figure appears in the course material as a tentative target and was challenged during the client conversation; it must not be presented as a researched price.

No defensible total addressable market estimate is ready. A future estimate should identify the exact target clinic segment, count eligible locations using a cited source, establish buyer willingness and sales cycle through interviews, and model onboarding, support, infrastructure, and integration costs.

## Next evidence to collect

1. Interview clinic owners, administrators, and front-desk staff about current scheduling tools, duplicated work, cancellation/no-show handling, data migration, and required integrations.
2. Interview patients about how they find clinics and whether appointment availability changes their choice.
3. Ask clinics to rank the problem against existing systems and identify who owns the budget and procurement decision.
4. Test onboarding and a pilot with verified clinics using synthetic data first; define success measures with the clinic before measuring them.
5. Test pricing with buyers and document the method, sample, and results. Do not infer willingness to pay from a course constraint or a single conversation.
6. Build a bottom-up market and operating-cost model from sourced clinic counts and measured onboarding/support needs.

## Investor claims to avoid until evidenced

- Reduced no-shows, improved clinic efficiency, or better patient access.
- A large or growing addressable market, competitive advantage, or defensible moat.
- Validated pricing, product-market fit, paying customers, or implementation at real clinics.
- Production healthcare privacy/security readiness, PIPEDA certification, or verified clinic availability.

The current product is suitable for a labelled prototype demo. Investment readiness requires stronger customer evidence, a separated staging/production backend, verified clinic data, and a complete hosted booking demonstration.
