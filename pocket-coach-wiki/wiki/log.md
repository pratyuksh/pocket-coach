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

## 2026-10-14 | login-page-plan-1-4d | Updated 3 pages: codebase/implementation-plan.md, codebase/known-issues.md, wiki/log.md
* Planned the 1.4d login page against the prototype: shared `AuthLayout` with split screen, EN | DE switch, flat form, invite acceptance in the same layout.
* Decisions: demo accounts and the shared development password appear in development builds only and are checked absent from the production bundle; "Forgot password?" is omitted until a reset flow exists (new known issue F3, scheduled in 1.6a); invite acceptance follows the design's three fields (no confirm-password).
* Added a login/invite milestone to 1.4d.

## 2026-10-14 | sub-phase-1-4d-foundation | Updated 1 page: wiki/log.md
* Started Sub-Phase 1.4d with the foundation (code in `apps/web`): Modernist tokens in `tokens.css` (Tailwind `@theme`, zero radius) with legacy variable aliases kept until each screen is migrated; Archivo self-hosted through `@fontsource/archivo`, Google Fonts links removed; light mode only (theme provider, toggle, tests and 176 `dark:` classes removed).
* Primitives restyled (`Button`, `Card`, `Spinner`, `Toast` with Undo, `Dialog`; `Modal` kept as an alias; legacy variant names still accepted) and added (`Tag`, `Field`/`Input`, `SegmentedControl`).
* i18n set up with `react-i18next`, typed keys, `locales/en` and `locales/de` (common and auth strings so far), `useLanguage` and `LanguageSync` (browser or saved choice before sign-in, `profiles.preferred_language` after), and a missing-key test. Unit tests: 137 passing.
* Finding: a `*/` inside a CSS comment (a path with `*`) ended the comment early and silently dropped the `@theme` block, so no new utilities were generated; found through the build warning. Replaced the second benefit row of the prototype (availability) with Phase 1 copy about published assignments.
* Not yet done in 1.4d: shell and navigation, the screens, remaining strings, login and invite pages (next), end-to-end updates.

