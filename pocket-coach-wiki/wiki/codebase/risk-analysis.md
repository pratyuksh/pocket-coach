# Technical Risk Analysis

**Summary**: Evaluates primary technical, architectural, and implementation-level risks for the PocketCoach application, providing developer-focused mitigation strategies.

**Sources**: None

**Last updated**: 2026-07-18

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

## Related pages

- [[feasibility-and-costs]]
- [[data-privacy-gdpr]]
- [[../requirements/readme]]
- [[../requirements/non-functional-requirements]]
