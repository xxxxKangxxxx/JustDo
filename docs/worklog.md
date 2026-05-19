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

## 2026-05-10 Phase 7: Web Desktop Redesign Kickoff

### Codex

- Started the web-only Phase 7 redesign from the newly provided
  `reference/web_proto/` and `Just Do - Web Prototype.html` visual/UX reference.
- Replaced the `apps/web` entry shell that previously used the mobile
  `PhoneFrame` / bottom tab / bottom sheet composition with a desktop app shell:
  sidebar navigation, glass header, calendar workspace, optional today side
  panel, modal task detail, inline task creation, command palette, bulk action
  bar, stats dashboard, and desktop settings surface.
- Kept the real web domain/storage layer intact:
  `Task.categoryId`, custom categories, `Priority = high | medium | low`,
  habit recurrence, IndexedDB queue, Supabase sync, auth, and realtime adapter
  paths remain the source of truth.
- Treated the prototype code as design reference only. Prototype variable names
  and sample structures such as `cat: me/ext` and `priority: mid` were not
  copied into the production domain model.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 76 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandboxed run failed because Turbopack attempted to bind a local helper port.
- `git diff --check` — pass.

### Notes

- Local dev server is running at `http://localhost:3000` for review.
- This is the first implementation pass. Remaining polish should compare the
  live UI against `reference/web_proto/` page by page, especially category
  management, habit management, and mobile web 안내 페이지 behavior.

## 2026-05-10 Phase 7: Web Desktop UI Iteration

### Codex

- Iterated on the first desktop web shell based on user review.
- Changed the add flow from quick title-only Task creation to a full desktop
  modal with Task/Habit tabs.
  - Task: title, date range, time, category, priority, tag chips.
  - Habit: title, emoji, daily/weekly recurrence, weekday picker, reminder time.
- Removed duplicate add entry points from the Today side panel; the top
  `새 Task` button is now the single Task/Habit creation entry.
- Changed month calendar date-cell behavior:
  - clicking a date only selects it and updates the Today side panel.
  - adding from a date now requires the small hover `+` button.
- Updated Today side panel:
  - Task and Habit completion buttons align on the right.
  - Task check buttons are vertically centered in the card.
  - completed Tasks remain in the same Task list with checkbox/strikethrough;
    no separate completed section is created.
- Added web Settings management surfaces:
  - category add / rename / color edit / delete.
  - habit delete (habit add lives in the global add modal).
  - settings left menu now renders only the selected section.
  - subscription section with Pro monthly/yearly upgrade entry and a placeholder
    upgrade modal. Real checkout / webhook / `user_subscriptions` update is
    intentionally not implemented yet.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 76 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; sandbox
  still blocks Turbopack helper port binding.

### Remaining Follow-up

- Add desktop UI interaction tests for the new app shell.
- Implement mobile web 안내 page / viewport fallback.
- Restore category reorder in the desktop Settings surface.
- Add Habit edit flow beyond add/delete.
- Add Task edit modal tag editing.
- Implement real Pro checkout backend and webhook-driven subscription update.
- Run manual offline sync verification on the new web UI.
- Perform visual checks at 1024 / 1280 / 1440 / 1920 widths.

## 2026-05-11 Phase 7: Mobile Web 안내 Page

### Codex

- Rechecked the current repo state before starting: working tree was clean and
  Phase 7 next steps still listed mobile web 안내 as the first follow-up.
- Added a viewport-based mobile web fallback in
  `apps/web/src/features/just-do/app-shell.tsx`.
  - `< lg` screens show a dedicated Just Do Web 안내 page.
  - `lg` and wider screens keep the existing desktop shell / auth screen.
  - The same mobile fallback applies before sign-in and after sign-in, so
    OAuth callback redirects back to `/` and still land on the mobile guide
    when the viewport is narrow.
- The guide explicitly reflects the platform split: web is a desktop
  productivity hub, while mobile verification continues through the iOS app
  track.
- Updated `docs/next_steps.md` to mark the viewport fallback as done and leave
  actual iOS download link / Android waitlist wiring as future work.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 76 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.
- Local dev server responded with HTTP 200 at `http://127.0.0.1:3000`.

### Remaining Follow-up

- Add desktop UI interaction tests.
- Add the real iOS App Store / TestFlight link when available.
- Once the public App Store URL is available, consider auto-redirecting iOS
  mobile browser visits to that URL, with the current 안내 page kept as the
  fallback for missing URL, unsupported devices, or redirect failure.
- Add Android launch notification signup once the product path is defined.
- Continue Phase 7 edit-flow work: Task edit, Habit edit, category reorder,
  and Pro checkout integration.

## 2026-05-11 Phase 7: Desktop UI Interaction Tests

### Codex

- Added `apps/web/src/features/just-do/app-shell.test.tsx` to cover the new
  desktop shell's user-facing flows with a real React render and in-memory
  Just Do storage.
- Added a test storage seam to `JustDoApp` so component tests can inject
  `createMemoryStorage(...)` without touching Supabase, IndexedDB, or browser
  auth.
- Mocked auth at the test boundary and kept the production app path unchanged.
- Added accessibility state to Today panel completion buttons:
  `aria-label` / `aria-pressed` for Task and Habit toggles.
- Covered:
  - Task creation through the desktop add modal, including tag chip commit.
  - Habit creation through the same modal's Habit tab.
  - Calendar date click selecting only, while the small date `+` opens add.
  - Today panel Task/Habit completion toggles without a separate completed
    section.
  - Settings split layout rendering only the selected section content.
- Updated Vitest resolution so React component tests use the app's React /
  ReactDOM versions instead of the workspace root fallback.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 81 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.

### Remaining Follow-up

- Add edit-flow coverage after Task edit / Habit edit / category reorder are
  implemented.
- Run manual offline sync verification on the new desktop UI.
- Perform visual checks at 1024 / 1280 / 1440 / 1920 widths.

## 2026-05-11 Phase 7: Task Detail Tag Editing

### Codex

- Upgraded the desktop Task detail modal's tag row from read-only chips to the
  same editable chip-input pattern used by the add modal.
- Existing tags can now be removed directly from the detail modal.
- New tags can be added with Enter, comma, or blur commit; Backspace on an
  empty input removes the last tag.
- Tag edits persist immediately through `s.updateTask(task.id, { tags })`.
- Extended the desktop app shell interaction test to cover adding tags and
  deleting an existing tag from the Task detail modal.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 82 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.

