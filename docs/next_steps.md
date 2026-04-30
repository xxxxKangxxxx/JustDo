# Just Do Next Steps

This document tracks the next implementation steps for Codex and Claude Code cross-checking.

## Current Ground Rules

- Treat `reference/proto/` as the primary UI and behavior reference.
- Treat `reference/screens/` and `reference/design-board.html` as visual support only.
- Do not build the real app inside `reference/`.
- Create new implementation directories under `apps/` when development starts.
- Record important implementation decisions and cross-check notes in `docs/worklog.md`.

## Where We Are (2026-04-30)

- Phase 1–5 done. Phase 5 follow-up (Task tag UI, offline sync regression
  tests, manual verification doc) shipped in this session — see working
  tree state in `docs/claude_handoff.md`.
- All v1 open decisions closed in this session. Decision matrix lives in
  `docs/claude_handoff.md` ("v1 Open Decisions — all closed") with full
  rationale in `docs/worklog.md` 2026-04-29 entries.
- Phase 5.5 Category Management, Phase 5.6 User Preferences Sync, and
  Phase 5.7 Habit Recurrence (daily + weekly) are implemented. The web
  domain model is now ready for Phase 6 iOS planning, aside from remaining
  PRD/planning prose cleanup and optional category drag reorder polish.

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

- [x] Replace prototype `localStorage` state with a typed local data layer.
- [x] Use runtime dates instead of the fixed `2026-04-21` sample date.
- [x] Normalize enum naming, especially `priority`: use `high`, `medium`, `low`.
- [x] Implement calendar start weekday behavior from settings.
- [x] Add focused tests for date range and calendar rendering helpers.

## Phase 4: Supabase Integration

> 운영 원칙은 `backend_strategy.md` 참고. 모든 Supabase 의존 코드는 어댑터 뒤에 격리한다.

### 4-1. 스키마 / 마이그레이션
- [x] `docs/just_do_db_schema.md` 검토 — `auth.users` 직접 FK 제거, `public.users` 경유 구조 확인.
- [x] `supabase/` 워크스페이스 셋업 (`supabase init`).
- [x] raw SQL 마이그레이션 작성 (`supabase/migrations/0001_init.sql` 등).
- [x] 모든 user-owned 테이블 RLS 정책 작성.
- [x] `supabase start` 로컬 검증.
- [x] `habits.emoji` 보강 마이그레이션.

### 4-2. 클라이언트 / 어댑터
- [x] `apps/web`에 `@supabase/supabase-js` 설치.
- [x] `lib/supabase/client.ts` 브라우저 클라이언트 (싱글턴, env 검증).
- [x] `supabase gen types typescript --local` 로 `database.types.ts` 생성.
- [x] `JustDoStorage`를 per-entity 인터페이스로 확장 (load + saveSettings/saveView + upsertTask/deleteTask + upsertHabit/setHabitLog).
- [x] `localStorage` / `memory` 어댑터를 새 인터페이스로 재구현.
- [x] `createSupabaseStorage(client, userId)` 어댑터 + 매핑 레이어 (`supabase-mapping.ts`).
- [x] 어댑터/매핑 단위 테스트.

### 4-3. 인증
- [x] `lib/auth/useAuth.tsx` — Supabase Auth를 감싸는 훅. `{ user, status, signIn, signOut }` 도메인 타입만 노출. Supabase 세션/JWT 형태는 훅 안에서만 보임.
- [x] `app/(auth)/callback/route.ts` — OAuth 콜백 처리.
- [x] Apple / Google provider 활성화 (`supabase/config.toml` `[auth.external.*]` + `.env.local`에 client id/secret). 실제 provider credential 값 입력은 배포/로컬 OAuth 검증 시 필요.
- [x] `JustDoProvider`가 `useAuth().user`를 받아 로그인 상태에서는 `createSupabaseStorage(client, user.id)`, 비로그인 상태에서는 `createLocalStorageStorage(...)`를 사용하도록 storage 선택 로직 추가.
- [x] `public.users` upsert / `user_subscriptions` Trial 레코드 생성은 `handle_new_auth_user()` 트리거가 처리 — Google OAuth 로그인 후 로컬 DB에서 확인.
- [x] `Task.tags` round-trip 활성화 — `task_tags` upsert/delete + `tags` 테이블 lookup-or-create. (Phase 4-2에서 미뤄둔 항목)
- [x] `useAuth` 단위 테스트 (mocked Supabase Auth client).
- [x] React dev/StrictMode에서 `setState` updater 내부 side effect가 중복 원격 저장을 만들지 않도록 store mutation purity 보강.
- [x] 인증 상태 UI 정리 — loading/signed-in/guest 상태 표시, 로그인 실패 메시지 노출, provider availability에 따라 Apple 버튼 비활성화.
- [x] 원격 저장 오류 노출 — persistence 실패를 `syncError` 로 캡처하고 Settings 동기화 섹션에 표시.
- [x] 로컬 개발 데이터 정리 절차 추가 — `npm run db:reset-local-app-data`, `docs/local_dev.md`.

