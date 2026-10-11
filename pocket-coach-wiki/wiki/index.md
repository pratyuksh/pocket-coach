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
| [[requirements/season-planning]] | Season setup, sports hall locations, default season templates, block planning, and the training themes library | - |
| [[requirements/sessions-and-assignment]] | Session structure, hall locations, default junior schedule slots, player groups, assignment tracks (bulk assignment and regeneration rules), surveys, and substitutions | - |
| [[requirements/views-and-notifications]] | Training plan and post-session notes, admin/coach dashboard, trainer personal view (default view), and notifications mapping | - |
| [[requirements/non-functional-requirements]] | Non-functional specifications (platforms, offline sync, scale, security, localization) and out-of-scope items | - |

## Codebase — Planning

| Page | Description | Sources |
|---|---|---|
| [[codebase/data-privacy-gdpr]] | GDPR compliance strategy, data residency, sub-processor agreements, and data erasure | - |
| [[codebase/feasibility-and-costs]] | Technical feasibility of the requirements and operational hosting cost estimations | - |
| [[codebase/implementation-plan]] | Streamlined Phase 1 plan: delivered 1.1–1.4b, execution order for 1.4c (data), 1.4d (Modernist UI, i18n, light only), 1.6a, 1.5, 1.6b, pilot gate, Phase 2, and the 2026-10-11 decisions | `pocke-coach-design-prototype/PocketCoach.dc.html` |
| [[codebase/known-issues]] | Open problems found while hardening Phase 1 (invite security, assignment limits, test gaps), where each is scheduled, plan gaps decided or open, and what was resolved | - |
| [[codebase/risk-analysis]] | Primary technical risks (incl. database authorization and invite security) and mitigation strategies | - |

## Codebase — Architecture

| Page | Description | Sources |
|---|---|---|
| [[codebase/architecture/auth-and-onboarding]] | Authentication methods, target and current invitation flow, registration access rules, JWT-based RLS, and calendar integration | - |
| [[codebase/architecture/database-schema]] | Phase 1 PostgreSQL schema (16 tables), ER diagram, enforced RLS matrix, functions, triggers, constraints, migration history, and Phase 2 extension points | - |
| [[codebase/architecture/notification-system]] | Push + in-app notification architecture, event-to-recipient mapping, and Phase 2 email fallback plan | - |
| [[codebase/architecture/offline-and-pwa]] | Offline caching with TanStack Query + IndexedDB, Workbox service worker, and Phase 2 offline writes | - |
| [[codebase/architecture/substitution-flow]] | Race-condition-safe substitution workflow with SELECT FOR UPDATE, 48h escalation cron, coverage-based gaps and eligibility rules | - |
| [[codebase/architecture/system-architecture]] | Phase 1 system architecture — scope, resolved decisions, tech stack, high-level diagram, monorepo, feature modules | - |