## 2026-05-11 Phase 7: Habit Edit Support

### Codex

- Added desktop Habit editing from Settings → 습관 관리.
- Each Habit row now has a `수정` action in addition to delete.
- Added `HabitEditModal` for title, emoji, recurrence type, weekly day picker,
  and reminder time.
- Saved edits through the existing `s.updateHabit(...)` domain/store path.
- Extended app-shell interaction tests to cover editing a habit from desktop
  settings and verifying the updated row summary.
- While checking the live dev server, found that task tag writes could hit
  `task_tags` RLS on Supabase because the client used `upsert` for join rows
  even though no update policy exists or is needed. Changed that path to
  insert only newly computed join rows.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 83 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.

## 2026-05-11 Tag Input Hash / IME Fix

### Codex

- Fixed tag parsing so a leading `#` is treated as input syntax, not stored as
  part of the tag. Example: `#운동` now stores `운동`.
- Added parser coverage for multiple hash tags such as `#운동, #식단`.
- Guarded tag input key handling during Korean IME composition so Enter used
  to complete composition does not prematurely commit a partial tag.
- Added a defensive parser case for the observed duplicate suffix form
  `#운동,동`, which now stores only `운동` unless the second tag also has an
  explicit `#`.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 85 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.

## 2026-05-11 Phase 7: Desktop Category Reorder

### Codex

- Restored category reorder in the desktop Settings → 카테고리 관리 surface.
- Added up/down controls to each category row.
  - First row disables `위로 이동`.
  - Last row disables `아래로 이동`.
- Reorder swaps the two affected categories' `position` values through the
  existing `s.updateCategory(id, { position })` path, so storage/sync behavior
  stays aligned with the existing category model.
- Added app-shell interaction coverage for moving `외부` above `나` and checking
  disabled edge controls.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass when run outside the sandbox; the
  sandbox still blocks Turbopack helper port binding.

## 2026-05-11 Pro Checkout — Provider / Trial 정책 결정

### Claude Code

- 사용자가 "Codex로 작업했던 내용 모두 확인하고 작업해야할 내용 파악해서 정리"
  를 요청. Phase 7 desktop shell까지의 Codex 작업 상태와 Phase 7 잔여 punch list,
  iOS Phase 6 잔여 작업, deployment 트랙을 정리해서 보고.
- 다음 우선 트랙으로 사용자가 **Pro checkout backend** 선택.
- 결제 provider 옵션 (Toss / Stripe / Lemon Squeezy / 보류) 비교 후 사용자가
  **Toss Payments 빌링** 선택. 사유: 한국 사용자 대상 productivity 앱, ₩1,900
  소액 정기결제에 카카오페이/네이버페이/계좌/카드까지 커버, 수수료 ~3%.
- Toss 가맹점 상태: **사업자등록 미완료** → 외부 선결 조건이 길어 코드와
  외부 작업을 두 트랙으로 분리하기로 결정.
  - Track A (사용자 외부): 사업자등록 → Toss 가입 → 가맹점 심사 → 운영 키.
  - Track B (코드, Toss 테스트 키 기준): schema → webhook/issue-key → UI →
    cron 순서.
- Trial 정책: **회원가입 즉시 빌링 정보 요구 → 30일 Trial 후 자동 결제**.
  사유: 전환율 우선. 게스트 모드는 그대로 유지하고 로그인 진입 시 빌링 등록
  step을 강제하는 형태.
- iOS 결제는 Apple IAP 별도 트랙(Phase 6 v1 ship 후)으로 분리.
- 사용자가 "다음 세션으로 미루고 일단 계획만 docs에 고정" 선택. 코드 변경
  없음. 본 세션 결과물은 `docs/next_steps.md` Phase 7-3 Pro checkout 세분화,
  `docs/claude_handoff.md` Recommended Next Work 결제 결정 추가, 본 worklog
  엔트리, auto-memory `payment_provider.md`.

### Notes

- Track B는 사업자등록 없이도 Toss 테스트 키만으로 schema/webhook/UI/cron
  단위 테스트와 E2E까지 가능. 운영 키 교체 시점에 환경 변수만 swap.
- 운영 도메인은 Webhook URL 등록을 위해 deployment 트랙(Gabia/Route 53/Amplify)
  과 동시에 결정해야 함. 현재 deployment 트랙도 미시작 상태.
- 회원가입 즉시 빌링 요구 정책은 강한 결정이라, 가입 conversion 추적이 중요해
  지면 `onboarding/billing` step을 옵션화(skip 허용)할 수 있도록 UI 설계는
  step 단위로 분리 권장.

## 2026-05-11 Phase 7-4: Mobile Guide Wiring (iOS link / Android waitlist)

### Claude Code

- Phase 7 잔여 항목 중 결제 backend는 다음 세션으로 미루고 mobile 안내 페이지
  wiring 부터 진행 (사용자 선택).
- iOS App Store 진입:
  - `apps/web/.env.local.example` 에 `NEXT_PUBLIC_IOS_APP_STORE_URL` 추가.
  - `MobileWebGuide` 에 iOS UA 자동 리다이렉트 useEffect 추가. URL 비어 있을
    땐 no-op. sessionStorage 가드로 같은 세션에서 한 번만 시도.
  - 안내 페이지에 "App Store에서 받기" CTA 추가. URL 없으면 "App Store 출시
    예정" 비활성 라벨로 표시.
- Android 출시 알림 가입:
  - 신규 Supabase 마이그레이션 `20260511064305_waitlist.sql` — `public.waitlist`
    (id uuid pk, email, platform check('android'/'ios'/'web'), source, created_at)
    + `unique(email, platform)` + 인덱스. RLS enable, 정책 0개 → service-role
    경유만 접근 가능.
  - `apps/web/src/app/api/waitlist/route.ts` 추가. `POST { email, platform,
    source? }` → 이메일/플랫폼 화이트리스트 검증 후 `service-role` upsert
    (`onConflict: 'email,platform', ignoreDuplicates: true`).
  - `MobileGuideAndroidCta` 폼 추가. submitting/success/error 상태와 안내
    문구. 성공 시 입력 비우고 disabled.
- iOS 결제 별도 트랙 결정과는 충돌 없음 — 본 작업은 결제 미포함.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass (TypeScript 통과 포함).

### Follow-up

