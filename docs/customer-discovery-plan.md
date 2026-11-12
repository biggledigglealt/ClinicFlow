# ClinicFlow customer discovery plan

**Status:** Plan only. No interviews or willingness-to-pay tests are completed by this document.

## Decision this research should inform

Determine whether independent primary-care clinics in Ottawa are a useful first customer segment for ClinicFlow, which scheduling or clinic-discovery problem is costly enough to address, who owns the buying decision, and what existing systems the product would need to fit. This segment is a hypothesis based on the prototype's Ottawa focus, not a confirmed market choice.

Keep the patient and clinic sides separate in the research. Patients may use the product, while a clinic may have to approve and pay for it. Evidence that patients like a screen does not prove a clinic will buy it.

## First discovery round

Conduct a qualitative round with:

- 8–12 clinic owners, administrators, or front-desk schedulers from independent primary-care clinics. Include both decision-makers and daily users, and record which role each person represents.
- 5–8 patients who have recently searched for or booked a primary-care appointment. This is directional feedback, not a representative patient survey.

Recruit across clinics with different sizes and current scheduling tools. Record the recruitment channel and refusals as counts. Do not present this small sample as statistically representative. Assign an interviewer and a note-taker for each session; have the team choose a research lead before recruiting.

## Clinic interview guide (30 minutes)

Start with current behaviour. Do not introduce ClinicFlow or ask whether the participant likes the idea until the workflow questions are complete.

1. “Walk me through the last time a patient booked, changed, or cancelled an appointment.”
2. “Which tools or channels were involved, and who handled each step?”
3. “Where did the process take extra time or create rework? Can you recall a recent example?”
4. “How often does that happen in a typical week? How do you currently measure the time or impact?”
5. “What happens to an opening after a cancellation? How do you handle waitlists and reminders today?”
6. “Which scheduling, practice-management, or EMR systems must a new tool work with? What exports, integrations, or approvals are required?”
7. “Who would evaluate, approve, and pay for a change? What is the normal purchase or security-review process?”
8. “What would make a pilot too risky or too disruptive? What would you need to see before agreeing to one?”
9. After showing the clearly labelled synthetic-data prototype: “Which task, if any, would you try with your current workflow? What would prevent you from doing that?”
10. “What important question should we have asked?”

Ask for a follow-up with the relevant buyer or technical decision-maker only when the participant offers it. Do not treat polite interest as a pilot commitment.

## Patient interview guide (20 minutes)

1. “Think about the last time you looked for a primary-care clinic. How did you search?”
2. “What made it difficult to compare clinics or decide what to do next?”
3. “How did you learn whether a clinic was accepting patients or had an appointment available?”
4. “What information would help you decide, and what information would you prefer not to provide before booking?”
5. After showing the synthetic-data prototype: “What would you do next? What is unclear or missing?”

Do not ask about diagnoses, symptoms, treatment, or other clinical details. Do not collect names, contact details, dates of birth, account credentials, or patient records in interview notes.

## Pricing and business-model evidence

- Do not repeat the course draft of `$50/month` as a proposed or validated price. It was questioned in the existing client feedback conversation.
- First identify the buyer, current workaround, procurement path, integrations, and cost of switching. A price without those facts is not meaningful.
- Record public competitor prices with the URL, access date, included features, and relevant customer segment. A posted price is a competitor reference, not evidence that ClinicFlow customers will pay it.
- When the buyer and purchasing unit are clear, use a small, documented pricing exercise. Vary price presentation across participants, ask what budget approval and alternatives they would compare, and record the actual commitment requested. Treat stated intent as weaker evidence than a scheduled pilot, budget review, or signed agreement.
- Report the sample, question wording, recruitment method, and counterexamples with any pricing result. Do not turn a small interview round into a market-wide willingness-to-pay claim.

## Privacy and consent

- Before recruiting, confirm the applicable university/course rules for interviewing and recording people. Get any required approval before starting; ask permission before recording each session.
- Explain the project purpose and ask permission before recording. If consent is not given, take notes only.
- Use participant codes such as `CL-01` and `PT-01`; store any contact details separately from research notes and only if needed for a requested follow-up.
- Never place personal, patient, clinic-confidential, or security-review details in the repository. Keep quotes anonymous and obtain permission before sharing a quote externally.
- Show synthetic records only. Do not ask participants to connect ClinicFlow to a live scheduling system or enter real patient information.
- Delete contact details when follow-up is complete. Agree a retention period with the team before beginning the research.

## Evidence log

Create one anonymized row per interview with these fields:

| Field | Record |
| --- | --- |
| Participant code and date | No name or direct contact details |
| Segment and role | Clinic type, clinic size band, buyer/user/patient role |
| Recruitment method | Introduction, referral, or other channel |
| Current workflow | Tools, steps, and people involved |
| Recent problem example | Participant's description; no patient identifiers |
| Frequency and measured impact | Exact estimate and how it was measured, or “not measured” |
| Existing alternatives | Current software, manual workaround, or no action |
| Integration and approval needs | Named systems only if the participant permits sharing; otherwise category |
| Buying evidence | Budget owner, process, timeline, objection, requested follow-up |
| Prototype reaction | Observed task and friction, not a general “liked it” score |
| Counterevidence | Reasons ClinicFlow may not fit |
| Next commitment | None, introduction, workflow review, pilot discussion, or signed pilot |

## Internal decision gate

Before recruitment, agree the number of interviews and a decision rule with the team. A reasonable first-round gate is to continue toward co-design only if repeated, independently described problems cluster around one specific workflow and multiple clinics offer a concrete next step with the relevant decision-maker. If interviews show that integrations, clinic policy, or incumbent systems make the proposed workflow impractical, revise the segment or product before building more features.

This gate is a way to decide what to research next. It is not proof of product-market fit, market size, or willingness to pay.

## Investor reporting format

Report only completed evidence:

- interviews completed by segment and role, including the recruitment period and method;
- repeated problems, supported by anonymized examples and counts;
- contradictory evidence and clinics that declined follow-up;
- concrete commitments such as a second meeting, workflow review, pilot discussion, or signed pilot;
- what changed in the product or business thesis as a result.

Link this evidence to the investor brief only after interviews occur. Until then, describe customer, buyer, market, pricing, and product differentiation as hypotheses.
