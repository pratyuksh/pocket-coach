# Implementation Plan (Phase 1)

**Summary**: Sequential, testable 6-step implementation plan for PocketCoach Phase 1 (Sessions & Trainer Management), covering sub-phases 1.1 through 1.6 with explicit component changes, database migrations, and testable milestones for each phase. Availability Surveys & Matrix Dashboard are deferred to Phase 2.

**Sources**: None

**Last updated**: 2026-09-27

---

## Table of Contents
- [Overview & Workflow](#overview--workflow)
- [Sub-Phase 1.1: Project Setup & Monorepo Foundation](#sub-phase-11-project-setup--monorepo-foundation)
- [Sub-Phase 1.2: Authentication, User Profiles & Role Management](#sub-phase-12-authentication-user-profiles--role-management)
- [Sub-Phase 1.3: Seasons, Training Days & Automatic Session Generation](#sub-phase-13-seasons-training-days--automatic-session-generation)
- [Sub-Phase 1.4: Trainer Session Assignments & Personal View](#sub-phase-14-trainer-session-assignments--personal-view)
- [Sub-Phase 1.5: Smart Substitutions & Race-Condition Guard](#sub-phase-15-smart-substitutions--race-condition-guard)
- [Sub-Phase 1.6: Notifications, Calendar Sync, Offline & i18n Polish](#sub-phase-16-notifications-calendar-sync-offline--i18n-polish)
- [Phase 2: Availability Surveys & Matrix Dashboard](#phase-2-availability-surveys--matrix-dashboard)
- [Verification & Acceptance Summary](#verification--acceptance-summary)

---

## Overview & Workflow

The Phase 1 implementation is broken down into **6 incremental sub-phases**. Each sub-phase produces a fully compiled, testable version of the application before proceeding to the next.

```mermaid
flowchart TD
    SP1["Sub-Phase 1.1: Foundation & Monorepo"] --> SP2["Sub-Phase 1.2: Auth, Profiles & Roles"]
    SP2 --> SP3["Sub-Phase 1.3: Seasons & Session Generation"]
    SP3 --> SP4["Sub-Phase 1.4: Trainer Session Assignments"]
    SP4 --> SP5["Sub-Phase 1.5: Substitutions & Conflict Guard"]
    SP5 --> SP6["Sub-Phase 1.6: Notifications, Calendar, Offline & i18n"]
```

---

### Sub-Phase 1.1: Project Setup & Monorepo Foundation

**Goal**: Establish the Turborepo monorepo, design tokens, UI layout primitives, and local Supabase development environment with automated test seed data.

#### Proposed Changes

##### Root & Monorepo Config
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`

##### `packages/shared-types`
- TypeScript definitions for database models, roles, and API DTOs

##### `packages/supabase`
- Supabase CLI configuration, local migration scripts
- `seed.sql`: Pre-populated test accounts (`admin@club.de`, `headtrainer@club.de`, `trainer1@club.de`, `junior1@club.de`) for instant testing after each sub-phase

##### `apps/web` (React 19 + Vite)
- Design token CSS variables (`src/styles/tokens.css`, `src/styles/global.css`)
- Layout components: `Shell`, `Header`, `Sidebar`, `BottomNav`
- Router setup (`React Router v7`) with placeholder routes
- UI primitives: `Button`, `Card`, `Modal`, `Badge`, `Spinner`, `Toast`

#### Testable Milestone 1.1
- [x] Run `pnpm dev` → launches app shell with responsive sidebar (desktop) and bottom nav (mobile).
- [x] Run `supabase start` → local Postgres DB starts with pre-populated test accounts in `seed.sql`.
- [x] Run `pnpm build` → clean compilation across all monorepo workspaces.

---

### Sub-Phase 1.2: Authentication, User Profiles & Role Management

**Goal**: Implement email/password login, Google OAuth, Super-admin user invitation flow, profile management, and role-based permissions (Trainer, Head-trainer, Super-admin).

#### Proposed Changes

##### Database Migrations (`packages/supabase/migrations/`)
- `01_profiles.sql`: Create `profiles` table (`id`, `display_name`, `email`, `avatar_url`, `specialty`, `is_junior_coach`, `is_active`, `preferred_language`, `calendar_token`)
- `02_user_roles.sql`: Create `user_roles` table (`id`, `profile_id`, `role`, `granted_at`, `granted_by`)
- `20260913000000_tighten_auth_rls.sql`: Strict Row-Level Security (RLS) policies for `profiles` and `user_roles` using `is_super_admin` `SECURITY DEFINER` helper function

##### Web Application (`apps/web/src/features/`)
- `features/auth/`: `LoginForm`, `RegisterForm`, `InviteForm`, `GoogleOAuthButton`
- `features/trainers/`: `TrainerRoster`, `TrainerProfileEditor`, `RoleManagerModal`
- `lib/supabase.ts`: Supabase client setup with auth session listener
- `hooks/useAuth.ts`, `hooks/usePermissions.ts`: Permission evaluation hooks

#### Google OAuth Note
- **Local Dev vs Production Configuration**: `GoogleOAuthButton` triggers `supabase.auth.signInWithOAuth({ provider: 'google' })`. To enable live external Google Sign-In redirects locally, Google OAuth Client ID and Secret must be added to `packages/supabase/config.toml` under `[auth.external.google]`. Unit tests (`GoogleOAuthButton.test.tsx`) mock and verify provider parameter dispatch cleanly.

#### Additional Implemented Features in Phase 1.2
- **Live Calendar Feed Sync (WebCal)**: Integrated WebCal subscription feed URL display and 1-click token regeneration ("Regenerate Link") in `TrainerProfileEditor.tsx` (`/settings`).
- **Dashboard Management Shell (`/dashboard`)**: Operational status hero banner, active user metrics, system health indicator, and route shortcuts.
- **Preview Page Shells**: Page structures for Training Sessions (`/sessions`), Availability Survey Matrix (`/availability`), and Substitution Gaps (`/substitutions`).
- **Glassmorphism Design System & Theme Engine**: CSS token variables (`tokens.css`, `global.css`), dark/light mode toggle (`useTheme.tsx`), and UI primitives (`Button`, `Card`, `Badge`, `Modal`, `Toast`, `ThemeToggle`).
- **Developer Ergonomics**: Demo account 1-tap quick fill buttons (`LoginForm.tsx`), base64 setup link generator (`InviteModal.tsx`), and root helper script `pnpm supabase:reset`.
- **Testing Infrastructure**: Comprehensive 39-test Vitest suite (`apps/web/src/test/`) and 5-test Playwright E2E suite (`apps/web/e2e/`).

#### Testable Milestone 1.2
- [x] Super-admin logs in and invites a new trainer via email (`/trainers`).
- [x] Inbucket local email dashboard (`http://localhost:54324`) captures the invitation link.
- [x] Invited trainer opens invitation link (`/invite/:token`), completes registration, and gets the base **Trainer** role automatically.
- [x] Trainer edits display name, avatar, and free-text "Responsibility / Speciality" in `/settings`.
- [x] Super-admin grants **Head-trainer** role to a user; elevated permissions unlock immediately without re-login.
- [x] Trainer views personal WebCal feed link and regenerates calendar token in `/settings`.
- [x] Postgres database enforces strict role-based RLS policies for `profiles` and `user_roles`.

---

### Sub-Phase 1.3: Seasons, Training Days, Hall Locations & Automatic Session Generation

**Goal**: Configure training seasons, sports hall locations, default season templates, and weekly training days, and automatically batch-generate session records (with hall locations and player groups attached) for the entire season date range.

#### Proposed Changes

##### Database Migrations (`packages/supabase/migrations/`)
- `20260927000000_seasons_locations_and_templates.sql`:
  - Create `locations` table (`id`, `name`, `district_area`, `is_active`) and seed default 3 halls (*Sporthalle Schulhaus Apfelbaum (Oerlikon)*, *Sporthalle Borrweg (Friesenberg)*, *Sporthalle Wolfsblick (Zürich-Affoltern)*).
  - Create `season_templates` table (`id`, `name`, `description`, `is_default`, `template_data`) and seed `Standard Junior Season` schedule template.
  - Add `location_id` foreign key to `training_days` and `sessions`.
  - Database stored procedure `generate_season_sessions(p_season_id UUID)` to auto-populate `sessions` (including date, times, location, and player groups) for all configured training day slots in the season date range.

##### Web Application (`apps/web/src/features/`)
- `features/locations/`: `LocationManagerModal` (view/edit hall locations per season).
- `features/seasons/`: `SeasonSetupModal` (wizard supporting 1-click `Standard Junior Season` template application, location select per slot, and custom schedule adjustment).
- `features/sessions/`: `SessionScheduleView` (chronological session schedule filterable by Hall Location, Day of Week, and Group), `SessionCard` (location badge & group tags), `SessionOverrideModal` (single session time/location/group override).

#### Standard Default Junior Schedule
- **Tuesday (17:30 – 19:00)**: All Groups (`Kids / Basic`, `Advanced-1`, `Advanced-2`) @ *Sporthalle Schulhaus Apfelbaum (Oerlikon)*
- **Wednesday Slot 1 (17:30 – 18:30)**: Beginner Level (`Kids / Basic`) @ *Sporthalle Borrweg (Friesenberg)*
- **Wednesday Slot 2 (18:15 – 19:45)**: Intermediate / Advanced Level (`Advanced-1`, `Advanced-2`) @ *Sporthalle Borrweg (Friesenberg)*
- **Thursday (17:30 – 19:00)**: All Groups (`Kids / Basic`, `Advanced-1`, `Advanced-2`) @ *Sporthalle Wolfsblick (Zürich-Affoltern)*
- **Friday (17:30 – 19:00)**: All Groups (`Kids / Basic`, `Advanced-1`, `Advanced-2`) @ *Sporthalle Schulhaus Apfelbaum (Oerlikon)*

#### Testable Milestone 1.3
- [x] Head-trainer creates a Season (e.g. Aug 1 – Jul 31) using the **Standard Junior Season** default template.
- [x] Form pre-fills 3 hall locations, player group levels, and 5 weekly training slots (Tue, Wed x2, Thu, Fri).
- [x] System automatically batch-generates all session records for every configured weekday slot in that date range with hall locations and player group linkages.
- [x] Head-trainer browses `/sessions`, filters by Hall Location, and sees the auto-generated schedule.
- [x] Head-trainer overrides time or location for a specific holiday/event session.

---

### Sub-Phase 1.4: Trainer Session Assignments & Personal View

**Goal**: Enable Head-trainers to assign trainers to sessions directly from session cards or via a bulk recurring assignment tool across 2 independent tracks, and provide trainers with their personal "My Sessions" schedule and statistics breakdown.

#### Proposed Changes

##### Database Migrations (`packages/supabase/migrations/`)
- `08_assignments.sql`: Create `session_assignments` (`id`, `session_id`, `profile_id`, `track`, `session_role`, `status`, `is_substitute`, `assigned_at`, `assigned_by`)

##### Web Application (`apps/web/src/features/`)
- `features/sessions/`:
  - `SessionCardAssigneeModal`: Select a session card on `/sessions` to view, assign, or unassign Primary Trainer (Track 1) and Junior/Assistant Coach (Track 2).
  - `BulkAssignModal`: Select a trainer and recurring weekday/location pattern (e.g. "Assign Trainer A to all Friday sessions at Schulhaus Apfelbaum") to batch-assign in 1 click.
  - `MySessionsList`: Chronological view of user's own upcoming assigned sessions.
  - `PersonalStatsCard`: Breakdown by role (Trainer, Assistant-coach, 14/18 Coach, Total) showing Completed vs. Total Assigned.

#### Testable Milestone 1.4
- [x] Head-trainer assigns regular trainers and 14/18 coaches via direct session card detail modals and the Bulk Assign tool.
- [x] Assigned trainers navigate to "My Sessions" and see their schedule highlighted.
- [x] Personal session stats update dynamically on the trainer's profile page and Trainer Roster.

---

### Sub-Phase 1.5: Smart Substitutions & Race-Condition Guard

**Goal**: Implement the substitution workflow — flagging unavailability, broadcasting open gaps across a top-level home banner, dedicated gaps list, and session badges, volunteer confirmation via PostgreSQL `SELECT FOR UPDATE` transactions, and 48-hour escalation.

#### Proposed Changes

##### Database Migrations & Functions (`packages/supabase/`)
- `09_substitutions.sql`: Create `substitution_requests` (`id`, `session_id`, `original_trainer_id`, `volunteer_id`, `track`, `status`, `created_at`, `filled_at`, `escalated_at`)
- `functions/volunteer_substitution.sql`: PostgreSQL stored function using `SELECT FOR UPDATE` to lock request row, check no double-booking for volunteer, update original assignment status to `replaced`, mark request `filled`, and insert new volunteer assignment (`status='active'`, `is_substitute=true`).
- `pg_cron` schedule: Hourly check firing Edge Function `escalation-check` for gaps open within 48h.

##### Web Application (`apps/web/src/features/`)
- `features/substitutions/`:
  - `FlagUnavailableButton`: Updates assignment status to `absent_pending_sub` and creates substitution request.
  - `HomeGapBanner`: High-visibility top-level alert banner on home screen for open gaps within the next 7 days.
  - `OpenGapsList`: Dedicated tab listing unstaffed session gaps.
  - `VolunteerButton`: Triggers transaction; displays instant confirmation or error toast if slot was filled by someone else.

#### Testable Milestone 1.5
- [ ] Trainer A flags unavailability → status becomes `absent_pending_sub`, home alert banner appears for gaps within 7 days, and entry appears in "Open Substitution Gaps".
- [ ] Trainer B clicks "Volunteer" → transaction confirms B immediately (status `replaced` for A, new `is_substitute` assignment for B).
- [ ] Simultaneous test: Two windows click "Volunteer" at the exact same millisecond → exactly one succeeds, the other gets a clear "Already filled" notification.
- [ ] 48h Gap Escalation: A gap left open < 48h before a session triggers an escalation alert for Head-trainers.

---

### Sub-Phase 1.6: Notifications, Calendar Sync, Offline & i18n Polish

**Goal**: Integrate FCM push notifications, WebCal live feed with token revocation safety, TanStack Query IndexedDB offline caching, PWA non-intrusive installation banner, and German/English localization.

#### Proposed Changes

##### Database Migrations (`packages/supabase/migrations/`)
- `10_device_tokens.sql`: Create `device_tokens` (`id`, `profile_id`, `token`, `platform`)
- `11_notifications.sql`: Create `notifications` (`id`, `recipient_id`, `event_type`, `payload`, `is_read`)

##### Supabase Edge Functions (`packages/supabase/functions/`)
- `send-notification/`: Central push + in-app dispatcher for 7 event types
- `calendar-feed/`: Returns `text/calendar` HTTP response for `/calendar-feed?token=<calendar_token>`

##### Web Application (`apps/web/src/`)
- `features/notifications/`: `NotificationBell`, `NotificationDrawer`, `usePushRegistration`
- `features/calendar/`: `CalendarExportButton` (`.ics` download), `SubscriptionLinkGenerator`, `RegenerateTokenButton` in Settings
- `i18n/`: `react-i18next` configuration with complete `public/locales/en/*.json` and `public/locales/de/*.json`
- `pwa/`: `vite-plugin-pwa` configuration, service worker registration, `<OfflineBanner>` component, IndexedDB cache persistence (`persistQueryClient`), `PWAInstallBanner` (non-intrusive dismissible prompt with iOS Safari / Android instructions)

#### Testable Milestone 1.6
- [ ] **PWA & Offline**: App shows non-intrusive "Install PocketCoach" banner. Installs to home screen. Toggling Airplane Mode keeps `/sessions` readable from IndexedDB with `<OfflineBanner>`.
- [ ] **Notifications**: Action (e.g. assigned to session) triggers in-app notification bell count and FCM push notification.
- [ ] **Calendar Sync**: Trainer downloads `.ics` file or subscribes via WebCal feed. Clicking "Regenerate Link" in Settings invalidates old feed URL instantly.
- [ ] **Localization**: Switch language toggle between English and Deutsch — 100% of UI text, badges, and system messages translate cleanly.

---

## Phase 2: Availability Surveys & Matrix Dashboard

### Sub-Phase 2.1: Availability Surveys & Matrix Dashboard

**Goal**: Implement availability survey creation, date-by-date trainer responses, and the scrollable Head-trainer Availability Matrix grid with sticky headers, month quick filters, workload summaries, and survey locking.

#### Proposed Changes

##### Database Migrations (`packages/supabase/migrations/`)
- `07_availability.sql`: Create `availability_surveys` (`id`, `season_id`, `name`, `range_start`, `range_end`, `status`) and `availability_responses` (`id`, `survey_id`, `profile_id`, `session_id`, `state`)
- RLS policy: Restrict response updates to when `AVAILABILITY_SURVEYS.status = 'open'`.

##### Web Application (`apps/web/src/features/`)
- `features/availability/`:
  - `SurveyCreateModal`: Create survey for date range (e.g. Aug–Dec).
  - `TrainerSurveyForm`: Mobile-friendly list where trainers tap ✅ Available, ❌ Unavailable, 🔶 Tentative per session.
  - `AvailabilityGrid`: Scrollable matrix with sticky date column (left) and trainer header (top), plus a Month Quick Filter tab bar (e.g. All, Aug, Sep, Oct).
  - `TrainerTypeFilter`: Toggle matrix between Regular Trainers and 14/18 Coaches.
  - `WorkloadSummaryRow`: Dual summary metrics (Completed Sessions vs. Total Assigned).
- `features/dashboard/`: `AdminDashboard` shell integrating the matrix and quick stats.

---

## Verification & Acceptance Summary

| Sub-Phase | Core Capability | Verification Command / Method |
|---|---|---|
| **1.1 Foundation** | Monorepo build & test seed | `pnpm build && pnpm dev` + seed test logins |
| **1.2 Auth & Roles** | Invite flow, OAuth, role grant | Inbucket (`http://localhost:54324`) → Register → Login → Elevate Role |
| **1.3 Sessions** | Season setup, auto session gen | Create Season → Verify DB `sessions` generated for weekdays |
| **1.4 Assignments** | 2-track assignment, trainer stats | Card detail modal & Bulk Assign → Verify My Sessions & Stats |
| **1.5 Substitutions** | Flag absent, volunteer, atomic lock | Home gap banner → Concurrent volunteer test → Verify RLS & transaction |
| **1.6 Polish** | PWA, offline, push, calendar, i18n | PWA banner → Airplane mode → WebCal feed & reset → Language toggle |
| **2.1 Availability** | Survey lifecycle, real-time matrix | Open survey → Sticky grid + month filter → Live updates → Close survey |

## Related pages

- [[codebase/architecture/system-architecture]]
- [[codebase/architecture/database-schema]]
- [[codebase/architecture/auth-and-onboarding]]
- [[codebase/architecture/notification-system]]
- [[codebase/architecture/offline-and-pwa]]
- [[codebase/architecture/substitution-flow]]