- 사용자가 마이그레이션 적용 필요:
  - 호스티드: `supabase db push` 또는 dashboard SQL editor.
  - 로컬: `supabase migration up` (또는 `supabase db reset` — 데이터 삭제됨).
- 이후 `supabase gen types typescript --local` 재생성하면
  `apps/web/src/lib/supabase/database.types.ts` 에 `waitlist` 타입이 추가되어
  route.ts 의 좁은 캐스트를 제거할 수 있음.
- 실제 iOS App Store URL 확정 시 `.env.local` 과 운영 환경(Amplify 등)의
  `NEXT_PUBLIC_IOS_APP_STORE_URL` 만 채우면 자동 활성화.
- 안내 페이지 form 회귀 테스트는 추후 dev server 위 manual smoke로 충분.
  자동 테스트가 필요하면 `app-shell.test.tsx` 에 viewport mock 추가 + fetch
  mock 으로 보강.

## 2026-05-13 Phase 7-5: Desktop Visual Verification + Header Fix

### Claude Code

- A1 시각 검증을 1024 / 1280 / 1440 / 1920 widths 에서 진행 (Chrome DevTools
  device toolbar, DPR 1.0).
- **1024px 헤더 squeeze 발견.** 사이드바(240) + Today panel 가용 폭이 헤더에
  남는 폭을 줄여 "2026년 5월" / "리스트" / "새 Task" 같은 헤더 텍스트가
  글자 단위로 줄바꿈됨.
- Fix (`apps/web/src/features/just-do/app-shell.tsx` Header):
  - 헤더 텍스트 노드들에 `whitespace-nowrap`.
  - 좌측 nav 묶음 / 타이틀 / 뷰 스위처 / 새 Task 버튼에 `shrink-0`.
  - 검색 input wrapper 를 `hidden xl:block w-[180px] xl:w-[280px]` 로 변경 →
    1024 ≤ width < 1280 구간에서는 검색 input 미노출. 검색 진입점은
    사이드바 "빠른 검색" 박스와 헤더의 `IconCommand` (Cmd+K) 가 다중 보장.
  - 헤더 gap 을 `gap-3 xl:gap-4` 로.
- 1280 / 1440 / 1920 모두 캘린더 / 사이드바 / Today panel / 모달 / Stats /
  Settings 시나리오 통과.
- 모바일 안내 페이지(`< lg`): 자동 fallback 동작, iOS CTA 비활성 라벨, Android
  폼 invalid email 에러 메시지 모두 정상 동작.

### Verification

- `npm --prefix apps/web run lint` — pass.

### Follow-up

- A2 manual offline sync verification (`docs/local_dev.md`) 진행.
- 검색 input 미노출 구간(1024 ≤ width < 1280) UX 가 자연스럽지 않다는
  사용자 피드백이 나오면, breakpoint 조정 또는 IconShellButton 형 검색 진입점
  추가 검토.

## 2026-05-13 Phase 7-5: Manual Offline Sync Verification + Sync UX Fix

### Claude Code

- `docs/local_dev.md` 절차를 새 desktop UI 진입점에 맞춰 5 stage 로 재구성하고
  hosted Supabase 위에서 통과시킴.
  - Stage 1 baseline → 2 온라인 smoke → 3 오프라인 mutation 적재 →
    4 online 복귀 자동 flush → 5 시크릿창 cross-device mirror.
- 검증 중 오프라인 UX 버그 두 건 발견 → fix:
  - **(1) Realtime CHANNEL_ERROR 가 syncError 로 잡힘.** DevTools 를 Offline
    으로 전환 시 Supabase realtime WebSocket 연결이 끊기고 6개 채널의
    `subscribe(status => ...)` 콜백이 `CHANNEL_ERROR` 를 emit. 이 emit 이
    `emitError` 를 통해 syncError 로 표시되어, 동기화 패널이 "확인 필요" +
    "habit logs realtime subscription failed" 같은 메시지를 노출.
    Fix: `apps/web/src/features/just-do/supabase-storage.ts` 에
    `onChannelStatus(label)` helper 추가. `navigator.onLine === false` 면
    emit 무시. 6개 채널 (`tasks`, `categories`, `tags`, `task_tags`, `habits`,
    `habit_logs`) 의 inline subscribe 콜백을 helper 호출로 단일화.
  - **(2) Offline fetch 실패가 syncError 로 잡힘.** mutation handler 들이
    큐 적재와 함께 시도하는 첫 원격 쓰기가 오프라인에서 `Failed to fetch`
    로 실패 → `reportSyncError` 가 "저장 중 문제가 발생했습니다." 표시.
    Fix: `apps/web/src/features/just-do/store.tsx` 의 `reportSyncError` 가
    `navigator.onLine === false` 면 silent (dev console.debug 만). 큐는
    그대로 남고 `setOnline` listener 가 reconnect 시 flush.
- Stage 3 에서 5 mutation 시도 시 큐가 4개로 끝나는 dedupe 동작 확인됨
  (예: 같은 task 의 두 번 upsert 가 합쳐짐). 기능적으로 정상 — Stage 4 에서
  남은 행 모두 정확히 flush.
- Stage 4 의 IndexedDB 화면이 "Data may be stale" 캐싱으로 비워지지 않은
  것처럼 보였으나, 화면 ↻ 새로고침 후 0 row 확인 — DevTools view 한정
  artifact, 실제 큐 메커니즘 정상.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass (두 fix 후 모두 유지).
- Manual hosted Supabase 5 stage 검증 통과.

### Follow-up

- Phase 7 결제 제외 잔여 작업은 모두 완료. v1 desktop UI 는 ship 가능 상태
  (Pro checkout backend 만 결제 트랙으로 분리되어 있음).
- 두 syncError 가드는 `navigator.onLine` 만 신뢰. 일부 환경에서 navigator 가
  online 으로 보고하지만 실 네트워크가 끊긴 경우는 여전히 syncError 로
  잡힘 — 이건 진짜 오류 신호로 간주가 적절. 별도 fix 불필요.
- 회귀 자동화가 필요하면 `app-shell.test.tsx` 에 navigator.onLine mock + fake
  realtime channel 로 가드 동작 시나리오 추가.

## 2026-05-14 Phase 7 Pro Checkout Backend Start

### Codex

