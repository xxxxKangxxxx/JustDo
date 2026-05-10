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

## 2026-04-29 Phase 4-3: 인증

### Codex

- `@supabase/ssr` 의존성 추가.
- `apps/web/src/lib/supabase/client.ts` 를 `createBrowserClient` 기반으로 전환하고, `apps/web/src/lib/supabase/server.ts` 에 cookie-aware server client 추가.
- `apps/web/src/lib/auth/useAuth.tsx` 추가:
  - 앱에는 `{ user, status, signInWithProvider, signOut }` 도메인 타입만 노출.
  - Supabase `getSession`, `onAuthStateChange`, `signInWithOAuth`, `signOut` 호출은 훅 내부로 격리.
- `apps/web/src/app/(auth)/callback/route.ts` 추가. 실제 URL은 route group 특성상 `/callback`.
- `JustDoProvider` 가 `userId` 를 받아 로그인 상태에서는 `createSupabaseStorage(client, userId)`, 게스트 상태에서는 기존 localStorage 어댑터를 사용하도록 변경.
- 새 task/habit 생성 ID를 Supabase UUID 컬럼과 호환되도록 `crypto.randomUUID()` 로 변경.
- Settings 계정 섹션에 Google/Apple 로그인 및 로그아웃 액션 연결.
- `supabase/config.toml` 에 Google/Apple OAuth provider env 참조와 callback redirect URL 추가.
- `apps/web/.env.local.example` 에 OAuth provider credential 키 추가.
- Supabase task tag round-trip 구현:
  - load 시 `task_tags(tags(name))` join 으로 `Task.tags` 채움.
  - upsert 시 `tags` lookup-or-create 후 `task_tags` upsert/delete 로 매핑 교체.
- 테스트 추가/갱신:
  - `lib/auth/useAuth.test.ts` — session mapping, OAuth redirect call helper.
  - `supabase-mapping.test.ts` — task tag mapping.

### Verification

- `supabase status` → local development setup running (Docker 접근은 권한 상승으로 확인).
- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass. 샌드박스에서는 Turbopack 포트 바인딩 제한으로 실패하여 권한 상승으로 재실행.

### Notes

- 실제 Google/Apple OAuth 로그인과 signup fanout (`public.users`, 기본 categories, Trial subscription) 검증은 provider credential 값을 `.env.local` 또는 hosted Supabase dashboard에 넣은 뒤 진행해야 한다.
- `settings` / `view` 의 원격 영속화는 여전히 미결이며 Supabase 어댑터에서 no-op 상태다.

## 2026-04-29 Phase 4-3: 로컬 OAuth 검증 / 중복 저장 보정

### Codex

- 사용자가 Google Cloud Console에서 JustDo 전용 OAuth client 를 생성하고 `.env.local` 에 값을 반영.
- `.env.local` 을 shell 환경변수로 로드한 상태에서 `supabase stop && supabase start` 를 실행해 로컬 Auth 컨테이너에 Google provider 값을 반영.
- Google OAuth 로그인 성공 후 로컬 DB에서 signup fanout 확인:
  - `auth.users` row 생성.
  - `public.users` row 생성 (`display_name`, `avatar_url` 포함).
  - 기본 categories `나` / `외부` 생성.
  - `user_subscriptions` trial row 생성.
- 앱에서 task/habit 생성 및 habit check 후 원격 저장 확인:
  - `tasks` 저장 확인.
  - `habits` 저장 확인.
  - `habit_logs` 저장 확인.
- React dev/StrictMode에서 `setState` updater 내부 side effect가 두 번 실행될 수 있어 task/habit 원격 insert가 중복되는 문제를 확인.
- `store.tsx` mutation handlers 를 보정:
  - `setState` updater 내부에서 `persist*` 호출 제거.
  - 생성/수정/삭제/토글 payload 를 이벤트 핸들러에서 먼저 계산하고 state update 후 한 번만 persistence 호출.
- 날짜/시간 입력 UI는 현재 브라우저 기본 `input type="date"` / `input type="time"` 사용. custom picker 개선은 UX backlog 로만 기록.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.

## 2026-04-29 Phase 4-3: 인증 상태 UI 정리

### Codex

- `useAuth` 반환값에 `error` / `clearError` 추가.
- `getSession`, `signInWithProvider`, `signOut` 실패를 auth error state 로 반영.
- `lib/auth/providers.ts` 추가:
  - Google provider 는 기본 활성.
  - Apple provider 는 `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` 일 때만 활성.
- Settings 계정 섹션 개선:
  - 인증 상태 (`확인 중` / `로그인됨` / `게스트`) 표시.
  - profile detail 을 실제 auth user metadata/email 기반으로 표시.
  - auth error 메시지를 계정 섹션 안에 표시.
  - Google 로그인은 활성, Apple 로그인은 credential 준비 전 비활성 상태로 표시.
  - 로그아웃 실패도 auth error 로 표시.
- `.env.local.example` 에 client-visible provider switch 추가:
  - `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`
  - `NEXT_PUBLIC_AUTH_APPLE_ENABLED=false`

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 UX Fix: Stats Navigation Scope

### Codex

- 하단 탭을 `홈 / 습관 / 설정` 3개로 단순화하고 `통계` 탭 제거.
- 기존 통계 화면을 설정 화면의 `리포트 > 활동 요약` 메뉴로 이동.
- 활동 요약은 직접 habit log 를 조작하는 화면이 아니라 보조 리포트로 역할 변경:
  - 월간 Task 완료 수/완료율.
  - Task 카테고리별 완료율.
  - 오늘 Habit 완료 수, 최근 7일 Habit 완료율, 상위 streak.
- 기존 localStorage 에 `tab: "stats"` 가 남아 있는 경우 `settings` 로 복구하도록 migration guard 추가.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 56 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Phase 5-1: IndexedDB Web Storage

### Codex

- `createIndexedDBStorage` 추가.
  - DB: `just-do-web`
  - store: `snapshots`
  - record key: `state`
  - 저장 형태는 기존 `Persisted` snapshot 그대로 유지.
- `createSnapshotStorage` 추가.
  - async snapshot read/write backend 를 `JustDoStorage` mutation API 로 감싸는 공통 adapter.
  - IndexedDB 외에도 향후 cache/migration 테스트에 재사용 가능.
- 게스트/로컬 기본 저장소를 IndexedDB 우선으로 변경.
  - IndexedDB 사용 불가 환경에서는 기존 `localStorage` adapter 로 fallback.
- IndexedDB reset 절차를 `docs/local_dev.md` 에 추가.
- `docs/next_steps.md`, `docs/claude_handoff.md` Phase 5 상태 갱신.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 58 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Phase 5-2: Local Mutation Queue

### Codex

- Local mutation queue 타입 추가:
  - `QueuedMutation = { id, updatedAt, mutation }`
  - mutation names: `task_upsert`, `task_delete`, `habit_upsert`, `habit_log_set`
- `JustDoStorage` 에 optional queue API 추가:
  - `listQueuedMutations`
  - `removeQueuedMutation`
  - `clearQueuedMutations`
- `createSnapshotStorage` 가 task/habit write 후 pending mutation 을 함께 기록하도록 확장.
- IndexedDB schema version 을 2로 올리고 `mutations` object store 추가.
- `docs/widget_sync_strategy.md` 에 web/iOS 공통 mutation event name 과 queue shape 기록.
- `docs/next_steps.md`, `docs/claude_handoff.md` Phase 5 상태 갱신.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 59 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Phase 5-3: Supabase Queue Flush

### Codex

- `replaceSnapshot` storage hook 추가.
  - remote snapshot/realtime payload 를 로컬 snapshot 에 반영할 때 queue 를 새로 만들지 않기 위한 경로.
- `flushQueuedMutations(local, remote)` 추가.
  - `updatedAt` 순서로 local queue 를 읽고 Supabase storage mutation API 에 순차 적용.
  - remote write 성공 후 해당 queue item 제거.
  - 실패 시 남은 queue 유지.
- `createSyncedStorage(local, remote)` 추가.
  - load 시 pending queue 가 없으면 Supabase snapshot 을 local IndexedDB 에 mirror.
  - pending queue 가 있으면 local snapshot 을 우선 사용하고 background flush 시도.
  - task/habit write 는 local-first 로 반영한 뒤 Supabase flush.
  - Realtime remote change 는 local snapshot 에 queue 없이 mirror.
- 로그인 사용자 storage 경로를 Supabase 직접 사용에서 per-user IndexedDB + Supabase synced storage 로 변경.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 62 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Phase 5-4: Sync Status UI

### Codex

- Store-level sync status 추가:
  - `isOnline`
  - `isSyncing`
  - `pendingCount`
- 브라우저 `online` / `offline` 이벤트를 구독해 연결 상태 반영.
- persistence 작업 완료 후 queue length 를 다시 읽어 pending count 갱신.
- 온라인 복귀 시 storage load 를 트리거해 queued mutation flush 를 재시도하고 pending count 갱신.
- Settings > 동기화 섹션을 확장:
  - 연결 상태: `온라인` / `오프라인`
  - 저장 상태: `정상` / `동기화 중` / `대기 중` / `오프라인` / `확인 필요`
  - 대기 중인 변경 수