## 2026-10-14 | sub-phase-1-4d-login-page | Updated 3 pages: codebase/implementation-plan.md, wiki/log.md
* Login and invite screens built on the 1.4d foundation: shared `AuthLayout` (wordmark, EN | DE switch, privacy line, three numbered benefits on desktop), flat labelled form, primary and secondary buttons, translated error messages by Supabase error code; invite acceptance with the design's three fields and the chosen language saved to the profile; `/register` redirects to `/login`; legacy auth CSS deleted. Unit tests 144, end-to-end 15 (new: wrong password, language switch, `/register` redirect), all passing.
* Development-only content: demo-account buttons on the login screen and the Dashboard's "Test Credentials" card now render only in development builds. New CI step `pnpm check:bundle` builds the app and fails if they appear in the bundle. The invite flow's temporary password (S1) remains until 1.6a.
* Seed accounts now use English (`preferred_language = 'en'`) so the English-locale end-to-end suite keeps working: signing in applies the profile's language.
* Found while checking screenshots: unlayered `* { padding: 0 }` and heading rules in `global.css` overrode Tailwind utilities (no padding anywhere, wrong heading sizes). Reset removed (Tailwind's preflight does it) and base rules moved into `@layer base`; this also gives the not-yet-migrated screens their padding back.
* Not done: no Google button on the invite screen (S3, waits for 1.6a); "Forgot password?" omitted (F3).

## 2026-10-14 | login-google-removed | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Decision: the Google sign-in button is left out of the login screen as well (it was already left out of the invite screen); it can return after the server-side invites of 1.6a. `GoogleOAuthButton`, its test and its strings were removed; the earlier version is in commit `057b89f`. Unit tests 141, end-to-end 15, all passing.

## 2026-10-14 | sub-phase-1-4d-shell-settings | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Built the Modernist app shell (sidebar, page header with season and calendar-week subtitle, mobile tab bar with account button, Phase 1 navigation without Availability) and the Settings page inside it (profile, language, calendar, season slots with the wizard, halls with address and note, sign-out). `TrainerProfileEditor` and its test removed. Unit tests 161, end-to-end 21 (new: navigation by role, name save, language switch across devices, season section, hall add and edit in Settings, phone shell), all passing.
* Behaviour changes from following the design: the 14/18 label and avatar URL can no longer be edited in Settings (label stays in Team); speciality only for Head-trainers and above; preferred language is the Language switch, not a form field.
* Fixes found on the way: `html, body { height: 100% }` made the body its own scroll container (now `min-height`); the end-to-end helper `createTrainer` created German profiles, which would turn the English-locale suite German after sign-in (now English).
* Not done: notification bell (1.6a), gap counts in the navigation (1.5), Dashboard, Sessions and Team screens in the new look (later in 1.4d). Not committed yet.

## 2026-10-14 | header-inbox-signout | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Page header now has the design's Inbox button (opens a notification drawer, empty until 1.6a; the unread badge is built but not shown) and, by decision, a Sign out button next to it. Settings keeps its Sign out button too. This deviates from the design, which has Sign out only in Settings. The earlier note that sign-out is Settings-only was corrected. Unit tests 164, end-to-end 22.

## 2026-10-14 | settings-email-fixed-text | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Settings: the email is now fixed text with a lock icon (accessible name "Can't be changed") instead of a read-only input that looked editable. No hint line, since there is no email-change flow to point to yet. Unit tests 164, end-to-end 22.

## 2026-10-14 | sub-phase-1-4d-team-page | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Team page in the new look: filters with counts, roster with role tags, Edit roles and Remove with confirmation, invite and role dialogs as checklists (new `CheckRow` primitive), all in English and German. The invite dialog no longer asks for name, base role or speciality (the design asks for the email and extra roles; the invitee sets their own name). Database error codes now come from the translation catalogs. `TrainerRoster`, `RoleManagerModal` and `InviteModal` tests and the invite, roles and new team end-to-end specs rewritten for the new UI.
* Not built: stat columns, profile page, team strip and CSV export (need the 1.5 definition of "completed" and the pay-out decisions), pending invites (1.6a), reactivate toggle.
* Follow-ups the same day: email addresses are no longer printed on the Team page, clicking a name copies the email; filters read "All (n)", "Trainers (n)" with the count in brackets; the selected segment of every segmented control (language switches, filters) is black as in the design, not red; the 86 leftover test accounts were deleted from the local database, and the end-to-end run now deletes its own `e2e…@club.de` accounts afterwards (local only, `e2e/global-teardown.ts`). Unit tests 178, end-to-end 30.

## 2026-10-14 | ghost-button-colour | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Ghost buttons ("New season", "Regenerate link", "Edit roles", ...) now use the plain accent `#ec3013` as in the design, not the darker `accent-700` (which stays for text links, error text and tag outlines). Trade-off recorded: 3.8 : 1 on the light ground, below WCAG AA for small text, like the primary button's own label. A check of the rendered colour was added to the end-to-end suite.

## 2026-10-14 | colour-rule | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Added the colour rule to the Design Reference: black = selected, red = do something (primary action and ghost buttons).

## 2026-10-14 | team-session-counts | Updated 3 pages: codebase/implementation-plan.md, codebase/architecture/database-schema.md, wiki/log.md
* Team page for Head-trainers and Super-admins now follows the design: columns Trainer, Assist., 14/18, Completed, Upcoming; summary strip; note on what is counted. Plain trainers see only the list. Fixed widths for the actions column keep the columns aligned.
* New migration `20261014000000_session_log_and_team_stats`: the `session_log` view (completed = active assignment on a published session that has ended in Europe/Zurich) and `team_session_stats(season_id)` (Head-trainer+ only). The definition was planned for 1.5; it now exists earlier because the Team page needs it. New pgTAP file `team_stats` (19 checks; 241 in total), unit tests 185, end-to-end 32.
* Not built: CSV export (still deferred), profile page.

## 2026-10-14 | team-profile-page | Updated 4 pages: codebase/implementation-plan.md, codebase/known-issues.md, codebase/architecture/database-schema.md, wiki/log.md
* Added the profile page the design opens from a Team row (`/trainers/:id`): counts, upcoming sessions, session log, details, and for Super-admins Edit roles and Remove. A whole row is the link. The copy-email-on-click shortcut and the per-row actions were removed (they only existed because the profile was missing). The page title is the person's name (new `usePageTitle`).
* New migration `20261014000001`: `team_session_stats(season, profile)` and `session_log` now let a trainer see only their own counts and log, Head-trainers and above everyone's (the design's "can see" rule, enforced in the database). pgTAP 248 checks; unit tests 198; end-to-end 34.
* Shared `Section` component moved from Settings to `components/ui`.
* Not built: CSV export, "Report a mistake", links from the profile's session rows to the session detail, reactivate toggle.

