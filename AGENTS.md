# ClinicFlow AI Agent Guide

## Project context

This repository is for the ClinicFlow project, a clinic operations and scheduling system intended to improve patient booking, clinic flow, and operational oversight. The project brief in [Deliverables/GNG1103_Deliverable_A-D.md](Deliverables/GNG1103_Deliverable_A-D.md) describes a mobile-friendly, administrative healthcare workflow rather than an EMR or clinical treatment system.

## Core product intent

ClinicFlow should support:
- appointment booking and scheduling workflows
- provider, location, and clinic volume visibility
- wait-time, utilization, and no-show/cancellation tracking
- patient reminder flows and operational dashboards
- mobile-friendly usage on desktop, tablet, and phone devices

## Explicit non-goals

Do not expand the project into:
- clinical charting or electronic medical records
- prescribing, treatment planning, or clinical notes
- direct patient diagnostics or medical decision support
- full healthcare compliance beyond the project’s administrative scope

If a proposed feature touches clinical care, it should be treated as out of scope unless the brief explicitly expands the requirement.

## Product and privacy constraints

This project should prioritize:
- minimal data collection and least-privilege handling
- secure authentication and encrypted data handling
- audit logging and traceability
- privacy by default, especially for patient and appointment data
- alignment with PIPEDA and Ontario privacy expectations

When generating requirements, designs, or implementation ideas, keep patient data collection narrow and justified.

## Design and UX expectations

The project emphasizes ease of use and low-friction adoption. The workflow should be:
- simple enough for front-desk and scheduling staff
- usable on desktop and tablet/mobile surfaces
- fast to set up without manual spreadsheet migration
- built around operational clarity, not complex clinical workflows

## Repo conventions for work

- Prefer documentation-first thinking; this repo currently contains product context and planning material rather than a full application codebase.
- Keep changes anchored to the project brief and this guide rather than introducing unrelated product features.
- When asked to design or implement features, keep them within scheduling, operations, and reporting.
- Any compliance, privacy, or data-handling discussion should be clear, practical, and conservative.

## References

- [README.md](README.md)
- [Deliverables/GNG1103_Deliverable_A-D.md](Deliverables/GNG1103_Deliverable_A-D.md)

## Working style for agents

When contributing to this repo:
1. Start from the project brief and avoid broad scope creep.
2. Keep the solution administrative, privacy-conscious, and operationally useful.
3. Favor simple workflows over complex clinical features.
4. Treat mobile accessibility, dashboard usability, and privacy as first-class concerns.

This repository is best treated as a planning and product-definition workspace until additional application code is added.