### 4-4. Realtime
- [x] `JustDoStorage.subscribe(callback)` 인터페이스 확장.
- [x] tasks / habits / habit_logs 테이블 구독.
- [x] Realtime 페이로드를 도메인 이벤트 타입으로 매핑.
- [x] `task_tags` / `tags` realtime 반영. tag join 변경 시 affected task를 재조회해 `Task.tags` 최신 상태 반영.

### 4-5. 환경변수 / 보안
- [x] `.env.local.example` 작성, `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` 분리 명시.
- [x] service_role 키가 클라이언트 번들에 들어가지 않도록 import 경로 검증.
- [x] server-only 경계 추가 — `lib/supabase/server.ts`, `lib/supabase/service-role.ts`.
- [x] production build output에서 실제 `SUPABASE_SERVICE_ROLE_KEY` 값 미포함 확인.

## Phase 5: Offline Sync

- [x] Add IndexedDB storage for the web app.
- [x] Track local mutations with `updated_at` timestamps.
- [x] Implement Last Write Wins sync against Supabase.
- [x] Add an offline status indicator in the UI.

## Phase 5.5: Category Management

> Phase 6 iOS 진입 전 완료 필수. 도메인 모델이 크게 바뀌므로 iOS 가 mirror 하기 전에 확정돼야 한다.

### 5.5-1. 스키마 / 마이그레이션
- [x] `categories` 에 `position int default 0`, `is_default boolean default false` 추가.
- [x] 기존 시드 row (`나`, `외부`) 에 `is_default = true` 백필.
- [x] `handle_new_auth_user()` 트리거 수정: 시드 카테고리 insert 시 `is_default = true` 설정.
- [x] `categories` realtime publication 등록.

### 5.5-2. 도메인 / 어댑터
- [x] `TaskCategory = "me" | "ext"` enum 폐기. `Task.category` → `Task.categoryId: string | null`.
- [x] 새 `Category` 타입 (`{ id, name, color, isDefault, position }`) 추가, `AppState.categories: Category[]`.
- [x] Habit 의 `category = "habit"` 은 그대로 유지 (사용자 카테고리와 분리).
- [x] Supabase 어댑터: `categories` CRUD + 로드 join.
- [x] 기존 `taskCategoryToName` / `nameToTaskCategory` 매핑 제거.
- [x] 어댑터/매핑 단위 테스트 갱신.

### 5.5-3. Realtime / Offline
- [x] `categories` 채널 추가, INSERT/UPDATE/DELETE → `category_*` 도메인 이벤트.
- [x] IndexedDB queue 에 `category_upsert`, `category_delete` 뮤테이션 타입 추가.
- [x] `flushQueuedMutations` 가 카테고리 뮤테이션도 처리하도록 확장.

### 5.5-4. UI / 디자인 토큰
- [x] Settings → "카테고리" 관리 화면: 리스트 (화살표 버튼 reorder), rename, 색상 변경, 삭제. 마지막 카테고리 삭제 방지.
- [x] 색상 입력: **preset 팔레트 (8색) + custom hex picker** 둘 다 v1 에 제공.
  - hex 직접 입력 + 숨김 native color picker 버튼 제공. 기본 color input 의 네모 swatch 는 노출하지 않음.
  - hex 입력 시 light/dark 각 모드용 (solid, soft, ink) 자동 계산 로직 (예: HSL 기반 보정).
  - preset 8색은 hex 기반 + HSL 보정으로 시작.
