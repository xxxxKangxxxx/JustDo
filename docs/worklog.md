# Just Do Worklog

This document records coordination notes for work done with Codex and Claude Code.

## 2026-04-28

### Codex

- Organized the existing files into `docs/` and `reference/`.
- Set `reference/proto/` as the primary behavior/UI reference.
- Kept static design files under `reference/screens/` and `reference/design-board.html`.
- Renamed the interactive prototype HTML to `reference/interactive-prototype.html`.
- Added root and reference README files explaining the current structure.
- Initialized local Git repository on `main`.
- Connected Git remote `origin` to `https://github.com/xxxxKangxxxx/JustDo.git`.
- Added `.gitignore` and `docs/next_steps.md`.
- Created and pushed the baseline commit to `origin/main`.

### Notes

- Existing files are references only.
- Future app implementation should be created in a new directory, likely under `apps/`.
- The interactive prototype still uses fixed sample dates around `2026-04-21`; real implementation should use runtime dates.

## 2026-04-28 Web Bootstrap

### Codex

- Created `apps/web/` as the first real implementation target.
- Added Next.js, TypeScript, and Tailwind configuration.
- Ported the primary `reference/proto/` behavior into typed React components.
- Added local app state for Task/Habit CRUD, calendar selection, detail view, stats, and settings.
- Replaced the prototype's fixed `2026-04-21` date with runtime sample dates.
- Installed dependencies and upgraded the scaffold to Next.js 16.2.4 / React 19 after npm reported security issues on the original Next 14 target.
- Verified `npm run lint:web`, `npm run build:web`, and a local HTTP 200 response from the dev server.

### Notes

- `npm audit` still reports two moderate findings from Next's nested PostCSS dependency; `npm audit fix --force` recommends a breaking downgrade and was not applied.
- Supabase, IndexedDB, tests, and production data sync are not implemented yet.
