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

## 2026-08-18 | system-architecture | Added 6 pages: codebase/architecture/system-architecture.md, codebase/architecture/database-schema.md, codebase/architecture/auth-and-onboarding.md, codebase/architecture/notification-system.md, codebase/architecture/offline-and-pwa.md, codebase/architecture/substitution-flow.md | Updated 2 pages: wiki/index.md, wiki/log.md
* Created Phase 1 system architecture spanning 6 wiki pages in `wiki/codebase/architecture/`.
* Main architecture page covers scope (Sessions & Trainer Management focus), resolved technology decisions (Supabase, React/Vite, Turborepo), tech stack, high-level Mermaid diagram, monorepo structure, feature module/route breakdown, 5-step implementation roadmap, and verification plan.
* Database schema page documents 12 Phase 1 PostgreSQL tables with full ER diagram, column definitions, Row-Level Security policies, and 7 Phase 2 extension point tables (blocks, themes, notes).
* Auth and onboarding page details Supabase Auth integration (email/password + Google OAuth), invitation flow sequence diagram using built-in SMTP, and calendar integration (iCal export + live subscription feed).
* Notification system page describes push (FCM) + in-app architecture with event-to-recipient mapping for 7 notification events. Email fallback (Resend) deferred to Phase 2.
* Offline and PWA page covers TanStack Query + IndexedDB caching, Workbox service worker strategy, persistent storage API, and Phase 2 offline mutation plans.
* Substitution flow page documents the race-condition-safe volunteer workflow using `SELECT FOR UPDATE` transactions, double-booking prevention, and `pg_cron` 48-hour escalation checks.
* Phase 2 deferred items: season planning (blocks, themes, curriculum), session notes (training plan + post-session comments with Tiptap), critical email notifications (Resend).

## 2026-08-18 | wiki-reorganization | Moved 6 pages to codebase/architecture/ | Updated 8 pages: wiki/index.md, wiki/log.md, and all 6 architecture pages
* Moved 6 architecture pages from `wiki/codebase/` to `wiki/codebase/architecture/` for better organization.
* Separated architecture specs (system-architecture, database-schema, auth-and-onboarding, notification-system, offline-and-pwa, substitution-flow) from pre-development planning docs (feasibility-and-costs, data-privacy-gdpr, risk-analysis).
* Updated all `[[wiki-links]]` across the wiki to use the new `codebase/architecture/` prefix.

## 2026-08-18 | system-architecture-refinement | Updated 2 pages: codebase/architecture/system-architecture.md, wiki/index.md
* Removed execution roadmap and verification plan from `wiki/codebase/architecture/system-architecture.md` to keep the architecture wiki strictly focused on pure technical architecture review.
* Implementation planning and task execution will be maintained as a separate activity.

## 2026-08-18 | architecture-grill-me-refinements | Updated 3 pages: codebase/architecture/database-schema.md, codebase/architecture/substitution-flow.md, codebase/architecture/auth-and-onboarding.md
* Incorporated 6 design decisions from interactive review:
  1. Auto-generate sessions from season date range & training day setup.
  2. Availability survey responses linked directly to `session_id` and locked when survey status is `closed`.
  3. Substitution assignment status transitions: original trainer assignment updated to `absent_pending_sub`, updated to `replaced` when filled; volunteer assignment inserted with `status='active'`, `is_substitute=true`.
  4. Statistics & matrix workload display both 'Completed Sessions' (past) and 'Total Assigned' (past + upcoming) separately.
  5. Player groups mapped per training day in Season Setup via `TRAINING_DAY_PLAYER_GROUPS` join table.
  6. Added "Regenerate Link" safety feature in Settings for live calendar feed token revocation.

## 2026-08-18 | architecture-schema-audit | Updated 3 pages: codebase/architecture/database-schema.md, codebase/architecture/offline-and-pwa.md, wiki/index.md
* Conducted a thorough audit of the architecture pages against all requirements.
* Added `device_tokens` table to `database-schema.md` (required for FCM push token registration) and updated core table count to 14.
* Added RLS policies for `device_tokens` and `training_day_player_groups`.
* Refined RLS status check for `availability_responses` (editing restricted to when survey is `open`).
* Replaced Unicode middle dots in `offline-and-pwa.md` diagram for renderer compatibility.

## 2026-08-18 | implementation-plan-wiki-page | Added 1 page: codebase/architecture/implementation-plan.md | Updated 2 pages: wiki/index.md, codebase/architecture/system-architecture.md
* Added Phase 1 implementation plan to the Wiki as [`codebase/architecture/implementation-plan.md`](file:///home/pratyuksh/Documents/03_Joint_Space/Projects/pocket-coach/pocket-coach-wiki/wiki/codebase/architecture/implementation-plan.md).
* Documents sub-phases 1.1 through 1.7 with database migrations, web app component changes, UX features, and clear testable milestone criteria for each sub-phase.

## 2026-08-18 | implementation-plan-relocation | Moved 1 page to codebase/implementation-plan.md | Updated 3 pages: wiki/index.md, codebase/implementation-plan.md, codebase/architecture/system-architecture.md
* Relocated [`implementation-plan.md`](file:///home/pratyuksh/Documents/03_Joint_Space/Projects/pocket-coach/pocket-coach-wiki/wiki/codebase/implementation-plan.md) from `wiki/codebase/architecture/` to `wiki/codebase/` to keep `wiki/codebase/architecture/` strictly dedicated to system design and technical specifications.
* Categorized under **Codebase — Planning** in `wiki/index.md`.
* Updated all `[[wiki-links]]` to `[[codebase/implementation-plan]]`.

<!-- END OF LOG -->
