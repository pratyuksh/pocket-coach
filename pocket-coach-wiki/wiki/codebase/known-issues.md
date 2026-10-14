# Known Issues

**Summary**: Living list of open problems found while reviewing and hardening Phase 1 (up to Sub-Phase 1.4), plus a record of what was recently resolved and where the resolution is documented. Fixed items move to the relevant spec page and drop off the open list.

**Sources**: None

**Last updated**: 2026-10-11

---

## Table of Contents
- [Open Issues](#open-issues)
- [Plan Gaps: Decided and Still Open](#plan-gaps-decided-and-still-open)
- [Recently Resolved](#recently-resolved)

---

## Open Issues

Each open issue has a scheduled sub-phase; see [[codebase/implementation-plan#where-known-issues-are-scheduled]].

### Security

| # | Issue | Notes |
|---|---|---|
| S1 | **Invites use a shared temporary password and a guessable link.** Every invited account is created with `Password123!`; the invite link is `base64(email)`. Until the invitee finishes setup, anyone who knows their email can complete or take over the account. | Accepted for local development only. Fix: server-side `admin.inviteUserByEmail()` with single-use tokens. See [[codebase/architecture/auth-and-onboarding]]. |
| S2 | **Public registration is open.** `/register` and `enable_signup = true` let anyone create a Trainer account and read the whole schedule and trainer list. | Decide whether the app is invite-only; if so, disable signup together with S1. |
| S3 | **Registration breaks once email confirmation is on.** The profile and role are written right after `signUp`, which returns no session when confirmation is required, so the writes are rejected. | Fix with a trigger on `auth.users` that creates the profile and `trainer` role, together with S1. |

### Correctness

| # | Issue | Notes |
|---|---|---|
| C5 | **Calendar feed link does not work.** Settings builds the URL from the web app's origin and the `calendar-feed` Edge Function does not exist yet. | Delivered in Sub-Phase 1.6; milestone 1.2 should note this. |
| C7 | **Personal stats are not shown on any screen.** `PersonalStatsCard` and `usePersonalStats` exist but are never rendered (since Sub-Phase 1.4), although the 1.4 milestone was ticked. | Found in 1.4t. Scheduled in 1.4d (trainer home and profile, with an end-to-end assertion). |

### Missing features introduced by recent behaviour changes

| # | Issue | Notes |
|---|---|---|
| F1 | **A season in use cannot be re-planned.** `generate_season_sessions` now refuses once any session has an assignment or override, and there is no "add missing sessions" action for changed weekly slots. | Needed when a season's slots change after assignments exist. |
| F2 | **Bulk assign cannot replace a trainer.** It is now additive; swapping a recurring trainer means removing them per session. | Possible "replace" mode. |
| F3 | **No password reset.** The login screen in the design shows "Forgot password?", but there is no request-reset form or set-new-password page; `resetPasswordForEmail` is only used by the invite modal. | Found while planning the 1.4d login page. The button is left out of the login screen in 1.4d. Fix with the email templates and server-side invites in 1.6a (reset-request form, set-new-password page, EN/DE email text). |

### Testing & Quality

| # | Issue | Notes |
|---|---|---|
| T3 | ESLint reports 73 `no-explicit-any` warnings (0 errors), mostly in older code and tests. | Technical debt; not blocking. |
| T4 | Three policy names on `availability_responses` exceed Postgres' 63-character limit and are silently shortened (for example "…insert availability response"). | Harmless today; shorten them in a migration before Sub-Phase 2.1 so names match the code. |

---

## Plan Gaps: Decided and Still Open

Found while reviewing the earlier plan for 1.5 and 1.6; most were settled by the decisions of 2026-10-11 recorded in [[codebase/implementation-plan#decisions-of-2026-10-11]].

| Gap | Outcome |
|---|---|
| Escalation depends on notifications | Settled: notifications (1.6a) now come before substitutions (1.5). |
| Escalation check could skip the Edge Function | Settled: an hourly `pg_cron` SQL function notifies through the dispatcher. |
| `volunteer_substitution` rules undefined | Settled: same track only; no overlapping session the same day; not already on the session; published and upcoming only. Own-gap case does not arise because flagging removes the trainer from coverage. See [[codebase/architecture/substitution-flow]]. |
| Gap definition | Settled: coverage-based, from staffing targets (decision 2). |
| Concurrency test | Settled: two-connection test in CI (1.5). |
| Localization test | Settled: missing-key test (1.4d, 1.6b). |
| "Home screen" ambiguous | Settled: gaps appear on the trainer Home and the Gaps page; the dashboard is the Head-trainer home. A separate banner is still to confirm ([[codebase/implementation-plan#details-to-confirm]]). |
| Phase 2.1 "live updates" without Realtime | Open: handled when 2.1 is built ([[codebase/risk-analysis]], risk 5). |

Other details still to confirm (hard caps, label exclusivity, undo, invite expiry, notification preference semantics, language defaults) are listed in the plan; staffing targets, label-change blocking and unpublish were decided.

---

## Recently Resolved

Resolved during the Sub-Phase 1.4 hardening pass, 1.4c and 1.4t (2026-10-11). Details are in [[codebase/architecture/database-schema]] and [[codebase/architecture/auth-and-onboarding]].

| Issue | Resolution |
|---|---|
| Any caller could run `generate_season_sessions` / `bulk_assign_trainer` (including logged-out callers); `assigned_by` could be spoofed | Role checks, `EXECUTE` revoked from `anon`/`PUBLIC`, caller recorded from `auth.uid()` |
| Anyone with the public anon key could grant themselves `super_admin` | Anonymous insert fallback removed from `profiles` / `user_roles` |
| Logged-out callers could read profiles (emails), roles, schedule and assignments | Always-true read policies replaced with authenticated-only reads |
| Player-group link tables, substitution, notification and availability tables were open to everyone | Role-based policies in migrations `…01` and `…06` |
| Trainers could change their own email, active status and 14/18 label | `protect_profile_admin_fields` trigger; label read-only in Settings |
| Self-created profiles could set admin-managed fields | Self-inserts must be plain profiles with the user's own email |
| Sending an invite logged the admin in as the invitee, and invited Head-trainers/Super-admins got no role | Invite creates the account on an isolated auth client |
| Assigning a second regular trainer to a session overwrote the first; duplicates were possible | Assignments update by row id; unique active-assignment index |
| Regenerating a season wiped overrides and assignments | `generate_season_sessions` refuses when sessions are in use |
| Bulk assign rewrote past sessions and replaced existing assignees | Additive and upcoming-only (Europe/Zurich date) |
| Personal stats counted `replaced` assignments and used the UTC date | Filtered by status; local date helper |
| 14/18 label could not be changed after the invite | Super-admin toggle in the Role Manager |
| No test of the invite registration page | Playwright `invite-registration` test |
| No automated check of database permissions | pgTAP suite (`pnpm test:db`) running in CI |
| Migrations never verified from scratch (T2) | Gate run on 2026-10-11: `pnpm supabase:reset` applied all 13 migrations and the seed to an empty database; 77 pgTAP checks, 76 unit tests and 10 end-to-end tests passed. The remote CI run on the next push is still to be observed. |
| Write permissions on core tables untested (T5) | `write_policies` database tests: anonymous callers and trainers cannot insert, change or delete the seven core tables; Head-trainers can. Permissive policies now fail 34 checks. |
| **Anonymous insert path on `session_assignments`** (policy contained `OR auth.role() = 'anon'` since 1.4) | Found by the write-policy tests; closed in migration `20261012000003`. Anyone holding the public anon key could previously add trainers to sessions. |
| Assignee dialog discarded early choices when its data arrived | `useSessionAssignments` reports `loading` from the first render for a new session; unit test added. |
| No end-to-end test performed an assignment; roles test saved nothing (T6, T7) | Real flows: assignment with limit refusal and additive bulk assign; role grant, label change blocked and allowed, own Super-admin role protected; hall details. |
| Central hooks and route guards untested (T8) | Unit tests for `useSeasons`, `useSessions`, `useAuth`, `useLocations`, `useTrainers`, `ProtectedRoute`; unit coverage 50.2 % to 67.1 %. |
| `createSeason` had no rollback (C6) | Atomic `create_season` database function; the web app makes one call. |
| End-to-end setup fragile (T1, T9) | Throwaway seasons through the API, English locale and Zurich time, season specs in their own project, passes with 2 workers. |
| Per-track limits not enforced (C1) | Database trigger: at most 3 active regular trainers and 2 active 14/18 coaches per session (Sub-Phase 1.4c) |
| 14/18 track not checked against the label (C2) | The `junior_coach` track is only for 14/18 coaches, who can only work that track; label changes are blocked while upcoming assignments exist on the track that would become invalid |
| Swapping two trainers between rows failed (C3) | `set_session_assignments` saves the whole assignee list in one transaction, keyed by trainer |
| Role save not atomic; a Super-admin could remove their own role (C4) | `set_user_roles` replaces delete-then-insert; refuses to remove the caller's own Super-admin role |

## Related pages

- [[codebase/implementation-plan]]
- [[codebase/risk-analysis]]
- [[codebase/architecture/database-schema]]
- [[codebase/architecture/auth-and-onboarding]]
- [[codebase/architecture/substitution-flow]]
