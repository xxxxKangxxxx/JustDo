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

- Habit calendar dot 기준을 `habit.log[date]` 에서 `habit.startedAt <= date` 로 변경.
  - 매일 반복 습관은 체크 여부와 관계없이 시작일 이후 모든 날짜에 habit dot 표시.
  - 선택한 날짜의 habit 목록도 시작일 이후 habit만 표시.
- Task 추가/수정 시 시작일을 종료일 이후로 변경하면 종료일을 시작일로 자동 보정.
- Submit 직전에도 `endDate >= startDate` 를 보장하도록 저장 payload 보정.
- `habitsOnDate` selector 및 단위 테스트 추가.

### Verification

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web test` → 57 tests pass.
- `npm --prefix apps/web run build` → pass.