## 2026-10-14 | copy-deactivate-and-hosting | Updated 5 pages: codebase/implementation-plan.md, codebase/data-privacy-gdpr.md, codebase/architecture/system-architecture.md, wiki/log.md
* Profile page: "Remove from the team" is now "Deactivate account" (button, confirmation dialog and messages; "Konto deaktivieren" in German). Behaviour is unchanged: the account is deactivated and its roles removed.
* Login and invite screens now say "Hosted in Switzerland" (was Frankfurt). The wiki documents the production database region accordingly: Zurich (`eu-central-2` at Supabase) instead of Frankfurt, with a note to confirm availability and the data-protection basis when the production project is created. The earlier plan was EU-only.

## 2026-10-28 | sub-phase-1-4d-home-dashboard | Updated 3 pages: codebase/implementation-plan.md, codebase/known-issues.md, wiki/log.md
* Built Home and Dashboard in the Modernist look (`features/home/`). Trainers get their home (next session with co-trainers, upcoming list, season counts, calendar card); Head-trainers and Super-admins get the Dashboard (tiles for calendar week, coverage and open gaps, gap list, own next session, workload). Details under "Home and Dashboard" in the implementation plan.
* Decision while building: coverage and gaps are computed over all published, upcoming sessions, not just the active season, matching the gap rule of 1.5. The Dashboard's workload and the personal counts stay per current season.
* Removed the old placeholder dashboard (hero, "Test Credentials" card), `PersonalStatsCard`, `usePersonalStats` and the `PersonalStats` type. Known issue C7 closed. The trainer's home title is now "Hi {name}", so the language end-to-end test expects a "Hallo …" heading.
* Not built (waits for later sub-phases): open-gap card, "Can't make it", "Recently filled", working Assign (1.5); "Add to calendar" (1.6b); survey card (2.1). Unit tests 212, end-to-end 40, bundle check passes. Not committed yet.

## 2026-10-28 | home-dashboard-revisions | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Home is called "Dashboard" for every role (navigation, page title, tab bar); the trainer's greeting title and the "My sessions" label are gone. A 14/18 coach no longer sees the "As substitute" count on the home.
* Reversed the decision of the same day to count gaps over all seasons: the Dashboard now reads the active season only (stale gaps of old seasons are not relevant). It lists the next five gaps and adds a month calendar that marks days with a gap (red) and fully staffed days (black). The "Show all" toggle is replaced by "+ n more, see the calendar".
* Unit tests 215, end-to-end 41 (the gap test makes its throwaway season active and restores the previous active season afterwards). Not committed yet.

## 2026-10-28 | trainer-home-coverable-gaps | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* The trainer home (also for 14/18 coaches) now shows "Open gaps you can cover": gaps of the active season on the person's own track, on sessions they are not on and that do not overlap another of their sessions that day. Read-only for now; Volunteer and the "reason when disabled" text arrive with 1.5, so the card was pulled forward from 1.5 without its action. `useCoverage` now also returns the people on each session.
* Unit tests 221, end-to-end 42. Not committed yet.

## 2026-10-28 | dashboard-calendar-removed | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Removed the gap calendar from the Dashboard (decision: it belongs on the Gaps page, where it can show more detail in 1.5). The list keeps the next five gaps and ends with "+ n more in Gaps →", a link to the Gaps page. `GapCalendar`, the `monthTitle` date helper and the per-day data in `useCoverage` are deleted; the calendar can be rebuilt from the plan's description when the Gaps page is built. Gaps that have ended stay hidden (no grace day). Unit tests 219, end-to-end 42. Not committed yet.

## 2026-10-28 | dashboard-recently-filled-my-next | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Dashboard: the link under the gap list now reads "See all gaps →" (no count). Added the design's "Recently filled" block, read from filled `substitution_requests` (who covered for whom, date, how long ago; it shows "Nothing has been filled yet." until 1.5 creates substitutions). "My next session" is now always shown, with "Nothing assigned to you yet." when the viewer has no session (it was hidden before, which looked like it was missing). New `timeAgo` date helper. Unit tests 223, end-to-end 43. Not committed yet.

