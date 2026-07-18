# Overview, Roles & Authentication

**Summary**: Details user roles, permission mappings, onboarding steps, and authentication methods.

**Sources**: None

**Last updated**: 2026-07-18

---

← [Back to Requirements Index](./readme.md)

---

## Table of Contents
- [Overview](#overview)
- [User Roles & Permissions](#user-roles--permissions)
- [Onboarding & Authentication](#onboarding--authentication)

---

## Overview

**PocketCoach** is a training management app for coaches and trainers at a badminton club. It replaces the current ad-hoc workflow (Google Sheets, WhatsApp groups) with a structured, centralised tool for:

- Planning training seasons, blocks, and weekly themes
- Assigning trainers to sessions
- Managing trainer availability and substitutions
- Recording session notes and training plans
- Notifying trainers of assignments and changes

The app is **not** intended for players — it is exclusively a tool for coaching staff.

---

## User Roles & Permissions

The app uses a **multi-role, additive permission model**. Every person in the system is fundamentally a **Trainer** — someone who can be assigned to sessions, fill in availability, write notes, and volunteer for substitutions. On top of this, elevated roles (**Head-trainer**, **Super-admin**) can be granted as additional "hats" that unlock extra capabilities.

A user can hold multiple roles simultaneously (e.g., a person can be both a Trainer and a Head-trainer).

### Base Role

| Role | Description |
|---|---|
| **Trainer** | The base role for every user. Can view all sessions, has read-only access to the season training program, edit/add notes to their own assigned sessions, fill in the availability survey, flag unavailability, and volunteer for substitutions. |

### Elevated Roles (additive)

| Role | Description |
|---|---|
| **Head-trainer** | Grants full access to season planning, training blocks, training themes, trainer assignments, and player groups. Can view and edit all sessions. Multiple Head-trainers may exist; in practice each may focus on a different area (e.g., one handles trainer allocation, another prepares training content), but the app does not enforce this split — all Head-trainers have identical elevated permissions. |
| **Super-admin** | Grants full system access on top of Head-trainer capabilities. Invites new users, assigns roles, and manages club-level settings. |

### Labels & Tags (no permission effect)

| Label / Tag | Scope | Description |
|---|---|---|
| **14/18 Coach** | Profile label | Applied to a trainer who is a junior player (U14 or U18 age group) assisting the regular trainers. Visible to other trainers on the session view. |
| **Assistant-coach** | Session-level tag | Any trainer can be tagged as assistant-coach for a specific session to clarify their supporting role. |

> **Example combinations:** A person can be a Trainer + Head-trainer. Another can be a Trainer + Super-admin. A junior player is a Trainer with the 14/18 Coach label. All of them can be assigned to sessions and participate on the court.

---

## Onboarding & Authentication

### User Invitation & Registration
- The **Super-admin** invites new trainers via email.
- The invited trainer receives an invitation link and completes registration.
- Upon successful registration, the user is automatically granted the base **Trainer** role.
- If the user should also have elevated permissions, the Super-admin can additionally assign the **Head-trainer** and/or **Super-admin** role at any time after registration.

### Authentication Methods
- Email + Password
- Google Sign-In (OAuth)
- *Note: Apple Sign-In (OAuth) is postponed to a later phase to keep initial developer account costs at $0.*

### Account Management
- Trainers can update their display name and profile picture.
- Trainers can add a free-text **"Responsibility / Speciality"** field to their profile (e.g., "Trainer Allocation", "Training Content & Planning"). This field is visible to all coaching staff and serves as an informal indicator of a trainer's area of focus — it carries no permission implications.
- Super-admin can assign one or more roles to any trainer (e.g., grant Head-trainer on top of their base Trainer role).
- Super-admin can revoke elevated roles at any time (the base Trainer role always remains).
- Super-admin can deactivate or remove a trainer's account entirely.

## Related pages

- [[readme]]
- [[season-planning]]
- [[sessions-and-assignment]]
