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

## 2026-09-13 | phase-1.2-completion-and-rls | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Completed Sub-Phase 1.2 (Authentication, User Profiles & Role Management) verification and gap closure.
* Added Google OAuth configuration note regarding local dev (`packages/supabase/config.toml`) vs production setup.
* Implemented Live Calendar Feed Sync (WebCal token display & "Regenerate Link" token revocation) in `TrainerProfileEditor.tsx` (`/settings`).
* Added database migration `20260913000000_tighten_auth_rls.sql` enforcing strict PostgreSQL Row-Level Security (RLS) policies on `profiles` and `user_roles` using `is_super_admin` `SECURITY DEFINER` helper function.
* Documented Phase 1.1 layout primitives, Glassmorphic design tokens, Dark/Light mode theme engine (`useTheme.tsx`), and preview page shells (`/dashboard`, `/sessions`, `/availability`, `/substitutions`).
* Expanded automated Vitest unit test suite to 45 tests (10 test files) and Playwright E2E suite to 7 tests (5 spec files).
* Added `pnpm supabase:reset` shortcut script to root `package.json`.

## 2026-09-26 | phase-1.3-planning-locations-templates | Updated 5 pages: requirements/season-planning.md, requirements/sessions-and-assignment.md, codebase/architecture/database-schema.md, codebase/implementation-plan.md, wiki/index.md
* Updated Sub-Phase 1.3 implementation plan to include sports hall locations, default season templates (`season_templates`), and exact weekly Junior schedule slots.
* Added 3 default sports hall locations: Sporthalle Schulhaus Apfelbaum (Oerlikon), Sporthalle Borrweg (Friesenberg), and Sporthalle Wolfsblick (Zürich-Affoltern).
* Documented standard Junior weekly schedule across 5 slots: Tuesday 17:30–19:00 (Apfelbaum, all groups), Wednesday 17:30–18:30 (Borrweg, Kids/Basic), Wednesday 18:15–19:45 (Borrweg, Advanced-1 & 2), Thursday 17:30–19:00 (Wolfsblick, all groups), Friday 17:30–19:00 (Apfelbaum, all groups).
* Updated PostgreSQL schema in `database-schema.md` with `LOCATIONS` and `SEASON_TEMPLATES` tables, and `location_id` foreign key on `TRAINING_DAYS` and `SESSIONS` (bringing core Phase 1 table count to 16).
* Updated Wiki index (`wiki/index.md`) descriptions for updated requirement and planning pages.

## 2026-09-27 | phase-1.3-completion-and-ci-pipeline | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Completed Sub-Phase 1.3 (Seasons, Training Days, Hall Locations & Automatic Session Generation).
* Added database migration `20260927000000_seasons_locations_and_templates.sql` for `seasons`, `sports_hall_locations`, `season_templates`, `session_overrides`, `player_groups`, and `training_days`.
* Built UI components and hooks: `SeasonSetupModal`, `TemplateSelector`, `LocationManagerModal`, `SessionScheduleView`, `SessionCard`, and `SessionOverrideModal`.
* Enhanced schedule layout with ISO Calendar Week (KW) and Month grouping, filter dropdowns, and optimized vertical element spacing.
* Added complete test suite (52 Vitest unit tests, 7 Playwright E2E tests) and established GitHub Actions CI pipeline (`.github/workflows/ci.yml`).

## 2026-09-27 | phase-1-roadmap-reordering | Updated 3 pages: codebase/implementation-plan.md, wiki/index.md, wiki/log.md
* Deferred Sub-Phase 1.4 (Availability Surveys & Matrix Dashboard) to Phase 2 (Sub-Phase 2.1) to prioritize Trainer Session Assignments (Sub-Phase 1.4) and Substitutions (Sub-Phase 1.5).
* Updated Phase 1 implementation plan to a sequential 6-step roadmap (1.1 Foundation, 1.2 Auth & Roles, 1.3 Seasons & Sessions, 1.4 Assignments & Personal View, 1.5 Substitutions, 1.6 Polish & WebCal/PWA).
* Updated `wiki/index.md` and wiki documentation logs to reflect the re-ordered Phase 1 & Phase 2 roadmap structure.