## 2026-10-28 | dashboard-14-day-gaps | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Dashboard "Open gaps" counts, and the gap list shows, only the gaps of the next 14 days (today plus 13 days; subtitle "Next 14 days", same as the Gaps page). Coverage % still covers all upcoming (not yet ended) sessions of the active season, and its subtitle now says "upcoming slots filled". The trainer's "gaps you can cover" card is unchanged (all upcoming gaps). New `addDaysToDate` helper. Unit tests 225, end-to-end 44. Not committed yet.

## 2026-10-28 | sub-phase-1-4d-sessions | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Built the Sessions screens in the Modernist look: list with hall filter, "Only mine", week chips and a month calendar; session detail (`/sessions/:id`) with the people per track, open slots, hall address, and for Head-trainers Assign, Change time or hall, Delete. The assign, override, publish and bulk-assign dialogs were restyled and translated; the assignment candidates are sorted by fewest sessions. Details under "Sessions" in the implementation plan.
* Deviation: a season selector is shown when there is more than one season. Drafts show a "Draft" tag to Head-trainers.
* Moved "Delete season" and hall deactivate/activate to Settings. Removed `SessionCard`, `SessionScheduleView`, `MySessionsList` and `useMySessions`. `LocationManagerModal` stays only because the season wizard still uses it.
* Found while testing: the assignment-flow end-to-end test asserted that the throwaway session appears among a trainer's next six sessions on the home; with a developer's own data (a trainer assigned to the whole real season) it can be pushed out, so the test no longer asserts that. New `Select` form control, `weekStart` and `monthTitle` date helpers. Unit tests 247, end-to-end 44. Not committed yet.

## 2026-10-28 | sessions-weeks-active-season-bulk-cap | Updated 4 pages: codebase/implementation-plan.md, codebase/architecture/database-schema.md, requirements/sessions-and-assignment.md, wiki/log.md
* Sessions: the week chips now start at the current calendar week and show five weeks (this one and the next four), with ← → arrows instead of a scroll bar; weeks before the current one are no longer listed. The list shows the current (active) season only, so the season selector is gone (older seasons will be archived later). Drafts stay visible to Head-trainers.
* Bulk assign no longer assigns more people than a session requires: new migration `20261028000000_bulk_assign_respects_staffing` uses each session's `required_regular` / `required_junior` instead of the global maximum (3 / 2). The preview counts only sessions with an open position, and a notice reports the result. New pgTAP checks; new unit and end-to-end checks.
* Several end-to-end specs make a throwaway season the active one and restore the previous one, so the suite now runs on a single worker. Unit tests 255, end-to-end 45. Not committed yet.
* Note: some database checks depend on what is in the database. team_stats 4 and 23 assume no other assignments (they pass after a reset). permissions 44 inserted a duplicate for every active assignment of a trainer, in any season, so it failed as soon as that trainer had assignments elsewhere; it is now limited to the test's own season (2026-10-28).

## 2026-10-28 | sessions-open-slots-compact-weeks | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Week chips are compact (the strip is as wide as its five chips). The calendar legend says "Short of trainers" / "Zu wenig Trainer".
* Removed the Assign button and the assign dialog from the session detail. For Head-trainers and above the open slots are clickable and open a list of people who are free at that time, have the right role for the track and are not on the session yet, fewest sessions first; picking one saves at once. Each person also has a Remove button. New `useAvailableTrainers` and `OpenSlotDialog`; `SessionAssigneeModal` and `useSessionAssignments` are deleted. The role of a new trainer is chosen automatically (lead for the first trainer, assistant after that), which the old dialog let the user choose.
* The assignment end-to-end test uses a season far in the future, because people with another session at the same time are not offered; it now covers the open-slot flow, filling a track, and Remove. Unit tests 262, end-to-end 45. Not committed yet.

## 2026-10-28 | sessions-reduce-open-slots | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Head-trainers and above can take an open slot away from one session ("Remove slot", lowers `required_regular` / `required_junior`) and add it back ("Add slot", up to 3 trainers / 2 coaches), for sessions that need fewer people than usual. Only that session changes. A filled slot cannot be removed. Gaps, coverage, the Dashboard and bulk assign use the new number.
* End-to-end teardown now also deletes leftover `E2E …` seasons and, if no season is active afterwards, reactivates the most recent one. Reason: a test that times out cannot clean up its own season (its API client is already closed), which left a throwaway season active and the real season deactivated on a developer's database once. Unit tests 269, end-to-end 46. Not committed yet.