- 결제 provider 재검토:
  - Toss Payments 직접 연동은 테스트 키 기준으로 사업자등록/운영 심사 전에도
    backend 골격과 sandbox 호출 검증을 진행 가능.
  - 운영 자동결제는 Toss 계약/심사 및 자동결제 MID 발급 후 라이브 키로 전환 필요.
  - Kakao Pay / Naver Pay 직접 연동은 추후 추가 트랙으로 미루고, v1은 Toss
    Payments 직접 연동 유지.
- B1 schema 구현:
  - `20260514061000_toss_billing.sql` 추가.
  - `user_subscriptions` 에 Toss billing/customer/payment 상태 컬럼 추가.
  - `payment_events` 테이블 추가로 webhook/API 결과 저장 및 provider event
    idempotency 기반 마련.
  - `handle_new_auth_user()` 의 구독 생성 로직을 현재 스키마 컬럼
    (`plan_name`, `trial_start_at`, `trial_end_at`) 기준으로 재정의.
- B2 server endpoint 골격 구현:
  - `POST /api/billing/issue-key`
  - `POST /api/billing/charge`
  - `POST /api/billing/cancel`
  - `POST /api/webhook/toss`
  - Toss REST wrapper 추가: billing key 발급, billing charge, billing key 삭제.
- `.env.local.example` 에 Toss/client/server/cron env 추가.
- Supabase local migration 적용 후 `database.types.ts` 재생성.

### Verification

- `supabase migration up` — local DB 적용 완료.
- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass.

### Follow-up

- B4 UI 연동: Toss SDK `requestBillingAuth` 호출, `authKey/customerKey` 를
  `/api/billing/issue-key` 로 전달.
- B3 cron 선택: Vercel Cron 또는 Supabase Cron 중 하나로
  `/api/billing/charge` 호출. `BILLING_CRON_SECRET` 필수.
- Toss webhook signature/secret 검증은 운영 대시보드에서 실제 webhook secret
  및 header 스펙 확인 후 `/api/webhook/toss` 에 보강.

## 2026-05-14 Phase 7 Pro Checkout UI Wiring

### Codex

- SubscriptionPanel의 월간/연간 Pro 카드가 선택 plan을 UpgradeModal로 전달하도록
  변경.
- Toss JS SDK v2 loader 추가 (`https://js.tosspayments.com/v2/standard`).
- UpgradeModal에서 로그인 사용자와 `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`가
  준비되면 `payment.requestBillingAuth()` 호출:
  - method: `CARD`
  - successUrl: `/billing/success?planInterval=monthly|yearly`
  - failUrl: `/billing/fail?planInterval=monthly|yearly`
  - customerKey: Supabase user id
- `/billing/success` 추가:
  - Toss redirect query의 `authKey`, `customerKey`, `planInterval`을 받아
    `/api/billing/issue-key`로 전달.
  - 성공 시 30일 Trial 시작 안내.
- `/billing/fail` 추가:
  - Toss redirect error code/message 표시.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass.

### Follow-up

- 사용자가 Toss 개발자센터에서 테스트용 API 개별 연동 키를 발급해
  `apps/web/.env.local`에 `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`,
  `TOSS_PAYMENTS_SECRET_KEY`를 채워야 실제 카드 등록창과 billing key 발급
  smoke test 가능.
- env 변경 후 web dev server 재시작 필요.
- SubscriptionPanel이 DB의 `user_subscriptions` 상태를 직접 읽어 다음 결제일,
  등록 카드 일부, 취소 버튼을 표시하도록 보강.
- 회원가입 직후 billing 등록 step 강제는 별도 onboarding UI로 분리.

## 2026-05-14 Payment UX / Future Providers

### Codex

- 사용자가 Toss 자동결제 화면이 "카드 등록하기"로 보이는 점을 지적.
- 기술 구조는 Toss Payments billing key 발급을 유지하되, 사용자-facing 문구는
  일반 결제 UI에 가깝게 변경:
  - UpgradeModal CTA: "카드 등록하기" → "Toss로 결제하기"
  - 진행 상태: "결제창 여는 중" → "Toss 연결 중"
  - success/fail 페이지의 "카드 등록" 표현 → "Toss 결제" 표현
- 결제 모달에 결제수단 버튼 UI 추가:
  - Toss만 enabled.
  - 신용카드 / 계좌이체 / 네이버페이 / 카카오페이 / 기타결제수단은 브랜드
    색을 반영하되 disabled 예정 상태.
- 하단 "취소" / "Toss로 결제하기" CTA를 제거하고 결제수단 버튼 자체가 액션이
  되도록 변경. 현재는 Toss 버튼 클릭 시 바로 Toss billing auth 창을 연다.
- v1 결제 provider는 Toss Payments 빌링 유지.
- 네이버페이 자동결제, 카카오페이 자동결제, PortOne 경유 다중 PG는 추후
  결제수단 확장 트랙으로 문서화. 확장 시 provider-agnostic subscription /
  payment method 모델로 점진 전환 필요.

## 2026-05-14 Phase 7 Pro Checkout Subscription Status

### Codex

- `GET /api/billing/subscription` 추가:
  - 로그인 사용자를 Supabase server client로 확인.
  - service-role client로 `user_subscriptions` 현재 row 조회.
  - plan/status/trial/subscribed/next billing/payment method fields 반환.
- Settings → 구독 패널이 원격 subscription 상태를 읽도록 연결:
  - status badge: Trial / 활성 / 결제 확인 필요 / 일시중지 / 만료 / 해지됨.
  - 결제 주기, 다음 결제일, 결제수단, Trial 종료일 표시.
  - 새로고침 버튼 추가.
  - Toss 구독이 활성 상태면 `POST /api/billing/cancel`로 구독 해지 버튼 표시.
- 기존 local settings `plan` 대신 서버 subscription row를 구독 상태 source of
  truth로 사용.

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass.

### Follow-up

- 실제 Toss billing auth smoke 후 success page → subscription panel refresh
  시 값이 기대대로 표시되는지 수동 확인.
- 회원가입 직후 billing 등록 step 강제(B4-c)와 cron(B3)은 계속 잔여.
- 사용자가 hosted Supabase에 `supabase db push` 실행. 이후
  `/api/billing/subscription` 이 hosted DB에서 200 응답으로 확인됨.

## 2026-05-14 Claude Handoff Prep

### Codex