- `docs/next_steps.md` Phase 5 완료 항목 갱신.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 62 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Phase 4-3: 저장 오류 표시

### Codex

- `JustDoProvider` 에 store-level `syncError` / `clearSyncError` 추가.
- hydrate 실패와 모든 persistence mutation 실패를 `syncError` 로 캡처.
- 개발 모드에서는 storage error 를 `console.error` 로도 출력.
- 성공한 persistence operation 은 기존 오류를 clear.
- Settings 화면에 `동기화` 섹션 추가:
  - 저장 상태 `정상` / `확인 필요` 표시.
  - 저장 오류 메시지 표시.
  - 오류 지우기 액션 제공.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Local Dev 데이터 정리 절차

### Codex

- `supabase/scripts/reset_local_app_data.sql` 추가.
  - 로컬 테스트 `auth.users` 를 삭제.
  - FK cascade 로 `public.users`, categories, tags, tasks, habits, habit_logs, subscriptions 등 user-owned app data 정리.
  - 실행 전/후 주요 테이블 count 를 출력.
- root `package.json` 에 `npm run db:reset-local-app-data` 스크립트 추가.
- `docs/local_dev.md` 추가:
  - 로컬 Supabase 앱 데이터 reset 절차.
  - 브라우저 `localStorage` 정리 참고.
  - hosted/shared DB 에서 실행하지 말라는 경고.
- `README.md` 에 로컬 Supabase 시작과 app data reset 명령 추가.

### Verification

- `npm run db:reset-local-app-data -- --help` 로 스크립트 명령 경로와 Supabase CLI flag 인식 확인.
- 실제 데이터 삭제 실행은 하지 않음.

## 2026-04-29 Phase 4-4: Realtime

### Codex

- `supabase/migrations/20260429052000_enable_realtime.sql` 추가.
  - `tasks`, `habits`, `habit_logs` 에 `replica identity full` 설정.
  - 세 테이블을 `supabase_realtime` publication 에 추가.
- `JustDoStorage.subscribe(callback)` 인터페이스 확장.
- `RemoteChange` 도메인 이벤트 타입 추가:
  - `task_upserted` / `task_deleted`
  - `habit_upserted` / `habit_deleted`
  - `habit_log_set`
  - `error`
- localStorage / memory adapter 는 no-op unsubscribe 를 반환.
- Supabase adapter 에 Realtime 구독 추가:
  - `tasks`: INSERT/UPDATE/DELETE 를 Task 도메인 이벤트로 매핑.
  - `habits`: INSERT/UPDATE/DELETE 를 Habit 도메인 이벤트로 매핑.
  - `habit_logs`: INSERT/UPDATE/DELETE 를 habit log set 이벤트로 매핑.
- `store.tsx` 가 `activeStorage.subscribe` 를 사용해 remote event 를 앱 state 에 반영하도록 연결.
- Realtime subscription error 는 기존 `syncError` 경로로 표시.

### Verification

- `supabase migration up` → `20260429052000_enable_realtime.sql` 로컬 DB 적용.
- `pg_publication_tables` 확인 → `tasks`, `habits`, `habit_logs` 가 `supabase_realtime` publication 에 등록됨.
- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.

### Notes

- 현재 Realtime 범위는 task/habit/habit_logs 본문이다. `task_tags` / `tags` join 변경은 realtime 이벤트로 아직 즉시 반영하지 않는다.
- 같은 클라이언트에서 발생한 change echo 는 idempotent upsert/delete 로 처리한다.

## 2026-04-29 Widget Sync Strategy

### Codex

- `docs/widget_sync_strategy.md` 추가.
- 위젯을 passive view 가 아니라 short-lived write client 로 정의.
- 목표 구조 명시:
  - Widget tap → App Intent → shared iOS data layer / sync client → Supabase write.
  - Open web/iOS clients 는 Realtime 으로 즉시 반영.
  - Closed clients 는 next load/sync 에 반영.
- WidgetKit 은 지속 Realtime 구독 클라이언트가 아니므로 App Group cache + mutation queue 가 필요하다고 정리.
- Task complete / Habit check 의 durable write path 와 Realtime event 요구사항 기록.
- `just_do_planning.md`, `just_do_prd.md`, `next_steps.md` 에 위젯 동기화 원칙과 추후 iOS 계획 반영.

### Notes

- 다음 Realtime 보강은 `tags` / `task_tags` 반영.
- iOS 구현 전 결정 필요:
  - Core Data only vs App Group snapshot 병행.
  - Widget App Intent 가 직접 network write 를 시도할지, queue-first 로 갈지.
  - mutation queue schema.

## 2026-04-29 Phase 4-4: Tags Realtime 보강

### Codex

- Realtime publication 범위에 `tags`, `task_tags` 추가.
- `tags`, `task_tags` 에 `replica identity full` 설정.
- Supabase storage adapter 보강:
  - task INSERT/UPDATE realtime payload 처리 시 raw row만 매핑하지 않고 task를 `categories` + `task_tags(tags)` join 으로 재조회.
  - `task_tags` INSERT/UPDATE/DELETE 발생 시 해당 `task_id` 를 재조회해 `Task.tags` 최신 상태 반영.
  - `tags` UPDATE/DELETE 발생 시 연결된 task들을 재조회해 tag name/removal 반영.
  - Realtime task reload 중 task가 없으면 `task_deleted` 이벤트로 처리.
- 로컬 DB는 이미 `20260429052000_enable_realtime.sql` 이 적용된 상태였기 때문에, 같은 변경을 `supabase db query` 로 보정 적용.

### Verification

- `pg_publication_tables` 확인 → `tasks`, `tags`, `task_tags`, `habits`, `habit_logs` 가 `supabase_realtime` publication 에 등록됨.
- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Supabase Cloud 연결

### Codex

- Supabase CLI 로그인 확인.
- Hosted Supabase project 확인:
  - name: `JustDo`
  - ref: `cohkxnwsbhrsfmsjqdpa`
  - URL: `https://cohkxnwsbhrsfmsjqdpa.supabase.co`
  - region: Northeast Asia (Seoul)
- 로컬 workspace 를 hosted project 에 link:
  - `supabase link --project-ref cohkxnwsbhrsfmsjqdpa`
- Hosted DB 에 migrations push:
  - `20260429014750_init_schema.sql`
  - `20260429021447_add_habit_emoji.sql`
  - `20260429052000_enable_realtime.sql`
- Hosted DB 확인:
  - public 테이블 12개 생성 확인.
  - `supabase_realtime` publication 에 `tasks`, `tags`, `task_tags`, `habits`, `habit_logs` 등록 확인.
- Hosted DB 기준으로 `apps/web/src/lib/supabase/database.types.ts` 재생성.
- `docs/supabase_cloud_setup.md` 추가:
  - cloud/local env 전환 방법.
  - Google OAuth hosted redirect URI.
  - hosted signup fanout 검증 SQL.
  - 새 머신에서 link/typegen 하는 방법.

### Notes

- `supabase/.temp/` 는 gitignored 이므로 link metadata 는 커밋되지 않는다.
- `apps/web/.env.local` 은 아직 gitignored local file 이다. cloud 테스트 시 콘솔의 anon/public key 로 교체해야 한다.
- Hosted Google OAuth provider 는 Supabase Console 에서 별도로 활성화/설정해야 한다.

## 2026-04-29 Phase 4-5: Env / Security Audit

### Codex

- Env/import audit 실행:
  - `SUPABASE_SERVICE_ROLE_KEY` 직접 참조는 server-only helper 외 없음.
  - client/browser Supabase 경로는 `NEXT_PUBLIC_SUPABASE_URL` + anon key 만 사용.
- `server-only` dependency 추가.
- `apps/web/src/lib/supabase/server.ts` 에 `import "server-only"` 추가.
- `apps/web/src/lib/supabase/service-role.ts` 추가.
  - `SUPABASE_SERVICE_ROLE_KEY` 를 읽는 유일한 helper.
  - `createClient` 는 `persistSession: false`, `autoRefreshToken: false`.
  - client import 시 build failure 가 나도록 `server-only` 로 보호.
- `docs/supabase_cloud_setup.md` 에 service role boundary 문서화.
- `docs/next_steps.md` Phase 4-5 완료 항목 갱신.

### Verification

- `rg "SUPABASE_SERVICE_ROLE_KEY|service-role|server-only|process\\.env" apps/web/src ...` 로 env/import 경로 점검.
- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.
- Build output scan:
  - 실제 `.env.local` 의 `SUPABASE_SERVICE_ROLE_KEY` 값이 `apps/web/.next` 안에 없음.
  - `SUPABASE_SERVICE_ROLE_KEY` / `service-role` 문자열이 `.next/static` 및 `.next/server/app` JS 산출물에 없음.

