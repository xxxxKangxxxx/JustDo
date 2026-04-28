# Just Do Next Steps

This document tracks the next implementation steps for Codex and Claude Code cross-checking.

## Current Ground Rules

- Treat `reference/proto/` as the primary UI and behavior reference.
- Treat `reference/screens/` and `reference/design-board.html` as visual support only.
- Do not build the real app inside `reference/`.
- Create new implementation directories under `apps/` when development starts.
- Record important implementation decisions and cross-check notes in `docs/worklog.md`.

## Phase 1: Repository Baseline

- [x] Organize existing planning and reference files.
- [x] Add README files explaining the project structure.
- [x] Add worklog for Codex/Claude Code coordination.
- [x] Connect local directory to the GitHub repository.
- [x] Make the first baseline commit and push to GitHub.

## Phase 2: Web App Bootstrap

- [x] Create `apps/web/` using Next.js, TypeScript, and Tailwind CSS.
- [x] Define initial domain types for Task, Habit, Category, and HabitLog-style logs.
- [x] Port the core design tokens from `reference/styles/tokens.jsx`.
- [x] Rebuild the app shell with Home, Stats, and Settings tabs.
- [x] Port the interactive calendar behavior from `reference/proto/home.jsx`.
- [x] Port basic Task/Habit add and edit flows from `reference/proto/sheet-detail.jsx`.

## Phase 3: Local Data Layer

- [ ] Replace prototype `localStorage` state with a typed local data layer.
- [ ] Use runtime dates instead of the fixed `2026-04-21` sample date.
- [ ] Normalize enum naming, especially `priority`: use `high`, `medium`, `low`.
- [ ] Implement calendar start weekday behavior from settings.
- [ ] Add focused tests for date range and calendar rendering helpers.

## Phase 4: Supabase Integration

- [ ] Create Supabase project configuration and environment variable documentation.
- [ ] Convert `docs/just_do_db_schema.md` into executable migrations.
- [ ] Enable RLS policies for all user-owned tables.
- [ ] Implement Supabase Auth with Apple and Google.
- [ ] Implement Realtime subscriptions for tasks, habits, and habit logs.

## Phase 5: Offline Sync

- [ ] Add IndexedDB storage for the web app.
- [ ] Track local mutations with `updated_at` timestamps.
- [ ] Implement Last Write Wins sync against Supabase.
- [ ] Add an offline status indicator in the UI.

## Phase 6: iOS Planning

- [ ] Create `apps/ios/` once the web domain model is stable.
- [ ] Map the shared domain model to Swift/SwiftUI.
- [ ] Plan Core Data entities from the Supabase schema.
- [ ] Implement WidgetKit small, medium, and large widgets based on `reference/screens/widgets.jsx`.

## Open Decisions

- [ ] Subscription pricing.
- [ ] Whether web and iOS share generated types from the Supabase schema.
- [ ] Whether Task Dependency visualization ships in v1 or remains v2.
- [ ] Final naming for categories beyond the default `[나]`, `[외부]`, and `Habit`.