- Claude 전환을 위해 `docs/claude_handoff.md`를 최신화:
  - 날짜를 2026-05-14로 갱신.
  - 현재 worktree에 남아 있는 Pro checkout 변경 파일 목록을 명시.
  - 최신 verification expectation 갱신: web tests 86개, iOS Swift tests 30개.
  - Phase 7 web shape를 desktop shell + Pro checkout wiring 기준으로 갱신.
  - Hosted Supabase applied migrations에 waitlist / toss billing 추가.
  - Pro checkout 상세 섹션 추가:
    schema, Toss server/client wrappers, billing API routes, success/fail pages,
    subscription panel behavior, known limitations, immediate next steps.
- `README.md`, `next_steps.md`, `just_do_db_schema.md`, `worklog.md`는 이미
  Toss billing / future providers / hosted migration 상태를 반영.

### Current Uncommitted Scope

- Web payment code:
  - `apps/web/src/lib/billing/`
  - `apps/web/src/app/api/billing/`
  - `apps/web/src/app/api/webhook/toss/`
  - `apps/web/src/app/billing/`
  - `apps/web/src/features/just-do/app-shell.tsx`
- DB/types:
  - `supabase/migrations/20260514061000_toss_billing.sql`
  - `apps/web/src/lib/supabase/database.types.ts`
- Docs/env template:
  - `apps/web/.env.local.example`
  - `README.md`
  - `docs/claude_handoff.md`
  - `docs/just_do_db_schema.md`
  - `docs/next_steps.md`
  - `docs/worklog.md`

## 2026-05-14 Deployment 트랙 — AWS 셋업 + 코드 사전 정비

### Claude Code

- AWS 계정 셋업 완료 (사용자 콘솔 진행, Claude 가이드):
  - 루트 MFA: 이미 활성화되어 있음 (패스키/보안 키, 2025-03-31 등록).
  - IAM admin 사용자 `justdo-admin` 생성 + `AdministratorAccess` 정책 + MFA 할당.
  - 결제수단: 기존 등록.
  - Budget 알림 `justdo-monthly` 생성:
    - 월별 비용 예산 $20 USD (모든 AWS 서비스 / 일반 요금).
    - 알림 4단계: 50% 실제 ($10), 80% 실제 ($16), 100% 실제 ($20),
      100% **예측** ($20). 모두 `kang071911@gmail.com` 으로.
  - 기본 리전 `ap-northeast-2` (서울) 로 전환.
- DNS 관리 모드 = **Route 53 위임** 결정.
  - Why: Amplify 자동 records, AWS 단일 콘솔. hosted zone $0.50/월은 예산 무시 가능.
- 코드 측 사전 정비:
  - `amplify.yml` 추가 (repo root). monorepo `appRoot: apps/web` + workspace install
    (`cd ../../ && npm ci --include=dev && cd apps/web && npm run build`).
    artifacts `.next`, cache는 root `node_modules` + `.next/cache`.
  - Secret leak grep 통과:
    - `lib/supabase/service-role.ts`, `lib/supabase/server.ts`, `lib/billing/toss.ts`
      모두 `import "server-only"` 마크.
    - 셋 다 `app/api/*/route.ts` 또는 `app/(auth)/callback/route.ts` 에서만 import.
    - `lib/billing/toss-client.ts` 는 clientKey만 받고 server secret 없음.
  - `app/(auth)/callback/route.ts` 는 `url.origin` 기반 redirect → 운영 도메인에
    자연스럽게 적응, env 의존 없음. (사이드 노트: `?next=` 파라미터 origin 검증
    없어 open redirect 가능. 보안 리뷰 트랙으로 이월.)
  - `apps/web/.env.local.example` 상단에 Amplify 등록 변수 분류 가이드 추가
    (public NEXT_PUBLIC_* vs server-only vs CLI/dashboard 전용).

### Verification

- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web test` — 7 files / 86 tests pass.
- `npm --prefix apps/web run build` — pass (12 routes: 정적 2 + 동적 10).

### Follow-up

- Route 53 hosted zone 생성 (`justdo.co.kr`) → 4개 NS records 가비아 네임서버
  교체 → propagation 대기.
- AWS Amplify Hosting GitHub repo 연결 → `main` branch → root `amplify.yml`
  자동 감지.
- Amplify 환경변수 등록: `apps/web/.env.local.example` 의 Amplify 등록 섹션
  목록 참고.
- Supabase Auth Settings → Site URL 운영 도메인으로 변경, Redirect URLs에
  `https://www.justdo.co.kr/callback` 추가.
- Google OAuth Console → Authorized redirect URIs에 동일 URL 추가.
- TLS 인증서 발급 확인 후 production smoke test.

## 2026-05-14 Deployment 트랙 시작 — 운영 도메인 확정

### Claude Code

- 운영 도메인을 **`justdo.co.kr`** 으로 확정 (가비아 구매 완료).
- 결정 근거:
  - 한국 사용자 타깃과 정렬.
  - `.co.kr` 은 사업자등록 + 통신판매업 신고와 자연스럽게 묶이며,
    Toss Payments 가맹점 심사 트랙과 동일한 사업자 정보 사용.
  - `justdo.com` 은 이스라엘 PM 툴이 선점 → 한국 .co.kr 사용으로 충돌 회피.
- `docs/deployment_domain_aws_plan.md` "Gabia Domain Purchase" 섹션에
  도메인 확정 박음.
- `docs/next_steps.md` Deployment Backlog 갱신:
  - Purchase production domain → 완료 체크 + `justdo.co.kr` 명시.
  - AWS 계정 셋업 (MFA / IAM / Budget) 항목 추가.
  - Toss webhook URL 등록 항목 추가 (`https://www.justdo.co.kr/api/webhook/toss`).

### Follow-up

- DNS 모드 결정 (Route 53 위임 vs 가비아 DNS) — AWS 셋업 후.
- AWS 계정 셋업 — 사용자 진행.
- 코드 측 사전 정비 — amplify.yml, secret leak grep, callback route 검증.
- Supabase / Google OAuth 운영 callback URL 추가:
  - `https://www.justdo.co.kr/callback`
  - `https://justdo.co.kr/callback` (apex 직접 서빙 시).

## 2026-05-16 Deployment 트랙 — Route 53 + Amplify 연결 + SSR 함정

### Claude Code

- Route 53 hosted zone (`justdo.co.kr`) 생성 → 4개 NS records를 가비아 네임서버에
  교체 (사용자 콘솔). propagation 1시간 내 반영 확인.
