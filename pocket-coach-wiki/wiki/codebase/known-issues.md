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
| C1 | **Per-track assignment limits are not enforced.** Nothing stops more than 3 regular trainers or more than 2 14/18 Coaches on one session. | Requirement: 2–3 regular, 1–2 14/18 Coaches ([[requirements/sessions-and-assignment]]). |
| C2 | **The 14/18 track is not checked against the label.** `bulk_assign_trainer` accepts any track, so a trainer without the 14/18 Coach label can be bulk-assigned to the `junior_coach` track. The per-session modal picks the track from the label, but the database does not verify it. | Add a check in the database (function or trigger). |
| C3 | **Swapping two trainers between two rows fails.** With A in row 1 and B in row 2 of the assignee modal, changing them to B and A violates the unique active-assignment index because rows are saved one at a time. | Workaround: remove and re-add. Fix by saving all rows in one database call. |
| C4 | **Saving roles is not atomic.** `RoleManagerModal` deletes all of a user's roles and then inserts the new set. If the insert fails the user is left with no roles. A Super-admin can also remove their own Super-admin role. | Replace with a single database function; block removing one's own Super-admin role. |
| C5 | **Calendar feed link does not work.** Settings builds the URL from the web app's origin and the `calendar-feed` Edge Function does not exist yet. | Delivered in Sub-Phase 1.6; milestone 1.2 should note this. |

### Missing features introduced by recent behaviour changes

| # | Issue | Notes |
|---|---|---|
| F1 | **A season in use cannot be re-planned.** `generate_season_sessions` now refuses once any session has an assignment or override, and there is no "add missing sessions" action for changed weekly slots. | Needed when a season's slots change after assignments exist. |
| F2 | **Bulk assign cannot replace a trainer.** It is now additive; swapping a recurring trainer means removing them per session. | Possible "replace" mode. |

### Testing & Quality

| # | Issue | Notes |
|---|---|---|
| T1 | No end-to-end test covers creating a season (Sub-Phase 1.3) or assigning several trainers to one session in the UI. | |
| T2 | The migrations were applied incrementally to a local database; a from-scratch run (`pnpm supabase:reset && pnpm test:db`) has not been confirmed locally. | CI starts from an empty database on the next push. |
| T3 | ESLint reports 73 `no-explicit-any` warnings (0 errors), mostly in older code and tests. | Technical debt; not blocking. |

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

Other details still to confirm with the club (staffing targets, label exclusivity, unpublish, undo, invite expiry, notification preference semantics) are listed in the plan.

---

## Recently Resolved

Resolved during the Sub-Phase 1.4 hardening pass (2026-10-11). Details are in [[codebase/architecture/database-schema]] and [[codebase/architecture/auth-and-onboarding]].

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

## Related pages

- [[codebase/implementation-plan]]
- [[codebase/risk-analysis]]
- [[codebase/architecture/database-schema]]
- [[codebase/architecture/auth-and-onboarding]]
- [[codebase/architecture/substitution-flow]]