## 2026-04-29 UX Fix: Habit Calendar / Task Date Range

### Codex

- Home calendar/list 에서 Habit 노출을 제거하고 Task 중심 화면으로 정리.
- Habit 전용 탭 추가:
  - 선택 날짜 기준 daily completion 요약.
  - 습관별 체크 리스트.
  - 최근 7일 grid 에서 날짜별 habit log 토글.
- Habit 탭의 추가 버튼은 Add Sheet 를 Habit 입력 모드로 연다.
- Task 추가/수정 시 시작일을 종료일 이후로 변경하면 종료일을 시작일로 자동 보정.
- Submit 직전에도 `endDate >= startDate` 를 보장하도록 저장 payload 보정.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 55 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-29 Habit.recur_type 도메인 정식화 결정

### Claude Code (with user)

- 결정: **옵션 B — v1 에 daily + weekly 구현, monthly 는 v2** (Phase 5.7).
- 도메인 추가:
  - `Habit.recurType: 'daily' | 'weekly'`
  - `Habit.recurDays?: number[]` (weekly 시 활성 요일, 0=일~6=토)
- v1 미포함 (v2):
  - `'monthly'` recur 타입 (매월 1일 / 매월 마지막 일 / 매월 첫째 X요일
    등 변형 복잡도 높음).
  - `recur_end_date` 도메인 노출 (DB 컬럼은 schema 에 이미 존재).
- 근거:
  - PRD/planning 명시: Habit 반복 주기는 *필수* 필드 (`prd.md:91`,
    `planning.md:64`).
  - 한국 시장에서 weekly 빈도 매우 높음 (운동 월/수/금, 주말 산책 등).
    v1 부재 시 경쟁 (Todomate / Habitify) 대비 critical gap.
  - monthly 는 흔하지 않음. 복잡도 대비 ROI 낮음. v2 로 미루는 게 자연스러움.
  - 카테고리 (Phase 5.5) 와 인접한 도메인 모델 변경이라 함께 집행 시
    iOS mirror 한 번에 안정화.
- 어댑터 빚 정리:
  - `habitDomainToInsert` 의 hardcoded `'daily'` 제거.
  - `habitRowToDomain` 이 recur 정보 보존.
  - `'monthly'` row 진입 시 'daily' 폴백 + 경고 (방어적, v1 에선 일어날
    수 없는 케이스).
- UI 변경 핵심:
  - Add Sheet habit 모드: 매일/매주 segment + 요일 picker (weekly 시
    최소 1개 선택 필수).
  - Habit 화면 `LAST 7 DAYS` grid: 비활성 요일 셀 disabled.
  - `DAILY CHECK` 분모: 선택 날짜에 활성인 habit 만 카운트.
  - `habitStreak`: 비활성 요일 skip (break 가 아닌 skip 으로 처리).
- 비용: 2~3일.

### Notes

- Add Sheet 가 현재 habit 의 *edit 모드* 를 지원 안 함 (task edit 만
  지원). 5.7 작업 시 habit edit 모드 추가 여부 함께 결정.
- v2 진입 시 enum 확장 (`| 'monthly'`) 만으로 도메인 깨짐 없음. iOS
  mirror 도 enum 확장만 하면 됨.

## 2026-04-29 settings/view 원격 영속화 결정

### Claude Code (with user)

- 결정: **옵션 C — `public.users.preferences jsonb` 컬럼 추가** (Phase 5.6).
- 동기화 필드 분류:
  - **원격 (preferences jsonb)**: `weekStart` (v1 단 하나).
  - **영구 device-local**: `notify`, `notifyTime`, `dark`, `view.tab`,
    `view.year`, `view.month`, `view.selectedDate`. 기기 컨텍스트마다
    다른 게 자연스러움.
  - **기존 원격**: `plan` 은 `public.user_subscriptions` 그대로 사용.
- 인프라 선택 근거:
  - 별 테이블 (`public.user_settings`) 은 1:1 관계라 over-normalization.
  - JSONB 컬럼 1개면 향후 cross-device 필드 추가 시 *migration 없이*
    JSONB 키만 늘리면 됨.
- 동작 정책:
  - Realtime 미포함. 다음 load 시 반영으로 충분.
  - 게스트 → 로그인 전이 시 localStorage 의 `weekStart` 를 1회 원격에
    push (서버 값이 default 일 때만). 이후 원격 우선.
  - 어댑터의 `saveSettings(settings)` 가 cross-device 필드만 추출해
    preferences 로 라우팅, 나머지는 device-local 유지.
- 비용: 0.5~1일 (Phase 5.5 와 독립).
- 진입 시점: Phase 5.5 완료 후 Phase 6 iOS 시작 전.

### Notes

- 향후 multi-device UX 에서 *왜 이 필드는 동기화 안 되지?* 라는 사용자
  피드백이 나오면 그 시점에 jsonb 키 추가로 대응. 가설은 `weekStart`
  외에 동기화 요구가 거의 없다는 것.

## 2026-04-29 카테고리 사용자 변경 결정

### Claude Code (with user)

- 결정: **v1 에 풀 카테고리 CRUD 도입, Pro 게이팅 없음**.
- 새 phase 분리: **Phase 5.5 Category Management**. Phase 6 iOS 시작
  전 완료 필수 (도메인 모델 변경이 iOS mirror 보다 먼저 확정돼야 함).
- 색상 입력 방식: **v1 부터 custom hex picker 지원** (preset 8색 +
  hex 입력 동시 제공). 사용자가 자유롭게 색을 고르되 light/dark 모드별
  (solid, soft, ink) 자동 보정 로직이 필요.
- 카테고리 개수: **무제한**. 검색은 v1 에 미포함. 정렬은 사용자가 직접
  reorder 만 가능.
- Habit: 별개 트랙 유지. `Habit.category = "habit"` 그대로. 시각적
  정체성도 사용자 카테고리와 분리.
- 도메인 모델 변경 핵심:
  - `TaskCategory = "me" | "ext"` enum 폐기.
  - `Task.category` → `Task.categoryId: string | null` (FK to
    categories.id, on delete set null).
  - `AppState` 에 `categories: Category[]` 추가.
- 디자인 토큰 재설계:
  - 현 `tokens[mode].me/ext` 직접 참조 (수십 곳) 를 `categoryStyle(
    category, mode)` 헬퍼로 통일.
  - hex picker 출력 → HSL 기반 light/dark (solid, soft, ink) 자동 계산.
- 마이그레이션 / 데이터 호환성:
  - 호스티드 supabase 시드 row 에 `is_default = true` 백필.
  - signup trigger 수정으로 신규 가입자도 동일 마킹.
  - 게스트 localStorage 데이터 hydration 정책은 5.5-5 에서 결정.
- PRD / planning / schema 문서 me/ext 서술 갱신은 Phase 5.5 작업의
  일부로 포함.

### 비용 추정

솔로 개발 기준 약 6~7일 (custom hex picker 의 contrast 자동 계산 +
토큰 시스템 마이그레이션이 가장 큰 비중).

### Notes

- 카테고리 자유 편집은 한국 시장 경쟁자 (Todomate / TickTick 등) 의
  기본 기대치. 차별점이 아니라 "기본 기능" 으로 포지셔닝.
- v1 출시 후 사용자 피드백 보고 v1.x 에 카테고리 그룹화 / 아이콘 등
  추가 기능 검토.

## 2026-04-29 Task Dependency 시각화 v1 포함 여부 결정

### Claude Code (with user)

- 결정: **v1 미포함, v2 로 유지** (PRD/planning 의 기존 결정 재확인).
- 근거:
  - `docs/just_do_prd.md:214,281` 과 `docs/just_do_planning.md:150,323`
    이 이미 v2 + Pro 전용으로 명시.
  - 시각화 (간트차트 / 플로우차트) 가 진짜 비용. react-flow 등 라이브러리
    도입 + 모바일 viewport 디자인 + Pro 게이팅 UI 합치면 1~2주.
  - v1 의 차별점은 "위젯 + 오프라인 sync + iOS-first". dependency
    시각화는 이 차별점에 보탬 안 됨.
  - Todomate 등 경쟁자도 dependency 시각화 미제공 — 시장 합의상 v1 필수
    기능 아님.
- 현재 상태:
  - `task_dependencies` 테이블은 `20260429014750_init_schema.sql` 에서
    이미 생성, RLS 활성화. v1 동안 idle 상태로 둠.
  - 도메인 모델 / 어댑터 / UI 는 v2 작업 시 함께 추가.
- v2 진입 전 점검 항목:
  - `task_dependencies` 테이블 컬럼 확장 필요 여부 (예: `kind:
    'blocks' | 'related'`). 현재는 prev/next 단순 구조라 확장 시 추가
    migration 가능.

## 2026-04-29 Web/iOS 타입 공유 방식 결정

### Claude Code (with user)