## 2026-10-28 | sessions-calendar-all-weeks | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Reversed the part of the earlier change that hid past weeks: only the week chips start at the current calendar week. The month calendar again covers every session of the current season (first to last month with a session), and picking an earlier week moves the chips there; the left arrow then goes back as far as the first week of the season. Coverage, "Only mine" and the hall filter work on past weeks too. The open-slot hint reads "Assign" instead of "Assign →". Unit tests 270, end-to-end 47. Not committed yet.

## 2026-10-28 | e2e-date-format-ci-fix | Updated 1 page: wiki/log.md
* Fixed CI failures in the Home end-to-end specs: they compared on-screen dates with text built in Node ("Thu 29 Oct"), but the CI browser writes "Thu, 29 Oct". The specs now match sessions and gaps by a `data-session-date` attribute (added to the next-session, upcoming-session and coverable-gap items) and no longer depend on how a machine formats dates. The other CI failures came from an earlier commit and are already gone: the home list assertion in the assignment flow was removed, and the suite runs on one worker so specs that switch the active season cannot overlap. Unit tests 270, end-to-end 47. Not committed yet.

## 2026-10-28 | season-wizard-modernist | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Rebuilt the season wizard (`SeasonSetupModal`, `TemplateSelector`, `TrainingDayRow`) in the Modernist look with English and German; labels used by the end-to-end specs are unchanged. Removed the embedded hall manager (`LocationManagerModal`, deleted): halls are managed in Settings. Template cards now show the template's real counts. Fixed a bug: the blank schedule could not be chosen because an effect re-selected the default template. New `weekdayLong` date helper. Unit tests 275, end-to-end 47. Not committed yet.

## 2026-10-28 | e2e-no-season-ci-fix | Updated 1 page: wiki/log.md
* Fixed two more CI failures with the same cause: a fresh database (CI) has no season, so the app falls back to the most recent one. "A trainer sees the sessions … Only mine" relied on a season that exists on a developer's machine and now creates and publishes its own (and checks "Only mine" against an assigned session). "Gaps of an inactive season are not shown" had an inactive season as the only (so the fallback) season; it now creates an older inactive and a newer active season and checks that only the active one's gaps appear. The whole suite also passes with no active season. Unit tests 275, end-to-end 47. Not committed yet.

## 2026-10-28 | availability-page-removed | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Removed the Availability placeholder page and its `/availability` route: it was legacy-styled, English-only, showed sample content and was reachable by URL although it is not in the navigation. It returns with Phase 2.1 (the shared availability types stay). Unit tests 275. Not committed yet.

## 2026-10-28 | gaps-page-modernist | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Rebuilt the Gaps page in the Modernist look with English and German: the gaps of the next 14 days as rows that open their session, an empty state and "Recently filled". It replaces the legacy placeholder with hard-coded sample gaps. Read-only until 1.5 (no Volunteer). `RecentlyFilledSection` is shared with the Dashboard; `gapsWithin` / `GAP_WINDOW_DAYS` are shared too. New `gaps.spec` end-to-end test (own throwaway season; runs in the seasons project). Unit tests 282, end-to-end 48. Not committed yet.

## 2026-10-28 | sub-phase-1-4d-done | Updated 2 pages: codebase/implementation-plan.md, wiki/log.md
* Closed Sub-Phase 1.4d. Deleted the legacy styling helpers (`Card`, `Badge`, the `Modal` alias, the old `Button` variants) and the legacy CSS variable aliases (the scrollbar now uses the Modernist tokens). Database errors without a code now fall back to a translated generic message instead of English text.
* New `e2e/screens.spec.ts` covers the milestone across screens: every screen as trainer and Head-trainer at phone and desktop width (light ground, no rounded corners, nothing sticking out sideways), no request to Google Fonts, German titles. While writing it I found that the old "fits the phone" check could never fail, because the page hides horizontal overflow, so it now looks for elements that stick out of the viewport (checked with a deliberately wide element). Milestone items ticked in the plan. Unit tests 283, end-to-end 53. Not committed yet.

<!-- END OF LOG -->
