# Technical Risk Analysis

**Summary**: Evaluates primary technical, architectural, and implementation-level risks for the PocketCoach application, providing developer-focused mitigation strategies.

**Sources**: None

**Last updated**: 2026-10-11

---

## Technical Risk Matrix

| Risk | Probability | Impact | Developer Mitigation Strategy |
|---|---|---|---|
| **1. Offline Sync Conflicts** | Low | Medium | Model post-session notes as append-only comments; avoid shared mutable text records. |
| **2. Notification Delivery Failure** | Medium | High | Implement fallback email integration (Resend/Brevo) alongside push notifications (FCM/Expo). |
| **3. Substitution Race Conditions**| Low | Medium | Use database transactions or Row-Level Locks (SELECT FOR UPDATE) to prevent double-booking a single substitution gap. |
| **4. Local Cache Eviction / Loss** | Low | Medium | Persist offline drafts in SQLite or IndexedDB rather than ephemeral LocalStorage; flag unsynced items. |
| **5. Real-Time Availability Latency**| Medium | Medium | Use WebSocket or PostgreSQL real-time subscriptions to keep the availability matrix synchronized. |
| **6. Escalation Cron Failures** | Low | High | Use monitored serverless scheduler tasks or robust Postgres pg_cron executions for the 48h gap alert. |
| **7. PWA/Mobile OAuth Redirects** | Medium | Medium | Configure custom URL schemes and App/Universal Links for Capacitor redirect handling. |
| **8. Authorization Bypass in Database Layer** | Medium (found and fixed in Phase 1.4) | High | Treat the database as the security boundary: tight RLS on every table, role checks inside every `SECURITY DEFINER` function, `EXECUTE` revoked from `anon`, and pgTAP permission tests in CI. |
| **9. Weak Invitation & Open Registration** | High (open) | High | Replace the temporary-password invite with `admin.inviteUserByEmail()` and single-use tokens; decide whether public signup should be disabled; create profiles via an `auth.users` trigger. |

---

## Detailed Technical Risks & Mitigations

### 1. Offline Sync Conflicts
* **Description**: Multiple trainers editing post-session notes offline could create concurrent write-write conflicts when they reconnect.
* **Mitigation**: Move away from a single shared rich-text notes block. Instead, model post-session notes as a timestamped comment log where each trainer's entry is a separate row in the database, avoiding updates to the same text record.

### 2. Notification Delivery Failure
* **Description**: Native push notifications may fail to deliver due to client-side OS restrictions (battery savers, disabled permissions) or expired push tokens.
* **Mitigation**: Implement a dual-channel notification service. Ensure critical alerts (assignments and releases) trigger both an FCM/Expo push notification and an email via Resend/Brevo. Store and validate device tokens on login.

### 3. Substitution Race Conditions
* **Description**: Multiple trainers click "Volunteer" for the same open substitution slot at the exact same time, leading to double-assignment.
* **Mitigation**: Implement database transactions. When volunteering, lock the session slot row (`SELECT FOR UPDATE`), verify the gap is still open, and check that the volunteer does not have an overlapping session assignment before writing the confirmation.

### 4. Local Cache Eviction
* **Description**: Browser engines can clear LocalStorage or IndexedDB if a mobile device runs low on disk space, causing trainers to lose unsynced offline post-session notes.
* **Mitigation**: For web/PWA clients, request persistent storage access using `navigator.storage.persist()`. For native iOS/Android wraps, use Capacitor SQLite to store draft notes in native file storage, which is immune to browser cache cleaning.

### 5. Real-Time Availability Latency
* **Description**: The availability survey matrix is shared by multiple Head-trainers. Stale client data could cause a Head-trainer to assign a trainer based on outdated availability reports.
* **Mitigation**: Subscribe to database mutations on the availability table using WebSockets (e.g., Supabase Realtime or Firebase Firestore listeners) to immediately update the grid UI across active dashboards.

### 6. Escalation Cron Failures
* **Description**: If the scheduled script checking for 48-hour substitution gaps fails or times out, critical uncovered sessions will not escalate to the Head-trainers.
* **Mitigation**: Host the cron checker on Google Cloud Scheduler or as a pg_cron SQL execution. Configure logging alerts (e.g. Sentry or console logging triggers) to notify developers of execution failures immediately.

### 7. PWA/Mobile OAuth Redirects
* **Description**: OAuth providers (Google, Apple) redirect users back to the app after login. Redirecting back to a native shell app (Capacitor) or an installed PWA can fail or create redirect loops.
* **Mitigation**: Set up custom URL schemes (e.g., `pocketcoach://`) and configure App Links (Android) and Universal Links (iOS) to handle authorization callback routing cleanly.

### 8. Authorization Bypass in the Database Layer
* **Description**: The web app talks to the database directly with the public anon key, so every rule enforced only in the UI can be bypassed. Review of Sub-Phase 1.4 found real instances: `SECURITY DEFINER` functions (`generate_season_sessions`, `bulk_assign_trainer`) that bypass RLS had no role check and were callable by anyone, including logged-out callers; read policies written as `auth.role() = 'authenticated' OR true` were always true; an `auth.role() = 'anon'` insert fallback let anyone grant themselves `super_admin`, and the same fallback on the `session_assignments` insert policy (missed in the first fix, found by the write-policy tests in Sub-Phase 1.4t) let anyone add trainers to sessions; and several tables still had `FOR ALL USING (true)` development policies.
* **Mitigation**: All of the above were fixed in migrations `20261011000000`–`07` (see [[codebase/architecture/database-schema#migration-history]]). Standing rules: (1) every `SECURITY DEFINER` function checks `auth.uid()` against the role helpers and revokes `EXECUTE` from `anon`/`PUBLIC`; (2) never record client-supplied identity (such as `assigned_by`), use `auth.uid()`; (3) RLS cannot restrict individual columns, so admin-managed profile fields are protected by a trigger; (4) permission regressions are caught by the pgTAP suite (`pnpm test:db`), which runs in CI and includes logged-out, trainer, Head-trainer and Super-admin cases. New tables must ship with policies and test cases in the same sub-phase.

### 9. Weak Invitation & Open Registration
* **Description**: Invited accounts are created with a fixed temporary password and an invite link that is only `base64(email)`, so anyone who knows an invited email can complete or take over that account before the invitee does. `/register` is open to anyone. Registration also relies on receiving a session straight after `signUp`, which stops working once email confirmation is enabled.
* **Mitigation**: Move the invite to a server-side flow (`admin.inviteUserByEmail()` from an Edge Function) with single-use tokens, and decide whether public signup should be disabled. Create the profile and base role through a trigger on `auth.users`. The temporary password is a known, accepted shortcut for local development only. Tracked in [[codebase/known-issues]] and described in [[codebase/architecture/auth-and-onboarding]].

## Related pages

- [[known-issues]]
- [[feasibility-and-costs]]
- [[data-privacy-gdpr]]
- [[../requirements/readme]]
- [[../requirements/non-functional-requirements]]