- v1 전략: **각 플랫폼이 로컬에서 mirror**.
  - Web: `supabase gen types typescript --local` 로 `database.types.ts`
    자동 생성 (이미 사용 중).
  - iOS: Swift Codable struct 를 손으로 작성. 위치는 Phase 6 시작 시
    결정 (예: `apps/ios/Sources/Models/Database.swift`).
- iOS 손-mirror 보조 장치:
  - migration PR 체크리스트에 Swift struct 동시 수정 항목 추가.
  - drift 감지 unit test — Supabase REST `/rest/v1/` 메타 또는
    `database.types.ts` 와 Swift struct 의 컬럼명/타입 비교.
- 자동화 도입 트리거:
  - migration 10회 이상 누적, 또는
  - schema drift 로 인한 iOS 런타임 버그 2회 이상 발생.
- 자동화 시 우선 접근법: `database.types.ts` AST 파싱 → Swift emit
  (web 빌드와 source of truth 일치, single pipeline 유지).
- 근거:
  - Supabase 가 공식 Swift codegen 을 제공하지 않음.
  - 우리 schema (12 테이블) 기준 손-mirror 초기 비용 ~1시간, migration
    당 5~10분. 자동화 break-even 약 15~20회 migration.
  - WidgetKit / App Intents 가 Swift only 이므로 iOS 본체도 Swift/
    SwiftUI. 따라서 "공유" 는 코드 공유가 아닌 *schema mirror* 의 문제.

### Notes

- iOS 자체는 v1 부터 Swift. "추후 Swift 로 전환" 의 실제 의미는 손-
  mirror → 자동 codegen 전환.
- 자동화가 이루어지더라도 도메인 타입 (`Task`, `Habit` 등) 은 두
  플랫폼이 각자 자신의 언어로 직접 작성하는 정책 유지.

## 2026-04-29 Pricing 결정

### Claude Code (with user)

- v1 구독 가격 결정: **월 ₩1,900 / 연 ₩9,900**.
- 근거:
  - Todomate 의 월 ₩1,500 / 연 ₩7,500 대비 살짝 상위 포지션. "위젯 +
    오프라인 sync + iOS-first" 차별점으로 ₩400/월 프리미엄 정당화.
  - Apple Tier 2 (₩1,900) 표준 티어 사용해 운영 단순화. 연간은 커스텀
    가격.
  - 연 환산 월 ₩825 — 충동구매 영역 유지.
  - Apple 30% 수수료 후 월 ₩1,330 / 연 ₩6,930. 마진 안전선 확보.
- `next_steps.md` Open Decisions 에서 가격 항목 닫음.

### Notes

- 한국 마켓이 1차 타깃이라 환율/지역별 가격은 v1 단계에서 고려하지 않음.
- 출시 후 conversion / churn 보고 6개월 시점에 인상/프로모션 재검토.

## 2026-04-29 Phase 5 후속: Offline Sync 검증 + Task Tag UI

### Claude Code

- Offline → online 사이클 회귀 테스트 추가
  - `apps/web/src/features/just-do/persistence.test.ts` 에 두 케이스 보강:
    - `drains accumulated offline mutations after the remote recovers`:
      remote 가 일시적으로 fail 하다가 회복되면 큐가 비워지고 remote
      snapshot 에 누적 mutation 이 모두 적용되는지 확인.
    - `flushes queued mutations in updatedAt order`: upsert/delete 가
      삽입 순서대로 remote 에 적용됨을 검증.
- 수동 검증 절차 문서화
  - `docs/local_dev.md` 에 Chrome DevTools 기반 오프라인→온라인
    체크리스트 추가 (IndexedDB 큐, Settings → 동기화, Supabase Console
    확인 포함).
- Task tag UI 추가 (`apps/web/src/features/just-do/add-sheet.tsx`):
  - 새 chip 입력 필드. Enter / 콤마로 commit, blur 시에도 commit, 빈
    상태에서 Backspace 시 마지막 칩 삭제, 칩 클릭 시 제거.
  - 카테고리 색을 따라가는 chip 스타일 (`t[category].soft` /
    `t[category].ink`).
  - editTask 인 경우 기존 `task.tags` 로 초기화. submit 시 미커밋된
    draft 도 함께 반영.
- 순수 헬퍼 분리 + 테스트
  - `apps/web/src/features/just-do/tags.ts`: `parseTagInput`,
    `mergeTags` (insertion-order 보존, dedup).
  - `apps/web/src/features/just-do/tags.test.ts`: trim/empty/dedup/
    immutable 케이스.
- `NewTaskInput.tags?: string[]` 추가, `addTask` 가 spread 후
  `tags: input.tags ?? []` 로 명시 보강 (이전 로직은 spread 가
  `undefined` 를 덮어쓸 위험이 있었음).

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 70 tests pass.
- `npm --prefix apps/web run build` → pass.

### Notes

- Tag UI 는 Supabase 어댑터의 기존 `replaceTaskTags` round-trip 위에서
  작동. 별도 백엔드 변경 없음.
- 수동 오프라인 검증은 cloud Supabase 환경에서 사용자가 직접 실행하는
  체크리스트로 남겨둠 (`docs/local_dev.md`).

## 2026-04-29 세션 종료 / 다음 세션 핸드오프

### Claude Code (with user)

- 오늘 세션 범위:
  1. Phase 5 후속 — Task Tag UI + offline sync 회귀 테스트 + manual
     verification 문서.
  2. v1 의 6개 open decision 모두 결정 (가격, 타입 공유, dependency,
     카테고리, settings 영속화, habit recur).
  3. Phase 5.5 / 5.6 / 5.7 작업 스펙을 `next_steps.md` 에 추가.
- 작업 마무리 상태:
  - 워킹트리 *uncommitted*. 다음 세션이 분리해서 커밋할 수 있도록
    grouping 안을 `claude_handoff.md` "Working Tree State" 에 남겨둠.
  - `npm --prefix apps/web run lint` / `test` (70 pass) / `build`
    모두 pass.
- 다음 세션 진입 권장 순서:
  1. (필요 시) 워킹트리 커밋 — `claude_handoff.md` 의 grouping 안 참조.
  2. Phase 5.5 부터 구현 시작. 도메인 모델 변경이 가장 크므로 5.5 →
     5.6 → 5.7 순서 유지.
  3. 세 sub-phase 완료 후 Phase 6 iOS 진입.
- 핸드오프 시 가장 주의할 부분:
  - Phase 5.5 가 `TaskCategory = "me" | "ext"` enum 을 폐기. 그 위에
    카테고리 색상 토큰 시스템 재설계 (custom hex picker + HSL 보정) 가
    가장 큰 비중. UI 사용처가 수십 곳이라 일괄 마이그레이션 필요.
  - Phase 5.5 / 5.6 / 5.7 각각 IndexedDB 스키마 / mutation queue 확장이
    필요할 수 있음. 셋이 합쳐서 IndexedDB version `2 → 3` 한 번만
    bump 하도록 조율할 것.
  - 모든 v1 결정 매트릭스는 `claude_handoff.md` 의 "v1 Open Decisions —
    all closed" 표 한 장에 압축. 오늘 chat 을 replay 할 필요 없음.

## 2026-04-30 Phase 5.5: Category Management 시작

### Codex

- `TaskCategory = "me" | "ext"` enum 제거. `Task.category` 를
  `Task.categoryId: string | null` 로 전환.
- `Category` 도메인 타입과 `AppState.categories` 추가.
- legacy guest/local snapshots 의 `category: "me" | "ext"` 를 기본
  seed category id (`cat_me`, `cat_ext`) 로 hydration 중 자동 매핑.
- `categoryStyle(category, mode)` 추가:
  - category hex color 를 light/dark 의 `solid`, `soft`, `ink` 로 변환.
  - Home, Detail, Stats, Add Sheet, primitives 의 `tokens.me/ext`
    직접 참조를 동적 category style 로 교체.
- Supabase adapter 변경:
  - categories load/upsert/delete 추가.
  - task mapping 이 `category_id` 를 직접 보존.
  - `taskCategoryToName` / `nameToTaskCategory` 제거.
  - categories realtime channel 추가 (`category_upserted`,
    `category_deleted`).
- Offline queue 확장:
  - `category_upsert`, `category_delete` mutation 추가.
  - IndexedDB snapshot mutation 과 `flushQueuedMutations` 경로 연결.
- Settings → 카테고리 관리 화면 추가:
  - category rename, preset 8색, hex 직접 입력, 숨김 native color picker,
    delete.
  - 마지막 category 삭제 방지.
  - reorder 는 v1 초기 구현으로 화살표 버튼 제공. 실제 drag
    interaction 은 polish 결정으로 남김.
- Migration 추가:
  - `20260430090000_category_management.sql`
  - `categories.position`, `categories.is_default` 추가 및 기존 seed row
    백필.
  - signup trigger 가 기본 category 를 `is_default = true`, position
    0/1 로 생성.
  - `categories` realtime publication 등록.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 71 tests pass.
- `npm --prefix apps/web run build` → pass (sandbox Turbopack port 제한으로
  권한 상승 재실행).