- AWS Amplify Hosting 앱 (`dcsdzu0ew3l2m`, 리전 ap-northeast-2) 생성, GitHub
  `xxxxKangxxxx/JustDo` `main` 브랜치 연결.
- 8개 환경 변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED`, `NEXT_PUBLIC_AUTH_APPLE_ENABLED`,
  `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `TOSS_PAYMENTS_SECRET_KEY`, `BILLING_CRON_SECRET`).

### 발견한 함정 3개

1. **monorepo + Next.js SSR auto-detect 실패**:
   - 첫 빌드: platform이 `WEB`(정적)으로 잡혀 `.next` 폴더가 정적 파일처럼 노출되며
     모든 경로가 404.
   - CLI `aws amplify update-app --platform WEB_COMPUTE`로 platform 변경 → 두 번째
     빌드는 `Failed to find the deploy-manifest.json file` 에러.
   - CLI `aws amplify update-branch --framework "Next.js - SSR"` 추가 → 세 번째
     빌드는 `Cannot read 'next' version in package.json. ... AMPLIFY_MONOREPO_APP_ROOT`.
   - Amplify 환경 변수에 `AMPLIFY_MONOREPO_APP_ROOT=apps/web` 추가 → 빌드 성공.
2. **SSR Lambda의 `request.url` 호스트가 `localhost`**:
   - Google OAuth flow 끝나면 `https://localhost:3000/`로 redirect 시도되어
     `ERR_CONNECTION_REFUSED`.
   - Supabase Site URL / Redirect URLs는 모두 정상, 우리 `callback/route.ts`가
     `url.origin`을 그대로 써서 발생.
   - `x-forwarded-host` / `x-forwarded-proto` 헤더 우선 사용으로 수정
     (commit `b414595`).
3. **server-only 환경변수가 SSR Lambda runtime에 inject 안 됨**:
   - `/api/billing/subscription`이 500 반환. 임시 debug payload 추가해 캡처한
     메시지: `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`.
   - 원인: Amplify Hosting Compute가 환경 변수를 빌드 shell에는 노출하지만 SSR
     Lambda runtime에는 자동 전달하지 않음. `NEXT_PUBLIC_*`은 Next.js가 server
     bundle에도 inline해서 영향 없지만 server-only secret은 undefined.
   - `amplify.yml`의 build 단계에서 `printenv | grep ... > .env.production`로
     server-only 값을 Next.js가 server bundle에 inline하게 만드는 패턴 적용
     (commit `300b86b`). `.gitignore`에도 `.env.production` 추가.

### Verification

- Production smoke test 통과 (2026-05-17): `https://www.justdo.co.kr` 접속,
  apex `https://justdo.co.kr` → www 자동 redirect, Google 로그인, Task / Habit
  생성·persist, Settings 구독 패널 Trial 상태 (Trial 종료일 2026-05-29) 노출.
- TLS 인증서 ACM 발급 정상.

## 2026-05-17 운영 도메인 LIVE + 태블릿 viewport 정책 + Deployment 마무리

### Claude Code

- 운영 smoke test 중 발견한 이슈 fix:
  - **태블릿 viewport 정책**: 모바일 안내 vs 데스크탑 shell 분기 breakpoint를
    Tailwind `lg`(1024px) → `md`(768px)로 낮춤. iPad Pro / Air portrait도 데스크탑
    shell. iPad mini와 phone만 모바일 안내 (commit `da678df`).
  - **subscription 500 디버그**: 임시 try/catch + debug payload 추가로 원인 파악
    후 디버그 페이로드 제거, try/catch는 유지 (commit `300b86b`).
- 운영 도메인 LIVE 사실을 next_steps Deployment Backlog에 박음. 남은 항목:
  - Toss webhook URL 등록 — Toss 가맹점 심사 후.
  - Supabase Redirect URLs에서 amplifyapp.com 항목 제거 (smoke test 완료).
- offline→online sync UI 표시 일관성 이슈는 사용자가 "이번엔 괜찮다" 응답해
  후속 모니터링으로 미룸 (큐 flush 자체는 정상).

### Follow-up

- Pro Checkout 잔여 (B3 cron, B4-c onboarding, B5 게스트 정책, B6 회귀 테스트).
- Toss 가맹점 심사 — 사업자등록 → 통신판매업 신고 → Toss 신청 (사용자 트랙).
- iOS Phase 6 잔여 (offline sync 검증 / detail edit·delete / sync error UI).

## 2026-05-18 Deployment 트랙 마무리 + 세션 종료

### Claude Code

- Supabase Redirect URLs에서 `https://main.dcsdzu0ew3l2m.amplifyapp.com/callback`
  백업 항목 제거 (사용자 콘솔). 운영 5개 + 로컬 3개 = 5개 URL만 남김.
- Deployment 트랙 완전 종료. 남은 외부 의존은 Toss 가맹점 심사 → webhook URL
  등록 한 줄.
- 다음 세션(Codex 또는 Claude Code) 픽업용 핸드오프 정리:
  - `README.md` Production 섹션에 `https://www.justdo.co.kr` LIVE 표시.
  - `docs/claude_handoff.md`:
    - Date `2026-05-14` → `2026-05-18`.
    - 운영 LIVE banner에 Redirect URLs 정리 사실 반영.
    - "다음 작업자가 픽업할 우선순위" 섹션 추가 (Toss 심사 + Pro Checkout
      B3/B4-c/B5/B6 + iOS 잔여).
    - "Recommended Next Work" 재정렬 (deployment 트랙 완료로 제거, Toss 심사를
      1순위로 박음).
    - "Amplify SSR 함정" 섹션 추가 — 신규 SSR route 추가 시 forwarded host /
      server-only env injection / monorepo platform·framework 3가지 함정 가이드.
    - Codex 세션 재개 가이드를 운영 LIVE 기준으로 갱신.
  - `docs/next_steps.md` "Where We Are" 섹션을 2026-05-18 운영 LIVE 기준으로
    갱신, 다음 우선순위 명시.

### Verification

- `git status` clean, `main` 기준 push 완료.
- 메모리(`deployment_domain.md`, `MEMORY.md` index)도 운영 LIVE 기준으로 갱신
  완료.

### Follow-up

- Toss 가맹점 심사 시작 (사용자 외부 트랙).
- Pro Checkout B3 cron 구현 — Vercel Cron vs Supabase Cron 선택.
- Pro Checkout B4-c onboarding billing step UI.
- Pro Checkout B6 회귀 테스트 — Toss SDK mock + webhook fixture.
- iOS Phase 6 잔여 (detail edit/delete / sync status UI / hosted offline sync
  검증 / proto 시각 검증).

