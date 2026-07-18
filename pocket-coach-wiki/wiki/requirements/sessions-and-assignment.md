# Sessions & Trainer Management

**Summary**: Outlines training session structure, player groups, assignment tracks, availability survey mechanics, and substitution processes.

**Sources**: None

**Last updated**: 2026-07-18

---

← [Back to Requirements Index](./readme.md)

---

## Table of Contents
- [Training Sessions](#training-sessions)
- [Player Groups](#player-groups)
- [Trainer Assignment](#trainer-assignment)
- [Availability Survey](#availability-survey)
- [Substitution Management](#substitution-management)

---

## Training Sessions

A **training session** represents one training day.

- Sessions are automatically generated for each **configured training day** of the week (as defined in the season setup) for every week in the season.
- Each session inherits the **default time slot** for its day of the week (e.g., all Tuesdays use the Tuesday default). Individual sessions can **override the default time** if there is an exception (e.g., a holiday-shortened session).
- Each session has **two independent trainer tracks**:
  - **Regular trainers**: 2–3 primary trainer slots
  - **14/18 Coaches**: 1–2 additional slots, assigned independently from the regular trainer track
- Each session contains:
  - Date and day of the week
  - Start and end time (defaulted from season config, overridable per session)
  - Associated training theme (inherited from the week's plan — see [Season Planning](./season-planning.md))
  - Assigned regular trainers (2–3), each optionally tagged as Hilfstrainer at point of assignment
  - Assigned 14/18 Coaches (1–2), shown as a distinct group
  - Player groups attending — typically all three (Kids/Basic, Advanced-1, Advanced-2), though any group may be absent for a given session
  - Training plan notes (added by Head-trainers or Super-admins)
  - Post-session notes (added by assigned trainers)

---

## Player Groups

The club has three broadly fixed training groups:

| Group | Description |
|---|---|
| **Kids / Basic** | Beginners and younger players. Training content is simplified. |
| **Advanced-1** | Intermediate-level players. |
| **Advanced-2** | Advanced players. |

- Group membership is broadly fixed for a season.
- Head-trainers can reassign players to groups, particularly at the start of a season.
- Groups are associated with sessions so trainers know which groups they are training.

> **Note:** Players do not have accounts in the app. Groups are managed as named entities by the coaching staff.

---

## Trainer Assignment

Each session has **two independent allocation tracks**, managed separately:

### Track 1 — Regular Trainers (2–3 per session)
- The Head-trainer assigns 2–3 regular trainers to each session.
- At the **moment of assignment**, the Head-trainer chooses the session role for each trainer:
  - **Primary trainer** — the default role
  - **Hilfstrainer (Assistant-coach)** — a supporting role, visually distinct in the session view
- Head-trainers and Super-admins can also be assigned to sessions as regular trainers.

### Track 2 — 14/18 Coaches (1–2 per session)
- The Head-trainer assigns 1–2 trainers with the **14/18 Coach** profile label to each session, independently of the regular trainer track.
- 14/18 Coaches are shown as a distinct group in the session view.
- The availability matrix can be filtered to show only 14/18 Coaches, making this allocation step easier (see [Availability Survey](#availability-survey)).

### General
- Assignments are made in rounds, aligned with the availability survey periods (see [Availability Survey](#availability-survey)). After each survey is completed for a date range, the Head-trainer assigns trainers for the sessions in that period.
- Assignments can be done in bulk (e.g., for an entire survey period) or per individual session.
- All assigned trainers are notified (see [Views, Dashboards & Notifications](./views-and-notifications.md#notifications)).

---

## Availability Survey

Because a season spans ~12 months (August to July), availability is collected in **multiple survey rounds** rather than a single up-front survey. Each survey covers a specific portion of the season.

- A Head-trainer can **create multiple availability surveys** within a season, each with a defined **date range** (e.g., Survey 1: August–December, Survey 2: January–July).
- When a survey is created, it is sent to all active trainers with a notification.
- Trainers respond **per training session date** within the survey's range, marking one of the following states for each date:

| Availability State | Meaning |
|---|---|
| ✅ **Available** | The trainer explicitly confirms they can attend this session. |
| ❌ **Unavailable** | The trainer explicitly marks that they cannot attend. |
| 🔶 **Tentative** | The trainer can fill in if needed, but would prefer not to be assigned. |
| ⬜ **No response** | The trainer has not yet responded for this date (shown to Head-trainer as a gap). |

- The Head-trainer's **availability summary dashboard** displays all four states per trainer per session date in a **scrollable grid/matrix**:
  - **Rows**: each session date in the survey period (scrollable vertically through time, e.g., Aug–Dec)
  - **Columns**: each active trainer (horizontally scrollable if needed for larger teams)
  - **Cells**: colour-coded availability state (✅ Available, ❌ Unavailable, 🔶 Tentative, ⬜ No response)
  - **Summary row**: total sessions already assigned to each trainer, shown at the top or bottom of the matrix for workload balancing.
  - **Trainer-type filter**: A tab or toggle to switch the matrix between **Regular trainers** and **14/18 Coaches**, since allocation for the two tracks is done independently.
- After each survey is completed, the Head-trainer uses the responses to **assign trainers for the sessions in that period**.
- Survey responses are stored and linked to both the season and the specific survey round.

> In practice, the club currently runs two surveys per season: one before August (covering Aug–Dec) and one in December (covering Jan–Jul). The app supports this pattern and allows more rounds if needed.

---

## Substitution Management

The goal is to always maintain the **originally assigned number of trainers** per session (e.g., if 3 trainers were assigned, 3 should be present). When an assigned trainer (including a Head-trainer assigned to a session) cannot attend:

1. The trainer **flags themselves as unavailable** for that specific session within the app.
2. A **substitution request** is automatically broadcast as a notification to **all eligible trainers** (any active trainer in the club).
3. The session's **coverage gap (unfilled substitution request) is highlighted clearly in the app to all users** (e.g., flagged on the main schedule, the upcoming sessions view, and a dedicated "Gaps" list). This ensures maximum visibility so any trainer can see that there is a problem and volunteer.
4. Any trainer can **volunteer to substitute** for that session directly from the alert or session view, **provided they are not already assigned to another session during the same time slot**.
5. The volunteer is **immediately confirmed** as a substitute — no Head-trainer approval required. The system programmatically prevents double-booking.
6. The session's trainer list is updated and all assigned trainers are notified of the change.
7. If no volunteer steps forward as the session approaches (e.g., within 48 hours), a follow-up alert is broadcast and all Head-trainers/Super-admins are notified to follow up manually.

> This replaces the current WhatsApp-based substitution workflow.

*Previous: [Season & Training Planning](./season-planning.md)*
*Next: [Views, Dashboards & Notifications](./views-and-notifications.md)*

## Related pages

- [[readme]]
- [[season-planning]]
- [[views-and-notifications]]