- `supabase db push` → hosted project 에
  `20260430090000_category_management.sql` 적용.
- linked DB schema check → `categories.is_default`, `categories.position`
  존재 확인.

### Notes

- `docs/just_do_db_schema.md` 는 categories 스키마를 갱신함.
- `docs/just_do_prd.md`, `docs/just_do_planning.md` 의 me/ext 제품 서술은
  아직 남은 문서 정리 항목.
- 구버전 IndexedDB/localStorage snapshot 에 `categories` 가 없는 경우에도
  mutation 경로에서 자동 normalize 하도록 보강. 첨부된
  `findIndex` 오류의 직접 원인.
- 새로고침 시 Auth loading 동안 guest/sample state 가 먼저 렌더링되며
  캘린더에 다른 UI가 보이는 flicker 를 방지하기 위해 Auth/Storage
  hydration 완료 전에는 loading viewport 를 표시하도록 변경.
- Supabase categories load 는 구버전 스키마(`is_default`, `position`
  미적용)에서도 읽기 fallback 을 수행하도록 보강.
- Local Supabase stack 을 다시 시작하고
  `20260430090000_category_management.sql` 을 적용. local DB schema check
  에서 `categories.is_default`, `categories.position` 존재 확인.

## 2026-04-30 Phase 5.6: User Preferences Sync

### Codex

- Migration 추가:
  - `20260430103000_user_preferences.sql`
  - `public.users.preferences jsonb not null default '{}'::jsonb` 추가.
  - 기존 `users_select_self` / `users_update_self` RLS 정책 재사용.
- Supabase adapter 변경:
  - `load()` 시 `users.preferences.week_start` 를 읽어
    `settings.weekStart` 로 반영.
  - `saveSettings(settings)` 는 `weekStart` 만 `preferences.week_start` 로
    merge update. `notify`, `notifyTime`, `dark`, `view.*` 는 device-local
    유지.
  - 구버전 스키마 fallback 유지: `preferences` 컬럼이 없는 DB에서는
    default weekStart 로 읽고 원격 저장은 no-op.
- Offline queue 확장:
  - `preferences_set { key: "week_start", value }` mutation 추가.
  - `flushQueuedMutations` 에서 preferences mutation 처리.
  - `createSyncedStorage.saveSettings` 가 local-first 저장 후 queue flush.
- 게스트 → 로그인 전이 정책 구현:
  - remote `week_start` 가 default(0) 이고 local `weekStart` 가 1이면
    최초 synced load 중 local 값을 remote 에 1회 push.
- 테스트 추가:
  - weekStart 변경만 preferences queue 에 쌓이는지 검증.
  - remote default 상태에서 local weekStart push 동작 검증.
- Local/hosted Supabase 모두 migration 적용 후 schema check:
  - `users.preferences` = `jsonb`.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 73 tests pass.
- `npm --prefix apps/web run build` → pass.

## 2026-04-30 Phase 5.7: Habit Recurrence (daily + weekly)

### Codex

- Habit domain updated:
  - `Habit.recurType: "daily" | "weekly"` and `Habit.recurDays?: number[]`
    added.
  - `NewHabitInput` now carries recurrence fields.
  - Older local snapshots without recurrence are normalized to `daily`.
- Supabase habit mapping updated:
  - `habitRowToDomain` preserves `recur_type` / `recur_days`.
  - Unsupported remote recurrence values (for example future `monthly`) fall
    back to `daily` in the v1 domain.
  - `habitDomainToInsert` now writes domain recurrence instead of hard-coded
    `daily`.
- Add Sheet habit flow updated:
  - Habit mode includes "매일 / 요일" recurrence segment.
  - Weekly mode shows a seven-day picker and prevents removing the last
    selected weekday.
  - New weekly habits default to the sheet's selected date weekday.
- Habit behavior updated:
  - `habitActiveOn(habit, iso)` helper added.
  - `habitStreak` skips inactive weekly dates instead of breaking streaks.
  - Habit daily summary uses only habits active on the selected date.
  - Today list hides inactive habits.
  - Last 7 Days grid disables inactive cells and calculates rates from active
    slots only.
  - Stats screen uses active habit slots for today and 7-day metrics.
- Tests updated:
  - Supabase mapping tests cover daily and weekly habit recurrence.
  - Selector tests cover active weekday checks and weekly streak skipping.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 76 tests pass.
- `npm --prefix apps/web run build` → pass (sandbox Turbopack port 제한으로
  권한 상승 재실행).
- `git diff --check` → pass.

### Notes

- No new migration was needed because `habits.recur_type` and
  `habits.recur_days` already exist in the schema.
- Habit edit/detail is still a product decision. Current implementation covers
  new habit creation and existing habit rendering/sync.
- v2 monthly extension path:
  - Add `"monthly"` to the domain recurrence union.
  - Define `recurDays` semantics for month days or add a separate field.
  - Expose `recur_end_date` in the domain and UI if finite recurrence is
    needed.
- `docs/just_do_prd.md` and `docs/just_do_planning.md` now state Habit
  recurrence scope as v1 = daily/weekly, v2 = monthly/end date.

## 2026-04-30 Phase 5.7 Follow-up: Habit Detail and Category Drag Reorder

### Codex

- Habit detail/edit screen added:
  - Habit list rows now open a detail screen.
  - Title edit, emoji edit, recurrence edit, reminder time edit, and habit
    delete are supported.
  - Recent 14-day check history is shown in the detail screen. Active dates
    can be toggled; inactive weekly dates are disabled.
- Habit persistence extended:
  - `Habit.reminderTime` added and mapped to Supabase `habits.reminder_at`.
  - `deleteHabit` added to storage adapters, offline queue, Supabase adapter,
    and store.
  - Detail view state now supports `detailHabitId` and stays session-local.
- Category management polish:
  - Existing up/down arrow reorder remains.
  - Category rows can also be dragged and dropped to reorder.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 76 tests pass.
- `npm --prefix apps/web run build` → pass (sandbox Turbopack port 제한으로
  권한 상승 재실행).

## 2026-04-30 Documentation Cleanup: Custom Category Language

### Codex

- `docs/just_do_prd.md` and `docs/just_do_planning.md` no longer describe
  Task categories as fixed `[나] / [외부]` product concepts.
- Category language now matches the implementation:
  - Task uses default categories plus user-created custom categories.
  - Habit remains separate in the Habit group.
  - Category colors are user-customizable; Habit keeps the green visual lane.
- Planning "미결 사항" updated for decisions already closed:
  - DB schema design done.
  - Subscription pricing done.

### Verification

- `git diff --check` → pass.

## 2026-04-30 Phase 6: iOS Planning Kickoff

### Codex

- Created `apps/ios/` as the native implementation starting point.
- Added Swift shared contracts:
  - `JustDoModels.swift` mirrors the current web domain model.
  - `MutationQueueSchema.swift` mirrors local/remote mutation semantics for
    app, sync client, and WidgetKit.
- Added `docs/ios_phase6_plan.md`:
  - target layout
  - web-to-Swift domain mapping
  - Core Data entity plan
  - App Group cache file plan
  - mutation queue semantics
  - WidgetKit small/medium/large implementation path
- Updated `docs/widget_sync_strategy.md` so mutation names and current
  implementation status match the latest web work.
- Updated root `README.md` with the iOS track entry point.

### Verification

- Swift typecheck for the shared contracts passed with `xcrun swiftc`.
- `git diff --check` → pass.

## 2026-04-30 Phase 6: iOS Drift Fixtures

### Codex

- Added a Swift Package test harness under `apps/ios`.
- Added drift fixtures:
  - `app_snapshot.json` for the web persisted snapshot shape.
  - `queued_mutations.json` for the web local mutation queue shape.
  - `widget_snapshot.json` for the planned App Group widget snapshot.
- Added `DriftFixtureTests` to verify:
  - Swift domain structs decode the web snapshot shape.
  - Swift mutation enum decodes the web queue shape.
  - Swift mutation enum encodes back to the expected web-style payload keys.
  - Widget snapshot fixtures decode successfully.
- Added explicit `CodingKeys` / custom `Codable` where Swift naming differed
  from web JSON (`categoryId`, `habitId`, mutation `type`).

### Verification

- `swift test` from `apps/ios` → 4 tests pass.

## 2026-04-30 Phase 6: Core Data Model and Mappers

### Codex

- Added an initial Core Data model factory in Swift code so it can be tested
  before Xcode project generation.
- Added `CoreDataStack` with an in-memory mode for unit tests.
- Added domain mappers for:
  - `Category`
  - `Task`
  - `Habit`
  - `QueuedMutation`
- Mapper policy:
  - UUID relationships are stored as UUID fields first.
  - Array/dictionary fields (`tags`, `recurDays`, `log`) are stored as JSON
    `Data` to keep the first Core Data model simple and close to the web
    persisted shape.
- Added Core Data mapper tests covering entity presence and round-trips.

### Verification

- `swift test` from `apps/ios` → 9 tests pass.