## 2026-09-27 | phase-1.4-completion-and-1418-coach | Updated 3 pages: codebase/implementation-plan.md, wiki/index.md, wiki/log.md
* Completed Sub-Phase 1.4 (Trainer Session Assignments & Personal View).
* Renamed all UI occurrences of "Junior Coach" to "1418 Coach" to clarify youth player coach designation (aged 14 to 18 years old).
* Enhanced `SessionAssigneeModal` with a dynamic multi-coach assignment list (`+ Add Coach`, `Trash` delete) supporting dynamic numbers of coaches per session.
* Filtered 1418 Coach dropdown selection strictly to trainers holding the `is_junior_coach: true` profile designation.
* Updated `SessionCard` to dynamically render all assigned coaches with role badges (`Lead:`, `Assistant:`, or 🌱 `1418 Coach`).
* Updated Vitest unit test suite (68 tests passing) and marked Sub-Phase 1.4 milestone checkboxes as complete in `codebase/implementation-plan.md`.

## 2026-10-11 | test-suite-count-refresh | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Updated the "Testing Infrastructure" line in `codebase/implementation-plan.md` from the stale 39-test Vitest / 5-test Playwright counts to the current 68-test Vitest suite (13 files) and 8-test Playwright E2E suite (6 files), as of Sub-Phase 1.4.
* Counts verified by running `vitest run` (13 files, 68 tests passing) and `playwright test --list` (8 tests in 6 files).

## 2026-10-11 | phase-1-4-hardening | Added 1 page: codebase/known-issues.md | Updated 10 pages: codebase/architecture/database-schema.md, codebase/architecture/auth-and-onboarding.md, codebase/architecture/substitution-flow.md, codebase/risk-analysis.md, codebase/implementation-plan.md, requirements/sessions-and-assignment.md, requirements/views-and-notifications.md, requirements/overview-roles-auth.md, wiki/index.md, wiki/log.md
* Documented the Sub-Phase 1.4 review and hardening pass (code commit `00b0de9`, migrations `20261011000000`–`07`), grounded in the migrations and the web app code.
* `database-schema.md`: replaced the stale RLS matrix with the policies actually enforced (the previous last row was also corrupted); added sections for role helper functions, `SECURITY DEFINER` function authorization, the `protect_profile_admin_fields` trigger, the unique active-assignment index, the pgTAP permission tests (`pnpm test:db`), and the migration history. Corrected the table count to 16.
* `auth-and-onboarding.md`: documented the current invite implementation (isolated auth client, temporary password, `base64(email)` link) against the target design, its known limitations, the registration and profile access rules, the Super-admin-managed 14/18 Coach label, and the calendar feed implementation status.
* `risk-analysis.md`: added risk 8 (authorization bypass in the database layer; fixed, with standing rules) and risk 9 (weak invitation and open registration; open).
* `implementation-plan.md`: added Sub-Phase 1.4b with delivered work and milestones; replaced non-existent migration filenames (`01_profiles.sql`, `08_assignments.sql`, `09_substitutions.sql`, `10_`/`11_`, `07_availability.sql`) with the real ones (all base tables come from the initial schema); corrected component names (`SessionAssigneeModal`, `InviteModal`, `useAuth.tsx`); fixed the broken Table of Contents link for 1.3; recorded open design decisions for 1.5; updated test counts to 76 Vitest / 10 Playwright / 77 pgTAP checks.
* Requirements pages: recorded the implementation decisions that bulk assignment is additive and upcoming-only, season regeneration is refused once sessions are in use, regular trainers default to "My Sessions" while still able to read all assignments, and the 14/18 Coach label is Super-admin managed.
* `substitution-flow.md`: added the authorization requirements for Sub-Phase 1.5.
* Created `codebase/known-issues.md` as a living list of open problems (security, correctness, missing features, testing, plan gaps for 1.5/1.6) with a record of resolved items.
* Not verified in this pass: a from-scratch run of all migrations on an empty local database (CI will do this on the next push).

