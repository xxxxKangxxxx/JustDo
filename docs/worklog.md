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

## 2026-04-28 Claude Code Handoff

### Codex

- Added `docs/claude_handoff.md` for the next Claude Code session.
- Summarized repository state, completed Codex work, verification results, known notes, and recommended next tasks.

### Notes

- Claude Code should treat `apps/web/` as the active implementation and `reference/proto/` as the primary behavioral reference.
- Continue recording cross-check decisions in this worklog.

## 2026-04-28 Phase 3 Local Data Layer

### Claude Code

- Added Vitest + Testing Library setup for `apps/web/` with `npm test` / `npm test:watch` and a root `npm run test:web`.
- Added `monthCalendar(year, month, weekStart)` and `weekdayLabels(weekStart)` helpers in `lib/date.ts`.
- Wired `settings.weekStart` into `home-screen.tsx` so the calendar grid and weekday header rotate correctly when the user toggles the start day.
- Verified that `priority` is consistently `high | medium | low` across `domain.ts`, `sample-data.ts`, `add-sheet.tsx`, `home-screen.tsx`, and `detail-screen.tsx` — no rename needed.
- Extracted persistence behind `JustDoStorage` interface in `features/just-do/persistence.ts` (`createLocalStorageStorage`, `createMemoryStorage`, `toPersisted`, `mergePersisted`).
- Refactored `store.tsx` to hydrate asynchronously via the storage interface (SSR-safe; ready for IndexedDB swap).
- Added unit tests:
  - `lib/date.test.ts` — iso/parse, addDays, addMonths, daysInMonth, firstWeekday, weekdayLabels, monthCalendar (Sun-first vs Mon-first), formatTime.
  - `features/just-do/selectors.test.ts` — tasksOnDate, tasksInRange, habitStreak.
  - `features/just-do/persistence.test.ts` — toPersisted/mergePersisted/createMemoryStorage.
- Verified `npm run lint`, `npm run build`, `npm test` all pass (36 tests).

### Notes

- Cross-check with Codex pending — Codex review of the Phase 3 changes can happen before Phase 4 work starts.
- Storage adapter is async by design so the IndexedDB implementation can drop in without changing the store. The current `localStorage` adapter still serializes the whole `Persisted` blob; a per-entity layer can wait until Supabase work shapes the access pattern.
- `view.sheet` and `view.detailTaskId` are intentionally excluded from persistence (always reset on reload).

## 2026-04-29 Backend Strategy 정리

### Claude Code

- v1은 Supabase로 빠르게 출시하고, 추후 자체 백엔드로 이전 가능성을 열어두는 방향으로 결정.
- `docs/backend_strategy.md` 신규 작성 — 이전 시 비싼 영역과 완화 원칙, 허용/금지 패턴, 이전 시점 판단 기준.
- `just_do_prd.md` 백엔드 칸과 참고 문서 섹션에 `backend_strategy.md` 링크 추가.
- `just_do_planning.md` 기술 스택 섹션에 "백엔드 전략" 단락 추가.
- `next_steps.md` Phase 4를 4-1 스키마/마이그레이션, 4-2 클라이언트/어댑터, 4-3 인증, 4-4 Realtime, 4-5 환경변수/보안으로 분해.

### Notes

- 모든 Phase 4 이후 백엔드/데이터 작업은 `backend_strategy.md`를 따른다.
- 컴포넌트가 `supabase.from(...)` 직접 호출 금지 — 어댑터 경유.
- 비즈니스 데이터 FK는 `public.users.id` 경유, `auth.users.id` 직접 참조 금지.
