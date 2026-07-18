# Wiki Log

## 2026-07-18 | requirements | Added 6 pages: requirements/readme.md, requirements/overview-roles-auth.md, requirements/season-planning.md, requirements/sessions-and-assignment.md, requirements/views-and-notifications.md, requirements/non-functional-requirements.md | Updated 2 pages: wiki/index.md, GEMINI.md
* Ingested, formatted, and structured the initial 6 requirements files inside the `wiki/requirements/` directory.
* Added Tables of Contents (TOC), standardized naming/header conventions, and verified relative wikilinks.
* Refined permissions for trainer views, scheduling, and dashboard notifications.

## 2026-07-18 | feasibility-study | Added 2 pages: codebase/feasibility-and-costs.md, codebase/data-privacy-gdpr.md | Updated 2 pages: wiki/index.md, requirements/overview-roles-auth.md
* Authored technical planning documents analyzing development feasibility, offline synchronization, and calendar integrations.
* Compiled estimated hosting costs comparing Serverless (Option A) and VPS (Option B) paths.
* Formulated GDPR compliance strategy (EU-only database hosting in Frankfurt, pre-signed DPAs, and right-to-erasure profile cascades).
* Postponed Apple Sign-In requirement to avoid paid Apple Developer membership fees, keeping initial developer fees at $0.

## 2026-07-18 | risk-analysis | Added 1 page: codebase/risk-analysis.md | Updated 4 pages: wiki/index.md, requirements/sessions-and-assignment.md, requirements/views-and-notifications.md, requirements/non-functional-requirements.md
* Conducted a technical risk assessment covering offline sync, cache eviction, database race conditions, real-time latency, and PWA/mobile OAuth redirect handling.
* Integrated mitigations into functional requirements: mandated append-only comment logs for session notes to prevent offline write conflicts, programmatically blocked substitution double-bookings, and enforced dual-channel email alerts for critical operations.

<!-- END OF LOG -->