- [x] `categoryStyle(category, mode)` 헬퍼 추가, `tokens[mode].me/ext` 직접 참조 사용처 (Add/Edit Sheet, Detail, Home, primitives 등) 전부 헬퍼로 마이그레이션.
- [x] Add/Edit Task sheet 의 카테고리 segment → 동적 chip selector.
- [x] 카테고리 개수 무제한, 검색 없음, reorder 만 지원.
- [x] Button reorder 유지 + drag reorder interaction 추가.

### 5.5-5. 문서 / 회귀
- [ ] `just_do_prd.md`, `just_do_planning.md` 의 me/ext 서술 갱신.
- [x] `just_do_db_schema.md` 의 me/ext 서술 갱신.
- [x] 게스트 (비로그인) localStorage 의 기존 `category: "me"|"ext"` 데이터 hydration 처리: 기본 시드 카테고리 생성 + legacy enum 매핑.
- [x] `npm --prefix apps/web run lint / test / build` 통과.

## Phase 5.6: User Preferences Sync

> Phase 6 iOS 진입 전 완료. cross-device 사용자 선호 동기화 인프라.

### 5.6-1. 스키마
- [x] `public.users` 에 `preferences jsonb not null default '{}'::jsonb` 컬럼 추가 (마이그레이션 1개).
- [x] RLS 는 기존 `users_select_self` / `users_update_self` 정책 재사용.

### 5.6-2. 어댑터
- [x] Supabase 어댑터에 preferences load/save 추가 — partial JSONB merge 패턴.
- [x] `JustDoStorage.saveSettings(settings)` 가 cross-device 필드만 추출해 preferences 로 라우팅. 나머지는 device-local 유지.
- [x] v1 동기화 필드: **`week_start`** 하나만.
- [x] 어댑터/동기화 단위 테스트.

### 5.6-3. 오프라인 큐
- [x] `preferences_set: { key, value }` 뮤테이션 타입 추가.
- [x] `flushQueuedMutations` 가 preferences 뮤테이션도 처리.

### 5.6-4. 동작 정책
- [x] Realtime 미포함. 다음 load 시 반영.
- [x] 게스트 → 로그인 전이 시 localStorage 의 `weekStart` 를 1회 원격에 push (서버 값이 default 일 때만). 이후 원격 우선.
- [x] 향후 cross-device 필드 추가 시 JSONB 키만 늘리면 됨 (migration 불필요).

### 5.6-5. 문서
- [x] `claude_handoff.md` 의 "settings/view remain device-local" 노트 갱신: `weekStart` 만 예외.

## Phase 5.7: Habit Recurrence (daily + weekly)

> Phase 6 iOS 진입 전 완료. PRD 가 명시한 Habit 반복 주기 기능의 v1 구현.

### 5.7-1. 도메인
- [x] `Habit` 에 `recurType: 'daily' | 'weekly'`, `recurDays?: number[]` (0=일~6=토) 추가.
- [x] `NewHabitInput` 갱신.
- [x] `recurType` 미지정 hydration 시 'daily' 폴백 (구버전 localStorage 호환).

### 5.7-2. 어댑터
- [x] `habitDomainToInsert`: 하드코딩된 `'daily'` 제거, 도메인 값 그대로 insert. `recur_days` 도 함께.
- [x] `habitRowToDomain`: `recur_type` / `recur_days` 보존. `recur_type === 'monthly'` 행은 v1 에 진입할 수 없으므로 'daily' 폴백.
- [x] 어댑터 단위 테스트 갱신.

### 5.7-3. UI
- [x] Add Sheet (habit 모드): 반복 segment "매일 / 요일" 추가. weekly 선택 시 요일 picker (7개 토글, 최소 1개 선택 필수).
- [x] Habit detail/edit 화면 추가: 제목, 이모지, 반복 설정, 알림 시간, 삭제, 최근 체크 기록 확인/수정.

### 5.7-4. Selectors / Habit Screen
- [x] `habitActiveOn(habit, iso)` 헬퍼: daily 면 항상 true, weekly 면 해당 요일 포함 여부.
- [x] `habitStreak` 가 비활성 요일을 *skip* 하면서 카운트 (비활성일은 break 가 아님).
- [x] Habit Screen `DAILY CHECK`: 분모를 *선택 날짜에 활성인 habit* 으로만 카운트. 비활성 habit 은 Today 리스트에서 숨김.
- [x] `LAST 7 DAYS` grid: 비활성 요일 셀은 disabled (회색, 클릭 비활성).
- [x] selector / streak 단위 테스트 보강.