## 2026-04-30 Phase 6: App Group Widget Snapshot Store

### Codex

- Added `AppGroupWidgetSnapshotStore`.
  - Production initializer resolves `group.com.justdo.app`.
  - Test initializer accepts any directory URL.
  - Reads/writes `widget_snapshot.json`.
  - Atomic write option used for safer WidgetKit reads.
  - Missing snapshot returns `nil`.
- Added store tests for missing file, write/read round-trip, and remove.

### Verification

- `swift test` from `apps/ios` → 12 tests pass.

## 2026-04-30 Phase 6: WidgetKit Layouts

### Codex

- Added WidgetKit-ready SwiftUI layouts in `JustDoShared/Widgets`.
  - `JustDoWidgetView` switches between small, medium, and large layouts.
  - Small: remaining count + compact item list.
  - Medium: week strip + item list.
  - Large: month grid + today item list.
- Added `JustDoWidgetDisplayModelFactory`.
  - Converts `WidgetSnapshot` into display items.
  - Limits items by widget size.
  - Builds week/month date models using a fixed Gregorian UTC calendar.
  - Maps category colors and Habit green lane.
- Added display model tests for small/medium/large behavior.

### Verification

- `swift test` from `apps/ios` → 15 tests pass.

### Claude Handoff Notes

- `docs/claude_handoff.md` was refreshed for a Claude Code transition.
- Removed stale uncommitted Phase 5 notes and old test counts.
- Updated the recommended next work to focus on Xcode app/widget/shared target
  creation and wiring the existing SwiftPM shared code into a real WidgetKit
  extension.

## 2026-04-30 Phase 6: Xcode App and Widget Targets

### Claude Code

- Created `apps/ios/JustDoApp/JustDoApp.xcodeproj` with two product targets:
  - `JustDoApp` — SwiftUI iOS app, bundle ID `com.justdo.app`.
  - `JustDoWidgetExtension` — WidgetKit extension, bundle ID `com.justdo.app.widget`.
- Added existing SwiftPM `JustDoShared` library as a Local Package
  dependency on both targets so the Xcode and CLI tracks consume the same
  source.
- App Group `group.com.justdo.app` enabled on both targets via Signing &
  Capabilities. Entitlement files live at:
  - `apps/ios/JustDoApp/JustDoApp/JustDoApp.entitlements`
  - `apps/ios/JustDoApp/JustDoWidgetExtension.entitlements`
- Both targets set to Minimum Deployments iOS 17.0 to match
  `Package.swift`.
- Removed the auto-generated `JustDoWidgetControl.swift` (Control Widget
  is iOS 18-only and out of scope for v1) and dropped its reference from
  `JustDoWidgetBundle.swift`.
- Bundle ID note: Xcode initially named the widget `com.justdo.app.JustDoWidget`;
  changed to `com.justdo.app.widget` for consistency.
- Added Xcode/SwiftPM ignore patterns to root `.gitignore`
  (`xcuserdata/`, `*.xcuserstate`, `DerivedData/`, `.build/`, `.swiftpm/`,
  etc).

### Verification

- Xcode `⌘B` succeeded for both `JustDoApp` and `JustDoWidgetExtension`
  schemes against iPhone 17 Pro simulator.
- `cd apps/ios && swift test` → 15 tests pass (SwiftPM track unaffected).

### Known Provisioning Warnings (ignorable)

- "Communication with Apple failed / Your team has no devices..." appears
  on Personal Team because no iPhone is registered. Affects real-device
  builds only — simulator builds work without provisioning profiles.
- "No profiles for 'com.justdo.app.widget' were found" is the same root
  cause. Resolves automatically when a real iPhone is connected.

### Notes

- Xcode created an extra `JustDoApp.swift` placeholder alongside the
  `@main` `JustDoAppApp.swift` entry point. Both kept as-is to avoid
  rename collision; safe to clean up later.
- `Supported Destinations` for `JustDoApp` currently includes iPad / Mac
  Designed for iPad / Apple Vision. iPhone-only is the v1 scope but
  trimming was deferred to avoid risking signing/build state right after
  scaffolding.
- WidgetKit code in `JustDoApp/JustDoWidget/JustDoWidget.swift` is still
  the default Xcode template. Wiring it to `JustDoWidgetView` +
  `JustDoWidgetDisplayModelFactory` + `AppGroupWidgetSnapshotStore` is
  the next Phase 6 step.

## 2026-05-07 README Refresh and WidgetKit Shared Layout Wiring

### Codex

- Updated `README.md` so it no longer describes the repository as references
  only. It now reflects the implemented web app, Supabase workspace, active
  iOS track, and current WidgetKit status.
- Replaced the default Xcode widget template in
  `apps/ios/JustDoApp/JustDoWidget/JustDoWidget.swift`.
  - The widget now uses `StaticConfiguration`.
  - It reads `widget_snapshot.json` through `AppGroupWidgetSnapshotStore`.
  - It converts snapshots with `JustDoWidgetDisplayModelFactory`.
  - It renders `JustDoWidgetView` for small, medium, and large widget
    families.
  - It falls back to a placeholder snapshot when the App Group snapshot is not
    available yet.
- Removed the unused default "Favorite Emoji" configuration intent body from
  `AppIntent.swift`; widget action intents remain the next Phase 6 step.
- Updated `docs/next_steps.md`, `docs/ios_phase6_plan.md`,
  `docs/claude_handoff.md`, and `docs/widget_sync_strategy.md` so the next
  work is the app-side `widget_snapshot.json` writer.

### Verification

- `cd apps/ios && swift test` -> 15 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoWidgetExtension -destination 'generic/platform=iOS Simulator' build` -> pass.

## 2026-05-07 Phase 6: App-side Widget Snapshot Writer

### Codex

- Added `WidgetSnapshotFactory` in `JustDoShared`.
  - Converts `AppSnapshot` to compact `WidgetSnapshot`.
  - Keeps tasks active on the selected date.
  - Keeps daily habits and weekly habits active on the selected weekday.
  - Sorts categories by user position.
- Added `WidgetSnapshotFactoryTests` for selected-date task filtering and
  weekly habit activity filtering.
- Added app target `WidgetSnapshotWriter`.
  - Writes through `AppGroupWidgetSnapshotStore`.
  - Reloads WidgetKit timelines after a successful write.
- Connected `JustDoAppApp` to write a bootstrap widget snapshot on launch and
  foreground.
- Replaced the placeholder `ContentView` with a simple status view explaining
  that bootstrap widget snapshot writing is active until the native data layer
  is connected.

### Verification

- `cd apps/ios && swift test` -> 16 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- The writer path is in place, but the source data is still a bootstrap
  snapshot. The next Phase 6 step is replacing
  `WidgetSnapshotBootstrap.makeAppSnapshot()` with real native app state from
  Core Data/Supabase sync.

## 2026-05-07 Phase 6: Core Data-backed Widget Snapshot Source

### Codex

- Added `CoreDataAppSnapshotStore` in `JustDoShared/Storage`.
  - Loads categories, tasks, and habits from the Core Data mirror into an
    `AppSnapshot`.
  - Replaces mirror rows for bootstrap/sync refreshes.
  - Provides default view/settings helpers for native snapshot reads.
- Added `CoreDataAppSnapshotStoreTests`.
  - Round-trips a full `AppSnapshot` through Core Data.
  - Verifies replacement removes stale rows.
- Changed the app-side widget writer flow:
  - Seed Core Data once if the mirror is empty.
  - Load `AppSnapshot` from Core Data.
  - Write `widget_snapshot.json` through `WidgetSnapshotWriter`.
- Updated `ContentView` status copy to describe the Core Data-backed writer.

### Verification

- `cd apps/ios && swift test` -> 18 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- The widget snapshot source now goes through the native Core Data mirror, but
  the mirror is still locally seeded. The next Phase 6 step is implementing
  iOS Supabase sync so account data populates Core Data.

## 2026-05-07 Phase 6: Supabase REST Read Sync Scaffold

### Codex

- Added `JustDoShared/Sync/SupabaseRestSync.swift`.
  - Defines `SupabaseCredentials`, `SupabaseRestTransport`, and
    `URLSessionSupabaseRestTransport`.
  - Adds `SupabaseSnapshotClient` for REST reads from categories, tags,
    task_tags, tasks, habits, and habit_logs.
  - Maps Supabase rows into the shared `AppSnapshot` domain model, including
    task tags and habit logs.
  - Adds `SupabaseCoreDataSync` to replace the native Core Data mirror through
    `CoreDataAppSnapshotStore`.
- Added `SupabaseRestSyncTests`.
  - Verifies Supabase row mapping into `AppSnapshot`.
  - Verifies sync replacement updates the Core Data mirror.

### Verification

- `cd apps/ios && swift test` -> 20 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- The REST read-sync client is implemented and tested, but it is not yet wired
  to iOS Supabase Auth/session state. The next Phase 6 step is passing real
  session credentials into `SupabaseSnapshotClient`, running
  `SupabaseCoreDataSync`, then refreshing `widget_snapshot.json`.

## 2026-05-07 Phase 6: App Lifecycle Sync Coordinator

### Codex

- Added `JustDoApp/AppSyncCoordinator.swift`.
  - Loads temporary Supabase session values from environment or Info.plist
    keys: `JUSTDO_SUPABASE_URL`, `JUSTDO_SUPABASE_ANON_KEY`,
    `JUSTDO_SUPABASE_ACCESS_TOKEN`, and `JUSTDO_SUPABASE_USER_ID`.
  - Runs `SupabaseCoreDataSync` when those values exist.
  - Falls back to the seeded Core Data mirror when no session values are
    present.
  - Writes the widget snapshot after either path.
- Updated `JustDoAppApp` so launch and foreground refresh use
  `AppSyncCoordinator`.
- Updated the app status copy and docs to make the remaining boundary clear:
  real native Supabase Auth/session storage is still pending.

### Verification

- `cd apps/ios && swift test` -> 20 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- The app can now exercise read-sync with injected session values, but this is
  not a user-facing login flow. The next Phase 6 step is native Supabase
  Auth/session persistence, then widget App Intents.

## 2026-05-07 Phase 6: Keychain-backed iOS Session Store

### Codex

- Reworked `AppSyncCoordinator` session wiring.
  - `JUSTDO_SUPABASE_URL` and `JUSTDO_SUPABASE_ANON_KEY` now provide only app
    configuration through environment or Info.plist keys.
  - Access token, refresh token, user ID, and expiry are represented by
    `SupabaseStoredSession`.
  - `KeychainSupabaseSessionStore` persists the session as a generic password
    item using `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
  - Expired stored sessions are ignored by the sync coordinator.
