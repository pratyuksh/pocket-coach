# Views, Dashboards & Notifications

**Summary**: Details notes creation, the Admin/Head-trainer dashboard features, the Trainer personal view ("My Sessions"), and the notifications grid.

**Sources**: None

**Last updated**: 2026-07-18

---

← [Back to Requirements Index](./readme.md)

---

## Table of Contents
- [Session Notes](#session-notes)
- [Admin & Head-trainer Dashboard](#admin--head-trainer-dashboard)
- [Trainer Personal View](#trainer-personal-view-my-sessions)
- [Open Substitution Gaps](#open-substitution-gaps)
- [Training Program View](#training-program-view)
- [Notifications](#notifications)

---

## Session Notes

Two types of notes exist per session:

| Note Type | Created by | Purpose |
|---|---|---|
| **Training Plan Notes** | Head-trainers / Super-admins | Describes how the weekly theme should be executed for this session; may include group-specific details. |
| **Post-session Notes** | Assigned trainers (including Head-trainers and Super-admins assigned to the session) | A summary of what happened during the session, observations, follow-ups. |

- Notes support rich text (basic formatting: bold, italic, bullet lists).
- Notes are visible to all coaching staff.
- Head-trainers and Super-admins can create and edit Training Plan Notes at any time.
- **Post-session Notes are structured as an append-only timeline/log where assigned trainers write separate, timestamped feedback comments (rather than a single shared editable text block) to prevent offline sync conflicts.** Any trainer assigned to a session (including Head-trainers and Super-admins) can add their own log entries.

---

## Admin & Head-trainer Dashboard

A dedicated dashboard is available to **Super-admins** and **Head-trainers** to give an at-a-glance overview of the club's training operations.

The dashboard includes:

- **Season overview**: Active season name, current block and week, upcoming sessions.
- **Trainer roster**: List of all trainers, their roles, and assigned session count for the current season.
- **Availability matrix**: A scrollable grid showing all session dates in the active survey period (rows) × all trainers (columns), colour-coded by availability state. Includes a summary row with each trainer's total assigned session count for workload balancing. See details in [[sessions-and-assignment]].
- **Substitution activity**: Open substitution requests and recently resolved ones.
- **Session coverage**: Quick view of sessions with fewer than the required number of trainers assigned.

> Trainers without elevated roles do not have access to the dashboard.

---

## Trainer Personal View ("My Sessions")

Every trainer has a personal view that gives them a clear picture of their own involvement in the season. This view is accessible to **all users** (Trainers, Head-trainers, and Super-admins).

### Upcoming Sessions
- A chronological list of all sessions the trainer is **assigned to**, starting from today.
- Each entry shows: date, day of the week, training theme, co-trainers, their session-level tag (e.g., Assistant-coach), and a link to the session detail.
- Clearly highlights the **next upcoming session** at the top.

### Open Substitution Gaps
A highly prominent section visible to all trainers showing any upcoming sessions with active, unfilled coverage gaps (where an assigned trainer flagged unavailability and no substitute has stepped up yet):
- Displays the date, time, theme, and count of missing trainers (e.g., "1 Trainer Needed").
- Allows any trainer to volunteer and confirm their substitution with a single click.

### Training Program View
All trainers have read-only access to the active season's overall curriculum schedule:
- A calendar or list view showing the **training blocks** (e.g., Block 1: Weeks 1–6) and their **assigned weekly themes**.
- Allows trainers to see the progression of training topics across the entire season, even for weeks or sessions they are not assigned to.
- Includes quick links to the training plan details and resources for each theme.

### Personal Session Statistics
A summary of the trainer's activity for the current season (and optionally past seasons), broken down by the **role they held in each session**:

| Stat | Description |
|---|---|
| Sessions as **Trainer** | Count of sessions where they were a primary assigned trainer |
| Sessions as **Assistant-coach (Hilfstrainer)** | Count of sessions where they were tagged as assistant-coach |
| Sessions as **14/18 Coach** | Count of sessions they were assigned to while holding the 14/18 Coach profile label |
| **Total sessions** | Combined count across all roles |

- Stats are shown per season and as a total.
- The breakdown helps trainers understand their contribution across different capacities.

---

## Notifications

The app sends push notifications (mobile) and in-app notifications (web + mobile) for the following events. **For critical operations (specifically: Availability survey sent, Assigned to a session, and No substitute found), notifications must also be dispatched via email to ensure delivery.**

| Event | Recipients |
|---|---|
| Availability survey sent | All active trainers |
| Assigned to a session | Assigned trainer |
| Session training plan updated | All trainers assigned to that session |
| Trainer flags unavailability | Head-trainers + Super-admins + all assigned trainers for that session |
| Substitution request posted | All active trainers |
| Substitution confirmed (volunteer steps up) | All trainers assigned to the session |
| No substitute found (manual follow-up needed) | Head-trainers + Super-admins |
| Role changed | Affected user |

*Previous: [Sessions & Trainer Management](./sessions-and-assignment.md)*
*Next: [Non-Functional Requirements](./non-functional-requirements.md)*

## Related pages

- [[readme]]
- [[sessions-and-assignment]]
- [[non-functional-requirements]]
