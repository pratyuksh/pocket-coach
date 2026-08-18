# Wiki Index

## Sources

| Page | Description | Sources |
|---|---|---|

## Requirements

| Page | Description | Sources |
|---|---|---|
| [[requirements/readme]] | Requirements index and guide for the PocketCoach application | - |
| [[requirements/executive-summary]] | High-level non-technical summary in English for trainers and club leadership | - |
| [[requirements/executive-summary-de]] | Verständliche Management-Zusammenfassung auf Deutsch für Übungsleiter und Vorstand | - |
| [[requirements/overview-roles-auth]] | Overview of the application, additive roles, permissions, and registration | - |
| [[requirements/season-planning]] | Season setup, block planning, and the training themes library | - |
| [[requirements/sessions-and-assignment]] | Session structure, player groups, assignment tracks, surveys, and substitutions | - |
| [[requirements/views-and-notifications]] | Training plan and post-session notes, admin/coach dashboard, and notifications mapping | - |
| [[requirements/non-functional-requirements]] | Non-functional specifications (platforms, offline sync, scale, security, localization) and out-of-scope items | - |

## Codebase — Planning

| Page | Description | Sources |
|---|---|---|
| [[codebase/data-privacy-gdpr]] | GDPR compliance strategy, data residency, sub-processor agreements, and data erasure | - |
| [[codebase/feasibility-and-costs]] | Technical feasibility of the requirements and operational hosting cost estimations | - |
| [[codebase/implementation-plan]] | Testable 7-step Phase 1 implementation plan with migration order, component changes, and milestone criteria | - |
| [[codebase/risk-analysis]] | Primary project planning risks, user adoption hurdles, and mitigation strategies | - |

## Codebase — Architecture

| Page | Description | Sources |
|---|---|---|
| [[codebase/architecture/auth-and-onboarding]] | Authentication methods, invitation flow, JWT-based RLS, and calendar integration | - |
| [[codebase/architecture/database-schema]] | Phase 1 PostgreSQL schema (14 tables), ER diagram, RLS policies, and Phase 2 extension points | - |
| [[codebase/architecture/notification-system]] | Push + in-app notification architecture, event-to-recipient mapping, and Phase 2 email fallback plan | - |
| [[codebase/architecture/offline-and-pwa]] | Offline caching with TanStack Query + IndexedDB, Workbox service worker, and Phase 2 offline writes | - |
| [[codebase/architecture/substitution-flow]] | Race-condition-safe substitution workflow with SELECT FOR UPDATE, 48h escalation cron | - |
| [[codebase/architecture/system-architecture]] | Phase 1 system architecture — scope, resolved decisions, tech stack, high-level diagram, monorepo, feature modules | - |