- `AppSyncCoordinator` now builds `SupabaseCredentials` from app configuration
  plus a valid stored Keychain session, then runs `SupabaseCoreDataSync`.
- The seeded Core Data mirror remains the fallback when configuration or a
  valid stored session is absent.

### Verification

- `cd apps/ios && swift test` -> 20 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- Native session persistence is in place, but no user-facing login flow writes
  into it yet. The next Phase 6 step is iOS Supabase OAuth login and token
  refresh, followed by widget App Intents.

## 2026-05-07 Phase 6: iOS OAuth Login and Refresh

### Codex

- Added `SupabaseAuthClient`.
  - Builds Supabase `/auth/v1/authorize` URLs for Google/Apple OAuth.
  - Uses PKCE (`code_challenge_method=s256`) with `ASWebAuthenticationSession`.
  - Exchanges callback codes through `/auth/v1/token?grant_type=pkce`.
  - Refreshes sessions through `/auth/v1/token?grant_type=refresh_token`.
  - Maps token responses into `SupabaseStoredSession`.
- Added `AuthViewModel`.
  - Tracks missing configuration, signed-out, signed-in, working, and failed
    states.
  - Saves successful sign-in sessions through `KeychainSupabaseSessionStore`.
  - Clears the Keychain session on sign-out.
- Updated `ContentView`.
  - Shows minimal Google/Apple sign-in controls when signed out.
  - Shows sign-out when a valid Keychain session exists.
  - Triggers widget snapshot refresh after sign-in/sign-out.
- Updated `AppSyncCoordinator`.
  - Refreshes expired stored sessions before attempting Supabase read-sync.

### Verification

- `cd apps/ios && swift test` -> 20 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- Supabase Auth URL Configuration must allow `justdo://auth-callback` before
  native OAuth can be tested end-to-end.
- The next Phase 6 step is widget App Intents for task/habit actions.

## 2026-05-07 Phase 6: iOS Supabase Build Config

### Codex

- Added Xcode config files under `apps/ios/JustDoApp/Config`.
  - `Debug.xcconfig` and `Release.xcconfig` provide shared public client
    settings and inject them into generated Info.plist keys.
  - `Local.xcconfig.example` documents the local override format.
  - `Local.xcconfig` is gitignored and is the place for the real local anon
    public key.
- Connected the `JustDoApp` target Debug/Release build configurations to the
  new xcconfig files.
- Added `.gitignore` coverage for `apps/ios/JustDoApp/Config/Local.xcconfig`.

### Verification

- `cd apps/ios && swift test` -> 20 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- The app now reads Supabase URL/anon key through the same Info.plist path for
  local runs and archive builds. The user only needs to fill
  `apps/ios/JustDoApp/Config/Local.xcconfig` locally.

## 2026-05-07 Phase 6: Widget App Intents and App Group Mutation Queue

### Codex

- Added `AppGroupMutationQueueStore`.
  - Appends queued mutations as JSON lines in App Group
    `mutation_queue.jsonl`.
  - Supports list/remove/clear helpers for the app-side drain path.
- Added `WidgetMutationController`.
  - Optimistically updates `widget_snapshot.json` for task completion and
    habit log changes.
  - Enqueues matching task upsert and habit-log set mutations.
- Added widget `AppIntent` implementations for task complete/uncomplete and
  habit check/uncheck.
- Updated widget layouts to use interactive intent buttons for task and habit
  rows.

### Verification

- `cd apps/ios && swift test` -> 23 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- Widget route handling and detail rendering remain next.
- The widget queue is durable in App Group storage. The next Phase 6 step is
  draining it into the app's Core Data queue.

## 2026-05-09 Phase 6: App-side Widget Mutation Queue Drain

### Codex

- Added `AppGroupMutationQueueDrainer`.
  - Reads App Group `mutation_queue.jsonl`.
  - Applies drained mutations to the Core Data app mirror.
  - Moves each drained mutation into `CDQueuedMutation`.
  - Removes each successfully drained mutation from the App Group queue.
- Extended `CoreDataAppSnapshotStore`.
  - Applies local task/category/habit/preference mutations.
  - Applies habit-log mutations by updating the mirrored habit log.
  - Exposes queued mutation reads for verification and future flush work.
- Updated `AppSyncCoordinator`.
  - Drains widget mutations during widget snapshot refresh.
  - Drains after remote read-sync so local widget actions stay visible in the
    refreshed widget snapshot.

### Verification

- `cd apps/ios && swift test` -> 24 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- Supabase write flush for `CDQueuedMutation` is still pending.
- Widget deep links to task/habit detail are still pending.

## 2026-05-09 Phase 6: Supabase Queued Mutation Flush

### Codex

- Added Supabase REST mutation support.
  - `URLSessionSupabaseRestTransport` now supports upsert, patch, and delete
    requests in addition to reads.
  - `SupabaseMutationClient` maps queued domain mutations to Supabase rows.
  - Habit log value `1` upserts `habit_logs`; value `0` deletes the matching
    habit log row.
- Added `SupabaseQueuedMutationFlusher`.
  - Reads `CDQueuedMutation` in `updatedAt` order.
  - Sends each mutation to Supabase.
  - Removes the Core Data queue row only after the remote write succeeds.
- Updated `AppSyncCoordinator` ordering.
  - Drain App Group widget queue first.
  - Flush `CDQueuedMutation` when a valid session exists.
  - Then run remote read-sync and write the widget snapshot.

### Verification

- `cd apps/ios && swift test` -> 26 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

### Notes

- Task tag joins are intentionally not rewritten by iOS task upsert. Widget
  task intents only change completion state, so existing remote tag joins should
  remain untouched.
- Widget deep links to task/habit detail are still pending.

## 2026-05-09 Phase 6: Widget Deep-link Routing

### Codex

- Added `JustDoDeepLink`.
  - Builds `justdo://task/<id>` and `justdo://habit/<id>` URLs.
  - Parses supported URLs back into typed task/habit routes.
  - Ignores unsupported `justdo` URLs such as the OAuth callback.
- Updated the widget row layout.
  - The check dot remains an App Intent button.
  - The row text is now a `Link` that opens the matching task/habit deep link.
- Registered the app's `justdo` URL scheme in `JustDoApp/Info.plist`.
- Updated `ContentView` to handle `onOpenURL`, resolve the linked task/habit
  from the Core Data mirror, and render native detail fields.
- Added `CoreDataAppSnapshotStore.task(id:)` and `habit(id:)` lookup helpers.

### Verification

- `cd apps/ios && swift test` -> 30 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.
- Verified the built app Info.plist contains the `justdo` URL scheme and the
  Supabase configuration keys.

### Notes

- This is still a compact detail panel inside the current scaffold app. A fuller
  app shell can later promote the same route into a pushed detail screen.

## 2026-05-09 Phase 6: Status and Release Notes

### Codex

- Added `docs/ios_phase6_status.md`.
  - Summarizes completed iOS Phase 6 sync, widget, OAuth, queue, and deep-link
    work.
  - Documents the current UX gap: detail is an inline scaffold panel, while the
    production app should use `NavigationStack` push routes.
  - Captures manual testing steps for OAuth, widget actions, queue flush, and
    deep links.
  - Captures deployment checks for Supabase config, App Group entitlement, URL
    scheme, and release Info.plist values.
  - Lists the next work: NavigationStack detail routing, hosted sync
    verification, sync status UI, and deep-link UI tests.