## 2026-05-19 Toss 가맹점 심사 준비 시작

### Codex

- Toss 가맹점 심사 외부 트랙을 시작하기 위해 공식 문서 기준으로 요구사항을
  재확인:
  - 국세청 사업자등록 안내: 사업자등록은 사업장마다 필요하고, 사업개시 전
    또는 사업 시작 후 20일 이내에 신청. 홈택스로 온라인 신청/전자제출 가능.
  - Toss Payments 자동결제 문서: 자동결제는 추가 리스크 검토 및 계약 후 사용,
    정기 구독형 서비스가 아니면 정책적으로 제한 가능. 전자결제 계약 완료 후
    자동결제(빌링) MID의 라이브 client/secret key 사용.
  - Toss Payments 자동결제 문서: 구독 주기마다 빌링키로 결제 승인하는
    스케줄링은 상점이 직접 구현해야 함.
  - Toss 통신판매업 문서: 온라인으로 서비스/상품 판매 시 통신판매업 신고 및
    사이트 내 사업자 정보/통신판매업 신고번호 표시 필요. 면제 가능성이 있어도
    PG 심사와 운영 footer 정합성을 위해 v1에서는 신고 완료 방향을 추천.
- `docs/toss_merchant_review_plan.md` 추가:
  - 사업자등록 → 통신판매업 신고 → Toss 신청 → 승인 후 운영 키/webhook 등록
    체크리스트.
  - 사용자가 결정해야 할 항목: 상호, 사업장 주소, 과세유형, 업종코드,
    통신판매업 신고 진행 여부.
- `docs/next_steps.md` 에 Toss 심사 체크리스트 문서 링크 추가.

### Follow-up

- 사용자 결정 필요:
  - 상호
  - 사업장 주소 공개/사용 방식
  - 간이과세자 vs 일반과세자
  - 사업자등록 업종코드
  - 통신판매업 신고를 면제 검토 없이 바로 진행할지 여부
- 결정 후 Hometax 사업자등록 신청을 진행하고, 사업자등록증이 나오면
  통신판매업 신고 및 Toss Payments 가맹점 신청으로 이동.

## 2026-05-19 Pro Checkout B3 cron 결정

### Codex

- 사용자와 B3 cron을 AWS 기반으로 진행하기로 결정.
- 실행 시각은 매일 **05:30 KST** 로 확정.
- 공식 AWS 문서 확인 결과, 임의 HTTPS endpoint 직접 호출은 EventBridge
  Scheduler target이 아니라 EventBridge API Destination 영역이며, API
  Destination endpoint timeout은 5초 제한이 있음.
- 결제 route는 Toss API 호출과 DB update를 포함하므로, 최종 구조는
  **EventBridge Scheduler -> Lambda -> `POST /api/billing/charge`** 로 결정.
  이 구조는 AWS 운영 경계 안에 있고, 향후 Supabase에서 다른 RDBMS/backend로
  이동해도 scheduler가 app HTTP endpoint만 호출하므로 교체 비용이 낮음.
- `infra/aws/billing-cron-lambda.mjs` 추가:
  - `BILLING_CHARGE_URL`
  - `BILLING_CRON_SECRET`
  - optional `BILLING_CHARGE_TIMEOUT_MS`
  를 받아 production billing endpoint를 bearer token으로 호출.
- `docs/aws_eventbridge_billing_cron.md` 추가:
  - 05:30 KST schedule
  - Lambda env vars
  - manual smoke test
  - production enablement checklist

### Follow-up

- AWS 콘솔에서 Lambda 생성 후 `infra/aws/billing-cron-lambda.mjs` 배포.
- EventBridge Scheduler schedule `cron(30 5 * * ? *)`, timezone
  `Asia/Seoul`, target Lambda로 생성.
- 수동 Lambda invoke 후 CloudWatch logs와 `/api/billing/charge` 200 응답 확인.
- 운영 Toss 키 전환 전까지는 테스트 billing key가 있는 row로만 smoke.

### Lambda smoke result

- AWS Lambda `justdo-prod-billing-cron` 생성 완료.
- 환경변수 설정 완료:
  - `BILLING_CHARGE_URL=https://www.justdo.co.kr/api/billing/charge`
  - `BILLING_CRON_SECRET`
  - `BILLING_CHARGE_TIMEOUT_MS=25000`
- 수동 테스트 성공:
  - status `200`
  - body `{ ok: true, charged: [], failed: [] }`
  - duration 약 4.4초
- EventBridge Scheduler final review screen 확인:
  - schedule `justdo-prod-billing-charge-daily`
  - cron `30 5 * * ? *`
  - timezone `Asia/Seoul`
  - target Lambda `justdo-prod-billing-cron`
  - payload `{ "source": "aws.eventbridge.scheduler" }`
  - enabled, retry off, no DLQ
- 남은 B3 운영 작업: schedule 생성 버튼 클릭 여부 최종 확인 및 첫 scheduled
  invocation CloudWatch 확인.

## 2026-05-19 Pro Checkout B4-c/B5 정책 재정의

### Codex + User

- 사용자가 현재 production 비로그인 화면을 확인해 정책을 명확히 함:
  - 비로그인 사용자는 `Just Do.` 로그인 화면과 Google / Apple 로그인 버튼만
    본다.
  - 비로그인 사용자는 앱 shell, Task/Habit 기능으로 진입하지 못한다.
  - 따라서 v1 Web은 게스트 모드를 사용자-facing 기능으로 지원하지 않는다.
- 기존 문서의 "회원가입 직후 billing 등록 step 강제" / "게스트 모드 유지 후
  로그인 진입 시 빌링 등록 강제" 계획은 현재 제품 방향과 맞지 않아 폐기.
- 최신 정책:
  - 로그인한 사용자는 기본 앱을 사용할 수 있다.
  - 회원가입/로그인 후 생성되는 30일 Trial 동안 Pro 기능도 사용할 수 있다.
  - 결제수단 등록은 앱 전체 진입 조건이 아니라 Trial 이후 Pro 기능을 계속
    사용하기 위한 조건이다.
  - `billing_provider` / `toss_billing_key` 유무는 entitlement 조건이 아니라
    Trial 종료 후 자동결제 준비 상태로 표시한다.
  - `trial` / `active`는 Pro entitlement 보유 상태로 본다.
  - `past_due` / `paused` / `cancelled` / `expired` / `free`는 Pro 기능 gate에서
    구독/결제 CTA로 유도한다.