## 2026-10-11 | design-prototype-and-plan-streamline | Updated 8 pages: codebase/implementation-plan.md, codebase/known-issues.md, codebase/architecture/substitution-flow.md, requirements/sessions-and-assignment.md, requirements/views-and-notifications.md, requirements/non-functional-requirements.md, wiki/index.md, wiki/log.md
* Read the Modernist design prototype `pocke-coach-design-prototype/PocketCoach.dc.html` (script section, design-system stylesheet and readme) from the local copy, because the design import tool lacked authorization. The prototype was not rendered; findings come from its code and tokens. The folder name contains a typo ("pocke").
* `implementation-plan.md` rewritten and streamlined: delivered sub-phases 1.1–1.4b condensed into one table; new execution order (gate, 1.4c data foundations, 1.4d Modernist UI and localization, 1.6a notifications and server-side invites, 1.5 substitutions, 1.6b calendar and offline, pilot readiness gate, Phase 2.1); design reference with a screen-by-screen Phase 1 treatment; schedule of known issues by sub-phase; list of details still to confirm.
* Recorded five product decisions: no availability survey yet (Phase 2.1 after the pilot); gaps defined by coverage against staffing targets; assignments are published and trainers see only published sessions; session log and counts matter for later pay-outs (read-only log now, CSV export, audit trail and mistake reporting deferred); light mode only.
* `known-issues.md`: plan gaps marked decided or open; link to where each issue is scheduled.
* `substitution-flow.md`: added the coverage-based gap definition, published-only visibility, session-row locking, eligibility rules and counting rules.
* Requirements pages: added staffing targets, published assignments, coverage-gap note, session log, and light-mode-only decision notes (original requirement wording unchanged).
* Details proposed but not confirmed are listed in the plan under "Details to Confirm" (staffing target values, label exclusivity, unpublish, grouped publish notification, undo, escalation record, invite expiry, preference semantics).

## 2026-10-11 | language-toggle | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Clarified from the design prototype that every user can toggle between English and German. Added to the plan: the toggle on the login and invite screens and in Settings (applies immediately, saved in `profiles.preferred_language` after sign-in); translated error messages via stable database error codes (1.4c, 1.4d); in-app notifications translated in the viewer's language and push text generated in the recipient's language (1.6a); invitee language on the invitation with English and German invite email templates (1.6a); calendar feed text in the trainer's language and a two-language sign-off walkthrough (1.6b).
* Two details to confirm were added: the default language for unsupported browser languages, and whether hall notes are stored once or per language.

