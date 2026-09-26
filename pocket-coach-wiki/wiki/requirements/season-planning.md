# Season & Training Planning

**Summary**: Explains the hierarchy of training planning including Seasons, Blocks, and the global/season Training Themes.

**Sources**: None

**Last updated**: 2026-07-18

---

← [Back to Requirements Index](./readme.md)

---

## Table of Contents
- [Season Management](#season-management)
- [Training Block Planning](#training-block-planning)
- [Training Themes](#training-themes)

---

## Season Management

A **training season** is the top-level container for all planning.

- Super-admin or Head-trainer can create a new season (with a name, start date, and end date).
- A typical season runs from **August to July** of the following year (~12 months), though the exact dates are configurable.
- As part of season setup, Head-trainers can select a **Default Season Template** (e.g., Standard Junior Season) or build a custom schedule from scratch.
- Head-trainers configure **training days**, **sports hall locations**, and **player group associations** for that season.
- For each configured training day slot, a **sports hall location** (selected from available club halls) and **default time slot** (start time and end time) are set. All sessions generated for that slot inherit these defaults for the entire season (e.g., Tuesday Apfelbaum: 17:30–19:00, Wednesday Borrweg Slot 1: 17:30–18:30, Wednesday Borrweg Slot 2: 18:15–19:45, Thursday Wolfsblick: 17:30–19:00, Friday Apfelbaum: 17:30–19:00).
- A season contains one or more **training blocks**.
- Only one season is "active" at a time.
- When a season ends, it is **archived** and remains accessible for historical reference.

---

## Sports Hall Locations

Training sessions take place at designated club hall locations.

- The club maintains a list of available **sports halls/locations**, which can be updated per season.
- Default hall locations:
  1. **Sporthalle Schulhaus Apfelbaum** (Oerlikon)
  2. **Sporthalle Borrweg** (Friesenberg)
  3. **Sporthalle Wolfsblick** (Zürich-Affoltern)
- Each training day slot is assigned to one hall location by default.
- Individual sessions can override the hall location if a facility conflict or special event occurs.

---

## Training Block Planning

A **training block** is a thematic planning period within a season (e.g., 6 weeks).

- Head-trainer can create blocks within a season (name, start week, end week, description).
- A block is divided into **weeks**.
- Each week is assigned a **training theme** (see [Training Themes](#training-themes)).
- Example structure:
  - Block 1 (Weeks 1–6):
    - Weeks 1–3 → Theme: "Net Play Foundations"
    - Weeks 4–6 → Theme: "Attacking from the Net"

---

## Training Themes

A **training theme** is a topic or focus area that applies to all sessions in a given week.

Training themes are managed at two levels:

### Global Theme Library
- A **global theme library** serves as the master source of all themes, maintained by Head-trainers and Super-admins.
- Head-trainers can create, edit, and archive themes in the library (name + description).
- The library persists across seasons and grows over time as new themes are created or published.

### Season Theme List
- When a new season is created, the global theme library is **copied into a season-specific theme list**.
- Head-trainers can then **freely edit, rename, or add themes** within that season's list without affecting the global library or any other season's records.
- When planning a block, a Head-trainer assigns a theme to each week from the **season's own theme list**.
- The weekly theme applies uniformly to all sessions on the configured training days of that week.

### Publishing Themes Back
- If a Head-trainer creates or refines a theme within a season and wants it available for future seasons, they can **publish it back to the global library**.
- This is an explicit, opt-in action — editing a season theme does not automatically update the global library.

### Group-specific Notes
- Head-trainers can add notes within the training plan to differentiate how the theme is applied across player groups (e.g., simpler drills for Kids/Basic).

*Next: [Sessions & Trainer Management](./sessions-and-assignment.md)*

## Related pages

- [[readme]]
- [[overview-roles-auth]]
- [[sessions-and-assignment]]