### 5.7-5. 문서
- [x] `just_do_prd.md` / `just_do_planning.md` 의 "매일/매주/매월" 표현을 v1=매일+매주, v2=매월 로 정리.
- [x] worklog 에 v2 확장 경로 명시 (`recurType` enum 에 'monthly' 추가, `recurDays` 의미 분기, `recur_end_date` 도메인 추가).

## Phase 6: iOS Planning

- [ ] Create `apps/ios/` once the web domain model is stable.
- [ ] Map the shared domain model to Swift/SwiftUI.
- [ ] Plan Core Data entities from the Supabase schema.
- [ ] Define iOS App Group cache and mutation queue for WidgetKit actions.
- [ ] Implement WidgetKit small, medium, and large widgets based on `reference/screens/widgets.jsx`.

## UX / UI Backlog

- [x] Home calendar scope: 캘린더 dot/list 는 Task 중심으로 유지하고 Habit은 전용 탭에서 관리.
- [x] Navigation scope: 통계는 하단 탭에서 제거하고 설정 > 활동 요약 메뉴로 이동.
- [x] Task date range guard: 시작일을 종료일 이후로 변경하면 종료일도 시작일로 자동 보정.
- [x] Task tag UI: Add/Edit Task sheet 에 chip 입력 추가 (Enter/콤마 commit, Backspace 로 마지막 태그 삭제, 칩 클릭 시 제거). `tags`/`task_tags` round-trip 활용.
- [ ] Date/time input polish: MVP는 브라우저/모바일 기본 `input type="date"` / `input type="time"` 유지. 추후 일관된 브랜드 경험이나 날짜 범위 선택 UX가 필요해지면 custom bottom-sheet picker 설계.

## Sync / Widget Backlog

- [x] Widget sync strategy documented in `docs/widget_sync_strategy.md`.
- [x] Define shared mutation event names that both web and iOS can implement.
- [x] Design iOS mutation queue schema for widget/offline writes.

## Open Decisions

- [x] Subscription pricing — 월 ₩1,900 / 연 ₩9,900 (연 환산 월 ₩825). Apple Tier 2 (월 ₩1,900) + custom annual. Todomate (월 ₩1,500 / 연 ₩7,500) 대비 살짝 상위 포지션.
- [x] Web/iOS type sharing — v1 은 각 플랫폼이 로컬에서 mirror. Web 은 `supabase gen types typescript` 자동 생성, iOS 는 Swift Codable struct 를 손으로 작성 + drift 감지 unit test. 추후 트리거 (migration 10회 이상 또는 drift 버그 2회 이상) 발생 시 `database.types.ts` 파싱 기반 Swift codegen 자동화 도입.
- [x] Task Dependency 시각화 — v1 미포함, v2 에 모델+시각화 함께 도입 (PRD/planning 결정 유지). `task_dependencies` 테이블은 schema 에 이미 존재하지만 v1 동안 idle. v2 시작 전 컬럼 확장 (예: `kind: 'blocks' | 'related'`) 필요 여부 재검토.
- [x] User-customizable categories — v1 에 풀 CRUD 도입 (Pro 게이팅 없음). `me`/`ext` enum 폐기, `Task.categoryId: string | null` 로 전환. Settings 에 카테고리 관리 화면 (rename/색상/reorder/삭제). 색상은 v1 부터 custom hex picker (preset 팔레트 + hex 입력 동시 제공). 카테고리 개수 무제한, 검색 없음, 사용자 reorder 만. Habit 은 별개 — `Habit.category = "habit"` 유지. 별도 Phase 5.5 로 분리하여 Phase 6 iOS 시작 전 완료.
- [x] `settings` / `view` 원격 영속화 — `public.users.preferences jsonb` 컬럼 도입 (Phase 5.6). v1 동기화 필드는 `week_start` 하나만. 그 외 (`notify`, `notifyTime`, `dark`, `view.*`) 는 영구 device-local. `plan` 은 기존 `user_subscriptions` 그대로 사용.
- [x] `Habit.recur_type` 도메인 모델 정식화 — v1 에 daily + weekly 구현 (Phase 5.7). monthly 와 `recur_end_date` 는 v2. 도메인에 `Habit.recurType: 'daily' | 'weekly'`, `Habit.recurDays?: number[]` (0=일~6=토) 추가.
