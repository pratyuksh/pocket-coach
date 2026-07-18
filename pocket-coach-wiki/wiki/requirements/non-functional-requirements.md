# Non-Functional Requirements

**Summary**: Summarizes platforms, offline capabilities, scaling expectations, security standards, localization target, and calendar integration features.

**Sources**: None

**Last updated**: 2026-07-18

---

← [Back to Requirements Index](./readme.md)

---

## Table of Contents
- [Non-Functional Requirements](#non-functional-requirements)
- [Out of Scope](#out-of-scope-for-now)

---

## Non-Functional Requirements

### Platforms
- **Web App**: Accessible via modern browsers (Chrome, Firefox, Safari, Edge).
- **Mobile App**: Native or cross-platform apps for **Android** and **iOS**.
- UI must be responsive and optimized for both desktop and mobile screen sizes.

### Offline Support
- The app must support **offline mode** for core read operations:
  - Viewing assigned sessions
  - Viewing training themes and plan notes
  - Drafting post-session notes
- Changes made offline must **sync automatically** when connectivity is restored.
- The app should clearly indicate when it is in offline mode and when a sync is in progress.

### Scale
- Expected user base: **10–30 trainers**.
- The app should handle concurrent usage without performance degradation.

### Security & Privacy
- All data is accessible only to authenticated users with appropriate roles.
- Communication between client and server must be encrypted (HTTPS/TLS).
- Personal data (trainer profiles, availability) must be handled in accordance with applicable data protection regulations (e.g., GDPR).
  - **EU Data Residency**: All database, authentication, and static assets must be hosted on servers located within the European Union (Germany).
  - **Data Minimization**: The application must only collect and store the bare minimum PII needed for scheduling (email, display name, profile picture). Storing other sensitive personal details (e.g., physical attributes, phone numbers, or addresses) is out of scope.

### Localization
- The app must support **German** and **English**.
- Users can select their preferred language in their profile settings.
- All UI text, notifications, and system messages must be available in both languages.

### Calendar Integration
- Trainers can **export their assigned sessions** to their personal calendar (Google Calendar, Apple Calendar, or any CalDAV-compatible app).
- Export requires **explicit user consent** and is opt-in.
- Sessions are exported as calendar events including: date, time, training theme, and session location.
- The export can be a one-time download (`.ics` file) or a live-synced calendar subscription link.

---

## Out of Scope (for now)

- **Fitness test tracking** — may be revisited in a future version.
- **Player-facing features** — the app is exclusively for coaching staff.
- **Match scheduling or results tracking**.
- **Financial / billing management**.

*Previous: [Views, Dashboards & Notifications](./views-and-notifications.md)*

## Related pages

- [[readme]]
- [[views-and-notifications]]
- [[overview-roles-auth]]
