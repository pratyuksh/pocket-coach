# Feasibility and Cost Estimation

**Summary**: Evaluates the technical feasibility of the PocketCoach requirements and provides hosting/infrastructure cost estimates for the application.

**Sources**: None

**Last updated**: 2026-07-18

---

## Technical Feasibility

Building the PocketCoach application according to the specified requirements is highly feasible. Given the small target user base of 10–30 trainers, standard web and mobile technologies can easily support the functional requirements.

### Architecture Choice: Web App + PWA vs. Native Apps
* **Requirements**: Access via modern web browsers and mobile apps for Android and iOS.
* **Proposed Implementation**: Develop a responsive web application using a framework like React (Vite) or Next.js, and configure it as an installable **Progressive Web App (PWA)**. If native App Store distribution is required in the future, wrap the web app with **Capacitor**.
* **Rationale**: 
  * A PWA can be installed directly on iOS and Android devices from the browser, bypassing the $99/year Apple Developer Fee and the App Store review process. This is ideal for internal-use coaching tools.
  * Capacitor allows compiling the exact same web codebase into native packages (100% code sharing) if native push notifications or store listing are required.

### Offline Support and Synchronization
* **Requirements**: Offline view of sessions, themes, and notes; offline drafting of post-session notes; automatic synchronization when back online.
* **Proposed Implementation**: 
  * **Option A (Firebase Firestore)**: Firestore has built-in offline synchronization and data caching for web and mobile clients. Data changes made offline are queued locally and automatically pushed to the database once connection is restored.
  * **Option B (Supabase + React Query)**: Cache GET requests client-side using TanStack Query (React Query) with persistent storage (e.g., IndexedDB for web, AsyncStorage for mobile). Queue offline post-session note mutations locally and trigger synchronization when network connectivity changes.

### Calendar Integration
* **Requirements**: Export assigned sessions as a `.ics` file or subscribe to a live-synced feed.
* **Proposed Implementation**: 
  * *Static Export*: Generate standard iCalendar (`.ics`) data on the client using the `ics` npm library for direct download.
  * *Live Sync Feed*: Expose an API endpoint (e.g., `/api/calendar/feed?token=<auth-token>`) that dynamically queries the database for the trainer's assigned sessions and returns the formatted iCalendar stream.

### Escalation & Automation Scheduler (Substitution Gaps)
* **Requirements**: If no volunteer steps forward for a substitution request within 48 hours of the session, a follow-up alert is broadcast and Head-trainers/Super-admins are notified to follow up manually.
* **Proposed Implementation**: Requires a server-side scheduling mechanism:
  * **Option A (Supabase)**: Use the `pg_cron` Postgres extension to check for unfilled gaps starting within 48 hours, triggering a Supabase Edge Function to broadcast notification alerts.
  * **Option B (Firebase)**: Set up a scheduled Firebase Cloud Function (using Google Cloud Scheduler) running daily or hourly to monitor gaps and publish FCM push notifications.
  * **Option C (Self-hosted)**: Implement a lightweight library (such as `node-cron` or `bullmq`) running inside the server process to poll and dispatch reminders.

### Rich Text Formatting for Notes
* **Requirements**: Support basic formatting (bold, italic, lists) for session plan and post-session notes.
* **Proposed Implementation**: Use a frontend component like **Tiptap** or **React Quill** to write and edit notes in HTML or Markdown. The resulting formatted strings are stored in a standard database text column, supporting offline caching and synchronization seamlessly.

---

## Cost Estimation

Since the application serves a tiny user base (10–30 trainers), operational resource consumption will be negligible. Almost all requirements can be satisfied using free or very low-cost cloud tiers.

### Minimizing Costs: Postponing Apple Sign-In
To keep initial developer and launch costs at exactly **$0**, the project postpones the implementation of **Apple Sign-In (OAuth)**. Apple requires a paid Apple Developer membership ($99/year) to configure Services IDs for Sign In with Apple (even for web app/PWA implementations). By relying on Email/Password and Google Sign-In (which are free), the developer fee remains $0.

### Cost Breakdown Comparison

| Category | Option A: Serverless BaaS (Recommended) | Option B: Self-Hosted VPS | Notes |
|---|---|---|---|
| **Database & Auth** | $0.00 | $0.00 | Supabase or Firebase free tiers cover up to 50k MAUs. |
| **App/Web Hosting**| $0.00 | $4.00 – $6.00 | Cloudflare Pages (Free) vs. small VPS (Hetzner CAX11 / DigitalOcean). |
| **Email Sending** | $0.00 | $0.00 | Resend / Brevo free tiers allow 3,000 emails/month (for invitations). |
| **Notifications** | $0.00 | $0.00 | Firebase Cloud Messaging or Expo notifications are free. |
| **Domain Name** | ~$1.00 | ~$1.00 | Custom domain name (e.g., `.de` / `.com` for ~$12/year). |
| **Developer Fees** | $0.00 | $0.00 | Bypasses App Store and Apple OAuth setup fees by postponing Apple Sign-In. |
| **Total Monthly** | **~$1.00 / month** | **~$5.00 – $7.00 / month** | |

## Related pages

- [[data-privacy-gdpr]]
- [[../requirements/readme]]
- [[../requirements/non-functional-requirements]]