## 2026-10-11 | gate-done | Updated 3 pages: codebase/implementation-plan.md, codebase/known-issues.md, wiki/log.md
* Marked step 0 (Gate) of the implementation plan as done: `pnpm supabase:reset` applied all 13 migrations and `seed.sql` to an empty local database; `pnpm test:db` passed 77 of 77 checks; format, typecheck, 76 unit tests and 10 end-to-end tests passed; lint reported 0 errors and the existing 73 warnings. The remote GitHub CI run has not been observed yet.
* `known-issues.md`: moved T2 (fresh-database run) to Recently Resolved; added T4 (three `availability_responses` policy names are truncated at Postgres' 63-character limit; shorten before Sub-Phase 2.1).
* The reset also cleared local test users created by earlier invite and end-to-end runs.

## 2026-10-11 | sub-phase-1-4c-decisions | Updated 4 pages: codebase/implementation-plan.md, codebase/known-issues.md, requirements/sessions-and-assignment.md, wiki/log.md
* Recorded three decisions for Sub-Phase 1.4c in the plan: confirmed staffing targets (Tuesday, Thursday, Friday 3 regular + 1 14/18 coach; both Wednesday slots 2 regular + 1 14/18 coach); a 14/18 label change is blocked while the person has upcoming active assignments on the other track; unpublish is included (`unpublish_sessions`, only for sessions that have not started and have no substitution requests).
* Added the per-track limits detail (maxima 3 and 2, active assignments only, bulk assign skips full sessions) and new milestones. "Details to Confirm" now lists the hard caps and label exclusivity as assumptions; the staffing, label-change and unpublish items were removed as decided.

## 2026-10-11 | sub-phase-1-4c-delivered | Updated 7 pages: codebase/implementation-plan.md, codebase/known-issues.md, codebase/architecture/database-schema.md, codebase/architecture/auth-and-onboarding.md, requirements/sessions-and-assignment.md, wiki/log.md
* Delivered Sub-Phase 1.4c (data foundations) in migrations `20261012000000`–`02`, with matching web changes. Staffing targets (`required_regular`, `required_junior`) on training days and sessions, backfilled and added to the template: Tuesday, Thursday and Friday 3 + 1, Wednesday 2 + 1. Hall `address` and `trainer_note`. Stable database error codes replace English sentences (mapped in `lib/dbErrors.ts`).
* New rules: triggers cap active assignments at 3 regular and 2 14/18 per session and tie the junior track to the 14/18 label; a label change is blocked while upcoming active assignments exist on the track it would invalidate. `bulk_assign_trainer` skips full sessions. New atomic `set_session_assignments` (fixes the trainer swap) and `set_user_roles`.
* Publishing: `sessions.published_at` (existing sessions backfilled as published, generated sessions start as drafts), published-only read rules for trainers on sessions, session player groups, assignments and substitution requests, `publish_sessions` and `unpublish_sessions` (only sessions that have not started and have no substitution requests).
* Web: season wizard staffing-target inputs, hall address and note editing, one-call assignee save, Role Manager on `set_user_roles`, bulk assign follows the trainer's label, Draft badge and Publish dialog.
* Tests at the end of 1.4c: 88 Vitest (16 files), 11 Playwright (8 files, including a new publishing flow that creates and deletes a throwaway season), 138 pgTAP checks (4 files); lint 0 errors (66 warnings), typecheck and formatting clean.
* `database-schema.md` updated (ER diagram, RLS matrix, functions, triggers, error codes, migration history). Known issues C1–C4 moved to resolved. The hard caps and label exclusivity were implemented as assumed and remain to be confirmed with the club.
* From-scratch verification after 1.4c: `pnpm supabase:reset` applied all 16 migrations and the seed to an empty local database; `pnpm test:db` passed 138 of 138 and the Playwright suite passed 11 of 11. The local development season was rebuilt afterwards from the Standard Junior Season template (260 sessions, published).

## 2026-10-11 | test-coverage-review | Updated 4 pages: codebase/implementation-plan.md, codebase/known-issues.md, wiki/index.md, wiki/log.md
* Reviewed test coverage after Sub-Phase 1.4c. Baseline: 88 unit tests (50.2 % statements, 46.0 % branches, 44.1 % functions, measured with a temporary coverage plugin that was not kept), 11 Playwright tests, 138 pgTAP checks.
* Findings: write permissions on seven core tables are untested (permissive write policies left all database checks green); no end-to-end test performs an assignment (the assign step is skipped on an empty database); the roles end-to-end test saves nothing; central hooks and pages have 0 % unit coverage; `createSeason` has no rollback; end-to-end setup is fragile (English text selectors, 2 parallel workers).
* Added Sub-Phase 1.4t (Test Hardening) to the plan, between 1.4c and 1.4d, with work items, deferred items, a milestone checklist and the execution order renumbered (1.4t is step 2). Includes an atomic `create_season` function, a shared end-to-end season helper, real assignment and role flows, hook tests, English locale and serial season specs, and a non-blocking coverage summary in CI.
* `known-issues.md`: added C6 and T5-T9, scheduled in 1.4t; T1 moved from 1.4d to 1.4t. 1.4d keeps the tests that belong with its new components.

## 2026-10-11 | sub-phase-1-4t-delivered | Updated 5 pages: codebase/implementation-plan.md, codebase/known-issues.md, codebase/architecture/database-schema.md, codebase/risk-analysis.md, wiki/log.md
* Delivered Sub-Phase 1.4t (test hardening) in migrations `20261012000003` and `04` and the test suites. Database: `write_policies` and `season_creation` tests (222 pgTAP checks in 6 files), atomic `create_season`. Web: unit tests for `useSeasons`, `useSessions`, `useAuth`, `useLocations`, `useTrainers` and the route guards (127 Vitest tests, statement coverage 50.2 % to 67.1 %, the listed hooks 87-100 %); `createSeason` now makes one call. End-to-end: shared helpers with API-created throwaway data, real flows for assignment (limit refusal, additive bulk assign), roles and label (guard, own Super-admin role), hall details, publishing; English locale and Zurich time; season specs in their own Playwright project; 13 tests pass with 2 workers, also on an empty database. `pnpm test:coverage` runs in CI with a summary and no thresholds.
* Findings while implementing: (1) the `session_assignments` insert policy still allowed anonymous inserts (`OR auth.role() = 'anon'`, since Sub-Phase 1.4); fixed in `20261012000003`. (2) The assignee dialog showed an editable form before loading and then discarded early choices; fixed in `useSessionAssignments`. (3) `PersonalStatsCard` and `usePersonalStats` have never been rendered, so the 1.4 stats milestone was ticked in error; scheduled in 1.4d as known issue C7.
* Verified by breaking things on purpose: permissive write policies now fail 34 database checks (none before); disabling the assignment-limit trigger or the label guard fails the corresponding end-to-end flow; four code mutations in the new unit tests were each caught.
* `known-issues.md`: T1, T5-T9 and C6 resolved, new C7 open; `database-schema.md` and `risk-analysis.md` updated. The from-scratch run after 1.4t (18 migrations, seed, 222 database checks, 13 end-to-end tests) passed; the local development season was rebuilt afterwards with `create_season`.

<!-- END OF LOG -->
