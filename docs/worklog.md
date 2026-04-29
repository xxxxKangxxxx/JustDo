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

## 2026-04-29 Phase 4-1: 스키마/마이그레이션

### Claude Code

- Supabase CLI 2.95.4 설치 (`brew install supabase/tap/supabase`).
- `supabase init`으로 `supabase/` 워크스페이스 + `config.toml` 생성.
- `supabase/migrations/20260429014750_init_schema.sql` 작성:
  - 12개 테이블, 모든 비즈니스 FK는 `public.users(id)` 경유.
  - `set_updated_at()` 트리거 함수를 5개 테이블에 부착.
  - `tasks`에 start/end_date 무결성 CHECK.
  - `handle_new_auth_user()` 트리거: 회원가입 시 `public.users` + 기본 카테고리 (`나`/`외부`) + Trial subscription 자동 생성.
  - 12개 테이블 RLS 활성화 + 37개 정책 (junction 테이블은 부모 ownership으로 검증).
- 로컬 검증: `supabase start` → 마이그레이션 자동 적용, 트리거 fanout 정상, RLS로 다른 사용자 격리 확인 (other-user 0건 / owner 1건), CASCADE 정상.
- `20260429021447_add_habit_emoji.sql` 추가: 도메인 `Habit.emoji`를 위한 컬럼 보강 (default `'🌱'`).

### Notes

- 추후 자체 백엔드 이전을 위해 `auth.users` 참조는 `public.users` 한 곳, `handle_new_auth_user` 트리거 한 곳으로 격리.
- Supabase 전용 SQL은 `auth.uid()`(RLS 정책)뿐 — 표준 Postgres만 사용.

## 2026-04-29 Phase 4-2: 클라이언트/어댑터

### Claude Code

- `@supabase/supabase-js` 의존성 추가.
- `lib/supabase/client.ts`에 브라우저 클라이언트 싱글턴 + 환경변수 검증.
- `apps/web/.env.local.example` 추가, 로컬 키로 `.env.local` 셋업.
- `supabase gen types typescript --local` → `lib/supabase/database.types.ts`.
- `JustDoStorage` 인터페이스를 per-entity로 확장:
  - `load()` + `saveSettings(s)` + `saveView(v)` + `upsertTask(t)` + `deleteTask(id)` + `upsertHabit(h)` + `setHabitLog(habitId, iso, value)`.
  - `createMemoryStorage` / `createLocalStorageStorage` 둘 다 새 인터페이스로 재구현 (공유 헬퍼: `applyMutation`, `upsertById`).
- `store.tsx` 리팩토링: 디바운스 전체 save 제거, 각 mutation에서 fire-and-forget으로 어댑터 호출. `hydratedRef` 가드로 첫 hydrate 전 mutation은 스킵.
- `features/just-do/supabase-mapping.ts`: 도메인 ↔ DB row 매핑 함수들 (`taskRowToDomain`, `taskDomainToInsert`, `habitRowToDomain`, `habitDomainToInsert`, `mergeHabitLogs`, `taskCategoryToName`).
- `features/just-do/supabase-storage.ts`: `createSupabaseStorage(client, userId)`로 `JustDoStorage` 구현. categories name→id 캐시 lazy 로드. settings/view는 v1 스키마에 자리가 없어 일단 no-op (Phase 4-3에서 보강).
- 테스트 52개 (이전 41 + 매핑 11) 모두 통과.

### Notes

- `Task.tags`는 어댑터에서 round-trip으로 빈 배열 처리 — `task_tags` 매핑은 Phase 4-3에서 auth와 함께.
- `Task.category` 도메인 enum (`me`/`ext`)은 DB `categories.name`(`나`/`외부`)에 매핑. 회원가입 트리거가 시드하는 이름이 변경되면 `taskCategoryToName` 도 같이 업데이트해야 함.
- `Habit.recur_type`은 v1 도메인에 아직 없어 어댑터에서 항상 `'daily'`로 insert. recurring 모델 정식화는 별도 작업.

## 2026-04-29 Codex 핸드오프 준비

### Claude Code

- `docs/claude_handoff.md` 를 Claude Code → Codex 방향으로 전면 재작성. Phase 진행 상태, 활성 검증, Phase 4-3 부터의 권장 순서, 자주 열어볼 파일 경로 정리.
- `docs/just_do_db_schema.md` 상단에 "마이그레이션이 source of truth" 노트 + Phase 4-1/4-2에서 보강된 항목 (`set_updated_at`, signup 트리거, 누락 RLS, `habits.emoji`) 명시.
- `docs/next_steps.md` 정리:
  - Phase 4-3 항목을 더 세분화 (`useAuth` 훅, OAuth 콜백, provider 활성화, storage 선택 로직, `Task.tags` round-trip 활성화, 테스트).
  - Phase 4-5 의 `.env.local.example` 항목은 done 표시. service-role 검증은 server action 도입 시점으로 미룸.
  - Open Decisions 갱신: 카테고리 네이밍은 결정, settings/view 원격 영속화 미결, `Habit.recur_type` 정식화 미결 추가.

### Notes

- Codex 가 다음 작업 시작 시 sanity check 명령 4개를 핸드오프에 적어둠 (`git status`, `supabase status`, `lint`, `build`, `test`).
- `apps/web/.env.local` 은 머신-로컬 키이므로 git 에 들어가지 않는다. 다른 환경에서 이어 작업하려면 `supabase status -o env` 로 재생성.