- Updated README, next steps, handoff, and widget sync strategy docs to point to
  the new status document and make the NavigationStack improvement explicit.

## 2026-05-09 Phase 6: NavigationStack Detail Routing

### Codex

- Replaced the root-screen inline deep-link detail panel with a SwiftUI
  `NavigationStack`.
- Added an app-local `DetailRoute` enum for task and habit detail routes.
- Updated `onOpenURL` so `JustDoDeepLink` appends the matching pushed route
  instead of mutating inline detail state.
- Split task and habit detail rendering into pushed `TaskDetailScreen` and
  `HabitDetailScreen` views backed by the Core Data mirror lookup helpers.
- Updated Phase 6 status and next-step docs so the remaining iOS priority is
  hosted OAuth/offline sync verification, not navigation structure.

### Verification

- `cd apps/ios && swift test` -> 30 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` -> pass.

## 2026-05-10 Deployment Planning

### Codex

- Added `docs/deployment_domain_aws_plan.md`.
  - Captures Gabia domain purchase notes.
  - Captures DNS options: Route 53 delegation or Gabia DNS records.
  - Captures AWS setup items: MFA, IAM, budgets, Amplify Hosting, environment
    variables, custom domain, TLS, and production smoke tests.
  - Captures Supabase and Google OAuth callback updates required after domain
    connection.
- Updated `docs/next_steps.md` with domain/AWS deployment backlog items.
- Updated `docs/ios_phase6_status.md` with a clearer manual verification
  checklist for signed-out auth landing and signed-in home root.

### Notes

- The current preferred web deployment path is AWS Amplify Hosting for
  `apps/web`, with Route 53 DNS hosting after purchasing the domain from Gabia.
- If DNS stays in Gabia, records must be added in Gabia DNS management instead
  of Route 53, and apex-domain support needs to be checked before making
  `https://<domain>` canonical.

## 2026-05-10 Phase 6: Native Root UI, Management, and Stability Fixes

### Codex

- Replaced the signed-in iOS scaffold with a native root shell based on
  `reference/proto/`.
  - Added Home / Stats / Settings bottom tabs.
  - Added the calendar month view, selected-day panel, task rows, and habit
    rows on Home.
  - Kept task/habit detail as pushed `NavigationStack` routes.
- Updated the signed-out iOS auth landing to match the prototype direction.
  - Added Just Do wordmark treatment.
  - Added Apple, Google, Kakao, and email-style auth buttons.
- Added native task/habit creation from the Home `+` button.
  - Task mode captures title, start date, end date, time, category, and
    priority.
  - Habit mode captures title and emoji.
  - The add flow now uses a partial-height bottom sheet instead of a full-height
    sheet.
- Added Settings entry points for data management.
  - Habit management supports add/delete.
  - Category management supports add/delete.
- Cleaned up dark mode ownership.
  - Removed the Home header dark/light button.
  - Wired Settings > 다크모드 to the actual root `isDarkMode` binding.
  - Converted core UI colors to adaptive light/dark colors.
- Fixed the signed-in launch crash seen after simulator login.
  - Observed crash logs: Core Data `NSGenericException` with
    `Collection <__NSCFSet> was mutated while being enumerated`, followed by a
    later `EXC_BAD_ACCESS` while updating habits.
  - Root cause: overlapping app lifecycle refresh tasks shared the same
    `viewContext`, while snapshot replacement/upsert code deleted and
    re-inserted Core Data rows.
  - Fix: `CoreDataAppSnapshotStore` public reads/writes now run through
    `context.performAndWait`; category/task/habit/queued mutation upserts
    update existing managed objects; snapshot replacement reconciles stale rows
    instead of deleting and recreating everything.
- Updated README, iOS status, and next-step docs with the current root UI,
  crash fix, deployment plan, and remaining work.

### Verification

- `cd apps/ios && swift test` -> 30 tests pass.
- `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build` -> pass.
- Installed the built `JustDoApp.app` into the booted simulator with
  `xcrun simctl install booted ...`.
- Launched the app with `xcrun simctl launch booted com.justdo.app`.
- Confirmed the Home header no longer shows the dark/light button after
  install; only the `+` button remains.
- Checked simulator logs after the Core Data fix; no new JustDoApp crash report
  was generated during the final launch check.

### Notes

- `reference/proto/*` contains user/prototype updates and was not treated as
  production code during this pass.
- Untracked simulator screenshots are local verification artifacts and should
  not be committed.
- `gh auth status` currently reports no GitHub CLI login. Git push can still
  proceed through the repository's configured git remote/credentials, but PR
  creation through `gh` would require `gh auth login`.

## 2026-05-10 Platform Strategy Decision

### Claude Code (with user)

- Discovered divergence between `claude_handoff.md` "App Shape Now" (web 기준,
  `홈 / 습관 / 설정` 탭, Stats를 Settings 안에) and `reference/proto/` +
  iOS simulator (5/10 작업, `홈 / 통계 / 설정` 탭, Home에 Task+Habit 통합,
  Stats 별도 탭). proto가 5/10 commit `16ff8d2 Modifying the Header Design_v2`
  에서 갱신됐고 iOS는 그걸 따라간 반면 web은 이전 결정을 그대로 유지하고 있어
  발생한 모순.
- Web이 iOS prototype을 그대로 모방하면서 데스크탑 환경에서 어색한 모양 (좁은
  컨테이너, 모바일 패턴 하단 탭, 큰 화면 미활용) 으로 보이는 문제를 사용자가
  지적.
- 4가지 방향 (반응형 / 데스크탑 전용 / proto 정렬 / 점진적) 검토 후, 사용자가
  **데스크탑 전용 web** 방향을 선택.

### Decision

| 플랫폼 | v1 | 형태 | UI Reference |
|--------|----|------|--------------|
| Web | 출시 | 데스크탑 productivity hub | `reference/web-proto/` (별도 자산) |
| iOS | 출시 | 모바일 네이티브 | `reference/proto/` |
| Android | v3 | 모바일 네이티브 | (v3 결정 시점에 정의) |

- 도메인 모델 / Supabase 스키마 / 색상 토큰은 양 플랫폼 **공유**.
- 레이아웃 / 네비게이션 / 인터랙션 패턴은 플랫폼별로 **분기**.
- 모바일 web 진입 시 안내 페이지 분기 (iOS 앱 다운로드 / Android 출시 알림 / 데스크탑 권장).
- v3 까지 Android 사용자는 데스크탑 web 으로 우회.
- **Phase 7: Web Desktop Redesign**이 v1 출시 차단 항목으로 신설. `reference/web-proto/` 도착 후 구현, Amplify 배포는 재디자인 후.

### Documentation Updates

- `reference/README.md` — proto = 모바일/iOS, web-proto = 데스크탑 web 분리.
- `docs/just_do_prd.md` — §1 표에 "플랫폼 전략" 행 추가, 새 §1.5 Platform Strategy
  섹션, §5 디자인 가이드라인을 공통 / iOS / Web 으로 분리, §6 로드맵에 v1 차단
  항목 명시.
- `docs/just_do_planning.md` — §9 표 갱신, §10-1 네비게이션을 iOS 기준임을 명시,
  §14 로드맵 갱신.
- `docs/next_steps.md` — 새 "Where We Are (2026-05-10)" 헤더, 새 Phase 7 (자산/
  디자인 결정/구현/모바일 진입/회귀 검증), Android Roadmap 백로그.
- `docs/claude_handoff.md` — Date 헤더를 2026-05-10 으로 갱신, 상단에 Platform
  Strategy 결정 노트 추가, Current Status 에 Phase 7 항목 추가, "App Shape Now"
  를 iOS (current) / Web (transitional) 로 분리, Recommended Next Work 를
  Phase 7 우선 + iOS 잔여 작업 병렬 + sync verification 후순위 + Codex 세션
  재개 가이드 형태로 재작성.
- `docs/ios_phase6_status.md` — Next Work 에 Phase 7 컨텍스트 노트 추가,
  hosted offline sync verification 을 Phase 7 완료 후 항목으로 이동.
- `README.md` — Current Focus 와 Project Layout 갱신 (Platform Strategy
  요약 + reference 디렉토리 분리 명시 + 마지막 iOS 단락의 next iOS work 표현
  Phase 7 정렬).

### Notes

- Manual offline sync verification (`docs/local_dev.md`) 은 본 결정의 결과로
  잠시 보류. UI 디자인과 데이터 레이어가 독립이라 검증 자체는 여전히 유효하지만,
  새 web 디자인이 도착하면 그 위에서 다시 회귀 검증할 예정 (Phase 7-5).
- iOS 측 작업 (detail edit/delete, sync status UI)은 web 재디자인과 독립적으로
  진행 가능.
- Phase 7 prototype 자산은 사용자가 `reference/web-proto/` 에 추가 예정. 도착 전
  까지는 디자인 결정 (사이드바/네비/단축키 등)을 보류.