### Follow-up

- B4-c 구현은 전체 앱 gate가 아니라 Pro 기능별 entitlement / upgrade gate로
  진행.
- B5는 "게스트 모드 지원"이 아니라 로그인 필수 정책을 문서/테스트로 고정하고,
  남아 있는 localStorage guest 경로를 레거시 hydration/개발 fallback 설명과
  구분하는 작업으로 진행.

## 2026-05-19 Pro Checkout B4-c/B5 구현

### Codex

- `apps/web/src/features/just-do/app-shell.tsx`
  - `useBillingSubscription()` helper 추가. `/api/billing/subscription`을 읽고
    subscription 상태/로딩/에러/refresh를 공유.
  - Pro entitlement helper 추가:
    - `trial` / `active` + `plan_name='pro'` 는 Pro 기능 사용 가능.
    - `past_due` / `paused` / `cancelled` / `expired` / `free` 는 Pro 기능
      gate에서 구독/결제 CTA로 유도.
    - `billing_provider` 유무는 entitlement 조건이 아니라 Trial 이후
      자동결제 준비 상태로만 사용.
  - 현재 구현된 Pro 대상 기능인 Stats dashboard에 gate 적용. Trial 사용자는
    통계 화면을 그대로 볼 수 있고, cancelled 등 비-entitled 상태는 upgrade
    gate를 본다.
  - SubscriptionPanel 정책 수정:
    - Trial + 결제수단 미등록 상태는 Pro로 표시하되, Toss 결제 연결 CTA와
      안내문 노출.
    - Trial + 결제수단 등록 또는 active 상태는 사용 중으로 표시.
  - Account 설정의 fallback 문구를 `게스트`에서 `로그인 필요` 기준으로 정리.
- `apps/web/src/features/just-do/app-shell.test.tsx`
  - signed-out 사용자는 로그인 화면에 머물고 `새 Task` 버튼이 보이지 않음을
    테스트로 고정.
  - Trial 사용자는 Stats dashboard를 열 수 있음을 검증.
  - Cancelled 구독은 Stats Pro gate로 막힘을 검증.
  - Trial + 결제수단 미등록 상태에서 구독 패널이 Toss 결제 연결 CTA를 보여줌을
    검증.

### Verification

- `npm --prefix apps/web test` — pass, 7 files / 90 tests.
- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web run build` — pass. 최초 sandbox 실행은 Turbopack
  내부 port bind 권한 문제로 실패했고, 동일 명령을 escalated로 재실행해 통과.

### Follow-up

- B6 Toss 회귀 테스트: SDK mock, billing API routes, webhook fixture /
  idempotency.
- B3 EventBridge 첫 scheduled invocation CloudWatch 확인.

## 2026-05-19 Free / Pro 기능 경계 결정

### User + Codex

- v1 기능 경계:
  - **Free**: Task/Habit 기록·관리, 캘린더, 카테고리, 태그, 기본 동기화,
    데이터 export, 기본 위젯 3종.
  - **Trial / Pro**: 분석·리포트·고급 기능.
- 현재 구현된 Pro gate 대상은 통계 화면 전체로 유지.
- 월간 리포트는 v2 도입 예정이며 구현 시 Pro gate 대상.
- Task Dependency 시각화는 v2 도입 예정이며 구현 시 Pro gate 대상.
- 데이터 export는 Free 대상.
- 위젯은 제품에서 중점을 두고 구현해야 하는 핵심 기능이므로 기본 3종은 Free에
  제공한다.
- 추후 위젯 커스터마이징을 도입할 경우, 기본 위젯 사용성은 Free로 유지하고
  고급 커스터마이징 범위만 별도 정책으로 확정한다.

## 2026-05-19 Pro Checkout B6 route regression tests

### Codex

- `apps/web/src/app/api/billing/billing-routes.test.ts` 추가.
- 테스트 범위:
  - `/api/billing/issue-key`
    - 인증된 사용자의 Toss billing key 발급 후 `user_subscriptions` upsert
      payload 검증.
    - 비인증 요청 401 검증.
  - `/api/billing/charge`
    - due subscription 결제 성공 시 Toss charge 호출, `payment_events` insert,
      subscription active/update payload 검증.
    - 실패 3회째에 `status='paused'`, `next_billing_at=null`,
      `BILLING_CHARGE_FAILED` event insert 검증.
  - `/api/webhook/toss`
    - Toss webhook fixture 저장, `provider_event_id` 기반 idempotent upsert,
      DONE payment의 subscription active/update payload 검증.
- 테스트 환경에서 `server-only` import가 막히므로 route test에서 빈 mock으로
  대체. Supabase server/service-role client와 Toss wrapper는 mock 주입.

### Verification

- `npm --prefix apps/web test` — pass, 8 files / 95 tests.
- `npm --prefix apps/web run lint` — pass.
- `npm --prefix apps/web run build` — pass (escalated; Turbopack internal port
  bind requires elevated execution in this sandbox).

### Remaining B6 gaps

- Toss SDK client mock (`toss-client.ts` / UpgradeModal button flow).
- Cancel route edge cases.
- Toss 테스트 키 E2E smoke.
- Webhook signature verification after Toss dashboard secret/header details are
  available.

## 2026-05-19 iOS Phase 6 detail edit/delete

### Codex

- `apps/ios/JustDoApp/JustDoApp/ContentView.swift`
  - Pushed `TaskDetailScreen` and `HabitDetailScreen` are no longer read-only.
  - Added edit forms for task title/date/time/priority/tags/completion and habit
    title/emoji/start date/repeat/reminder.
  - Save actions call `CoreDataAppSnapshotStore.applyAndEnqueue` with
    `taskUpsert` / `habitUpsert`, then refresh the local detail from the mirror.
  - Delete actions show a destructive confirmation, enqueue `taskDelete` /
    `habitDelete`, and dismiss back to the previous screen.
- `docs/ios_phase6_status.md` and `docs/next_steps.md` updated to mark detail
  edit/delete complete and keep sync status UI / visual verification as the next
  iOS gaps.

### Verification

- `cd apps/ios && swift test` — pass, 30 tests.
- `cd apps/ios && xcodebuild -project JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build` — pass.
