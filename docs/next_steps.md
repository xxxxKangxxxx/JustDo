# Just Do Next Steps

This document tracks the next implementation steps for Codex and Claude Code cross-checking.

## Current Ground Rules

- Treat `reference/proto/` as the primary mobile/iOS UI and behavior reference.
- Treat `reference/web_proto/` and `reference/Just Do - Web Prototype.html` as
  the primary desktop web UI/UX reference.
- Treat `reference/screens/` and `reference/design-board.html` as visual support only.
- Do not build the real app inside `reference/`.
- Create new implementation directories under `apps/` when development starts.
- Record important implementation decisions and cross-check notes in `docs/worklog.md`.

## Where We Are (2026-05-21)

- **운영 LIVE**: `https://www.justdo.co.kr` (apex → www redirect). AWS Amplify
  Hosting Compute (`dcsdzu0ew3l2m`, ap-northeast-2) + Route 53 + ACM TLS +
  hosted Supabase backend. Production smoke test 통과.
- Phase 7 Web Desktop Redesign은 **Pro checkout 외부 의존 확인** 위주로
  남음. B3 cron은 AWS EventBridge Scheduler + Lambda 운영 리소스 생성, 수동
  테스트, 첫 자동 실행 CloudWatch 확인까지 완료(2026-05-21). 남은 것은 live
  billing 시작 전 DLQ 추가뿐. B6 회귀 테스트는 route 단위, Toss SDK client
  mock, cancel edge cases, webhook fixture/idempotency까지 보강 완료. 남은
  것은 Toss 테스트 키 E2E smoke와 공식 dashboard secret/header 확인 후
  webhook signature 검증.
- 태블릿 viewport 정책: 모바일 안내 vs 데스크탑 shell 분기 breakpoint를
  Tailwind `md` (768px)로 낮춤. iPad Pro/Air portrait도 데스크탑 shell,
  iPad mini와 phone만 모바일 안내.
- iOS Phase 6 잔여 작업은 실기기 시각 검증 중심. Detail edit/delete,
  Settings sync status UI, hosted Supabase offline sync, Home row check,
  calendar task bar/no-dot rendering, fixed-calendar/resizable-panel, widget
  task/habit toggle, widget deep link, compact task-completion mutation은
  구현/검증 완료. 남은 검증은 Expo Go가 아니라 Xcode 직접 설치 또는 추후
  TestFlight로 진행.
- 다음 우선순위: **Toss 가맹점 심사 시작 (외부 트랙, 가장 긴 차단)** +
  **Toss test-key E2E / webhook signature 확인** + **iOS 실기기 시각 검증**.
  Toss 운영 키 발급 전까지는 코드 트랙을 테스트 키로 진행. DLQ는 live billing
  시작 직전 추가.
- Toss 가맹점 심사 준비 체크리스트는 `docs/toss_merchant_review_plan.md`에
  별도로 정리.
- Pro Checkout B3 cron 결정: AWS EventBridge Scheduler -> Lambda ->
  `/api/billing/charge`, 매일 05:30 KST. 설정 문서:
  `docs/aws_eventbridge_billing_cron.md`.

## Where We Were (2026-05-11)

- Phase 7 desktop web shell first pass is implemented.
- Mobile web now has a viewport-based 안내 page for narrow screens. The
  desktop web app remains the primary web experience, and the mobile/iOS app
  remains a separate implementation track.
- Desktop UI interaction tests now cover the Phase 7 shell's key add/check/date
  selection/settings flows. Task detail modal tag editing and desktop Habit
  editing are implemented. Category reorder is restored in desktop Settings.
  Next Phase 7 work should focus on Pro checkout backend design/implementation,
  offline sync verification on the new UI, and visual checks across desktop
  widths.

## Where We Were (2026-05-10)

- **Platform Strategy 결정** (`just_do_prd.md` §1.5): Web=데스크탑 productivity hub, iOS=모바일 네이티브, Android=v3. Web과 iOS는 도메인/스키마만 공유하고 UI/UX는 분기.
- 그 결과 **Phase 7: Web Desktop Redesign**이 v1 출시 차단 항목으로 추가됨.
- Web desktop prototype이 도착했고, 첫 구현 패스가 `apps/web/src/features/just-do/app-shell.tsx`에 반영됨. 이전 단계의 "App Shape Now"(handoff)는 *iOS 기준*으로만 유효.

## Where We Are (2026-04-30)

- Phase 1–5 done. Phase 5 follow-up (Task tag UI, offline sync regression
  tests, manual verification doc) shipped earlier — see working tree
  state in `docs/claude_handoff.md`.
- All v1 open decisions closed. Decision matrix lives in
  `docs/claude_handoff.md` ("v1 Open Decisions — all closed") with full
  rationale in `docs/worklog.md` 2026-04-29 entries.
- Phase 5.5 Category Management, Phase 5.6 User Preferences Sync, and
  Phase 5.7 Habit Recurrence (daily + weekly) are implemented.
- Phase 6 SwiftPM shared track shipped: domain, mutation queue, drift
  tests, Core Data model/mappers, App Group snapshot store, SwiftUI
  widget layouts.
- Phase 6 Xcode track started: `apps/ios/JustDoApp/JustDoApp.xcodeproj`
  hosts `JustDoApp` and `JustDoWidgetExtension` targets; both depend on
  the SwiftPM `JustDoShared` library and share App Group
  `group.com.justdo.app`. The WidgetKit extension now reads the App Group
  snapshot, builds shared display models, and renders the shared small /
  medium / large layouts. The main app now seeds the Core Data mirror once,
  writes `widget_snapshot.json` from that native mirror on launch/foreground,
  and has a Supabase REST read-sync scaffold for replacing the mirror with
  account data. The app lifecycle now attempts that read sync when session
  values are available from Keychain, then falls back to seeded mirror data.
  Minimal PKCE OAuth sign-in and refresh-token handling are in place. The
  signed-in native root now includes Home / Stats / Settings tabs, proto-based
  auth and home styling, task/habit add flows, settings-owned dark mode, and
  habit/category management entry points. A launch-time Core Data crash caused
  by overlapping sync writes has been fixed by serializing store access and
  updating existing mirror rows in place.

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
- [x] `just_do_prd.md`, `just_do_planning.md` 의 me/ext 서술 갱신.
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

- [x] Create `apps/ios/` once the web domain model is stable.
- [x] Map the shared domain model to Swift/SwiftUI.
- [x] Plan Core Data entities from the Supabase schema.
- [x] Define iOS App Group cache and mutation queue for WidgetKit actions.
- [x] Add Swift drift tests with web-shaped snapshot, queue, and widget fixtures.
- [x] Implement initial Core Data model and domain mappers.
- [x] Implement App Group `WidgetSnapshot` read/write store.
- [x] Implement WidgetKit small, medium, and large widget layouts based on `reference/screens/widgets.jsx`.
- [x] Create Xcode app/widget/shared targets that host the SwiftPM shared code.
- [x] Wire WidgetKit extension to shared `JustDoWidgetView` + `AppGroupWidgetSnapshotStore`.
- [x] Add app-side `widget_snapshot.json` writer path.
- [x] Route widget snapshot source through the Core Data mirror.
- [x] Add Supabase REST read-sync client for categories, tasks, tags, habits, and habit logs.
- [x] Trigger Supabase read-sync from the iOS app lifecycle when session values are available.
- [x] Replace temporary access-token injection with Keychain-backed iOS session storage.
- [x] Implement user-facing iOS Supabase OAuth login and token refresh.
- [x] Implement widget App Intents for task complete/uncomplete and habit check/uncheck.
- [x] Drain widget App Group mutation queue from the app into Core Data.
- [x] Flush queued Core Data writes to Supabase.
- [x] Implement widget deep-link routing for task/habit rows.
- [x] Render native task/habit detail panels from widget deep links.
- [x] Replace the scaffold inline detail panel with NavigationStack push-detail routes.
- [x] Implement signed-in iOS root Home / Stats / Settings tabs based on `reference/proto/`.
- [x] Implement native task/habit add bottom sheet with proto-aligned fields.
- [x] Add Settings entry points for habit/category management.
- [x] Move dark-mode ownership to Settings and remove the home-header theme button.
- [x] Fix launch-time Core Data crash from overlapping sync writes.
- [x] Manual offline sync verification on hosted Supabase (`docs/local_dev.md`).
  - Passed on 2026-05-20: offline task/habit mutations queued, online restore
    flushed to Supabase, and Settings sync status returned to synced.
- [x] Implement edit/delete actions from pushed task/habit detail screens.
- [x] Add app-facing sync status/error UI for failed queue flushes.
- [x] Prepare production domain/AWS deployment work (`docs/deployment_domain_aws_plan.md`).
  - `www.justdo.co.kr` hosted on AWS Amplify, Route 53 delegation complete,
    Supabase production OAuth URLs configured, and production smoke test passed.
- [x] Add iOS widget Task/Habit display mode.
  - Small, medium, and large widgets default to Task mode.
  - Task/Habit toggle state is stored in App Group `UserDefaults`.
  - Progress label uses today's overall task+habit `completed/total`.
  - Completed rows are displayed below incomplete rows.
- [ ] Real-device iOS visual verification against `reference/proto/`.
  - Home calendar/panel simulator pass completed; final spacing/tap ergonomics
    should be verified on an actual iPhone.
  - Add Sheet, Stats, Settings, and latest widget UI are deferred to one
    real-device verification pass.
- [x] Add route tests for widget deep-link opening.
  - `justdo://task/<id>` and `justdo://habit/<id>` now map through shared
    `JustDoDetailRoute`, and `ContentView` uses that route in its
    `NavigationStack`.
- [x] Implement dedicated iOS task-completion patch mutations.
  - App and widget task toggles now enqueue `task_completion_set` instead of a
    full `task_upsert`.
  - Supabase flush patches only `tasks.is_completed` and `tasks.completed_at`;
    reopening a task clears `completed_at`.
  - This prevents stale iOS/widget mirrors from overwriting task-owned fields
    such as title, category, dates, priority, or tags during completion toggles.
- [x] Add UI automation for widget deep-link detail opening.
  - Added `JustDoAppUITests` with task/habit deep-link launch coverage.
  - Tests seed a DEBUG-only local mirror and verify `Task Detail` /
    `Habit Detail` screens render the linked row data.

## Phase 7: Web Desktop Redesign

> 2026-05-10 결정. v1 출시 차단 항목. Platform Strategy (`just_do_prd.md` §1.5)에 따라 web은 데스크탑 productivity hub로 재디자인.

### 7-1. 자산 / 가드레일
- [x] 데스크탑 prototype 추가 — 현재 자산: `reference/web_proto/`,
  `reference/Just Do - Web Prototype.html`.
- [x] `reference/README.md` 업데이트 — `proto/` = 모바일/iOS, `web_proto/` = 데스크탑 web.
- [x] `just_do_prd.md` §1.5 Platform Strategy 섹션 추가.
- [x] `just_do_prd.md` §5 디자인 가이드라인을 공통 / iOS / Web 으로 분리.
- [x] `just_do_planning.md` §9, §10-1, §14 갱신.
- [x] `claude_handoff.md` "App Shape Now" → iOS / Web 분리 갱신.

### 7-2. 디자인 결정 (prototype 도착 후)
- [x] 네비게이션: 좌측 사이드바 + 상단 header.
- [x] 레이아웃: 사이드바 | 메인 workspace | Today side panel.
- [x] Stats 위치: 별도 dashboard page.
- [x] 데스크탑 핵심 가치 우선순위: 큰 calendar workspace, command palette /
  keyboard shortcut, drag 이동, multi-select bulk action.
- [x] 좁은 윈도우 (< 1024px) 폴백 정책 — viewport 기반 안내 페이지 표시.

### 7-3. 구현
- [x] `apps/web/src/features/just-do/` entry shell 재작성 (모바일 `PhoneFrame` /
  bottom tab 제거, 데스크탑 shell 도입).
- [x] 사이드바/상단 nav 컴포넌트.
- [x] 캘린더의 데스크탑 사이즈 재설계 (월간/주간/리스트).
- [x] Add Task/Habit — bottom sheet 대신 데스크탑 modal.
- [x] Task detail modal.
- [x] Stats 데스크탑 dashboard화.
- [x] Settings 데스크탑 레이아웃 (좌측 설정 메뉴 / 선택 섹션 콘텐츠).
- [x] 키보드 단축키 / command palette.
- [x] 드래그앤드롭 — Task 날짜 이동.
- [x] Today panel — Task/Habit 체크 토글, Task 완료 분리 섹션 제거.
- [x] Category management — 추가 / 이름 수정 / 색상 수정 / 삭제.
- [x] Habit management — 추가 / 삭제.
- [x] Task tag chip input — Enter/comma/blur commit, Backspace 삭제.
- [x] Pro upgrade entry surface — 구독 섹션 / 업그레이드 모달 (실결제 연동 전).
- [x] 색상/타이포 토큰은 그대로 재사용 (도메인 토큰은 공유).
- [x] Edit Task modal 태그 수정 / 삭제 지원 보강.
- [x] Category reorder 지원 복원 — Settings 카테고리 관리에서 위/아래 이동.
- [x] Habit edit 지원 보강 — Settings 습관 관리에서 제목 / 이모지 / 반복 /
  요일 / 알림 수정.
- [ ] Pro checkout API / webhook / `user_subscriptions` 갱신 구현.
  - 2026-05-11 결정: 결제 provider = **Toss Payments 빌링** (월 ₩1,900 / 연 ₩9,900).
    iOS 결제는 별도 트랙(Apple IAP, Phase 6 v1 ship 후).
  - 2026-05-19 Trial / entitlement 정책 재정의:
    - Web 앱 사용은 로그인 필수. 비로그인 사용자는 로그인 화면에서 앱 shell로
      진입하지 못한다.
    - 회원가입/로그인 후 생성되는 30일 Trial 동안은 Pro 기능 사용 가능.
    - 결제수단 등록은 앱 전체 진입 조건이 아니며, Trial 이후 Pro 기능을 계속
      쓰기 위한 조건이다.
    - `billing_provider` / `toss_billing_key` 유무는 entitlement 조건이 아니라
      Trial 종료 후 자동결제 준비 상태로 표시한다.
    - B4-c는 더 이상 "회원가입 직후 billing 강제"가 아니라 Pro 기능 접근
      권한과 upgrade gate 구현으로 진행한다.
  - 2026-05-19 Free / Trial / Pro 기능 경계:
    - Free는 Task/Habit 기록·관리, 캘린더, 카테고리, 태그, 기본 동기화,
      데이터 export, 기본 위젯 3종을 제공한다.
    - Trial / Pro는 분석·리포트·고급 기능을 제공한다.
    - v1 현재 Pro gate 대상은 통계 화면 전체.
    - 월간 리포트는 v2 도입 예정이며 구현 시 Pro gate 대상.
    - Task Dependency 시각화는 v2 도입 예정이며 구현 시 Pro gate 대상.
    - 위젯은 제품 핵심 기능이므로 기본 3종은 Free에 제공한다. 추후
      커스터마이징을 도입할 경우 기본 위젯 사용성은 Free로 유지하고,
      고급 커스터마이징 범위는 별도 정책으로 확정한다.
  - 2026-05-14 UX/확장 결정:
    - v1은 Toss Payments 빌링을 유지한다.
    - 사용자-facing CTA는 내부 billing-key 발급 구조를 직접 드러내지 않고
      "Toss로 결제하기" / "Toss 결제" 흐름으로 표현한다.
    - 결제 모달에는 결제수단 버튼 UI를 미리 배치하되, v1에서는 Toss만
      활성화한다. 네이버페이/카카오페이/카드/계좌 등은 브랜드 색을 반영한
      disabled 예정 상태로 노출한다. 별도 하단 결제 CTA 없이 활성 결제수단
      버튼 클릭이 바로 해당 provider 결제창을 여는 구조로 둔다.
    - 네이버페이 자동결제, 카카오페이 자동결제, PortOne 경유 다중 PG는
      v1 이후 결제수단 확장 트랙으로 추가 검토한다.
    - 추후 확장 시 현재 Toss 전용 컬럼을 provider-agnostic subscription /
      payment method 모델로 점진 전환한다.
  - Track A — 사용자 외부 작업 (선결 조건):
    - [ ] 사업자등록 (개인사업자 + 통신판매업 신고).
    - [ ] Toss Payments 가입 + 가맹점 심사 (~2–3주).
    - [ ] 운영 API 키 / Webhook secret 발급.
    - [ ] 운영 도메인 결정 (Webhook URL 등록용, deployment 트랙과 동시).
    - 세부 체크리스트: `docs/toss_merchant_review_plan.md`.
  - Track B — 코드 작업 (Toss 테스트 키로 동작):
    - [x] B1 Schema 마이그레이션 — `user_subscriptions` 보강
      (`toss_billing_key`, `toss_customer_key`, `next_billing_at`, `cancel_at`,
      `last_payment_at`, `payment_failures`) + 신규 `payment_events` 테이블
      (webhook 멱등 처리).
    - [x] B2 서버 엔드포인트 — `POST /api/billing/issue-key`,
      `POST /api/billing/charge`, `POST /api/webhook/toss` (signature 검증 +
      멱등), `POST /api/billing/cancel`. 모두 `service-role` client 사용.
      2026-05-14 현재 테스트 키 기준 REST 래퍼와 endpoint 골격 구현 완료.
      Toss webhook signature 방식은 운영 심사/대시보드 설정 단계에서 공식
      secret/헤더 스펙 확인 후 보강 필요.
    - [x] B3 정기결제 cron 방향 결정 — AWS EventBridge Scheduler -> Lambda ->
      `/api/billing/charge`, 매일 05:30 KST. Lambda wrapper:
      `infra/aws/billing-cron-lambda.mjs`, 운영 설정 문서:
      `docs/aws_eventbridge_billing_cron.md`.
    - [x] B3 운영 리소스 확인 — Lambda `justdo-prod-billing-cron` +
      EventBridge schedule `justdo-prod-billing-charge-daily` 생성 완료,
      수동 테스트 + 첫 자동 실행 두 번(2026-05-20 / 2026-05-21 05:30 KST)
      CloudWatch 확인 완료. Lambda 메트릭 Errors 0 / 성공률 100%,
      `payment_events` 0건 (예상대로). DLQ는 live billing 직전 추가.
    - [x] B4-a UI 연동 — `apps/web/src/features/just-do/app-shell.tsx`의
      `UpgradeModal` placeholder를 Toss JS SDK 호출로 교체.
      2026-05-14 현재 `https://js.tosspayments.com/v2/standard` 기반
      `requestBillingAuth()` UI와 `/billing/success` billing key 발급 완료
      페이지 구현. 결제수단 버튼 UI는 Toss만 활성화하고, 네이버페이 /
      카카오페이 / 카드 / 계좌 등은 disabled 예정 상태로 노출.
    - [x] B4-b SubscriptionPanel 상태 표시 — 서버 `user_subscriptions` 조회,
      다음 결제일 / 결제수단 일부 / 취소 버튼 노출.
      2026-05-14 `/api/billing/subscription` 추가. Settings → 구독 패널에서
      status / 다음 결제일 / 결제수단 / Trial 종료일을 읽고, Toss 구독 해지
      버튼은 `/api/billing/cancel`로 연결.
    - [x] B4-c Pro entitlement / upgrade gate — `trial` / `active`는 Pro 기능
      사용 가능, `past_due` / `paused` / `cancelled` / `expired` / `free`는
      Pro 기능 gate에서 구독/결제 CTA로 유도. 현재 Pro 대상인 Stats dashboard에
      gate 적용. 앱 전체 진입은 막지 않는다.
    - [x] B5 로그인 필수 정책 정리 — 비로그인 사용자는 로그인 화면에서 앱
      shell로 진입하지 못하는 현재 정책을 테스트로 고정하고, Trial + 결제수단
      미등록 상태는 Pro 사용 가능하되 구독 패널에서 Toss 결제 연결 CTA를 표시.
    - [ ] B6 회귀 테스트 — 1차 route 단위 테스트 완료:
      `issue-key`, `charge` 성공/실패 retry-pause, `webhook` fixture/idempotent
      upsert.
      2026-05-21 추가: Toss SDK client mock 기반 upgrade modal billing auth
      흐름과 cancel route edge cases를 테스트로 보강.
      남은 항목: 운영 Toss 테스트 키 E2E, webhook signature는 운영 dashboard
      secret/header 확인 후.
  - 진행 순서: B1 → B2 → B4 → B3. Track A 완료 후 운영 키만 교체.

### 7-4. 모바일 진입 페이지
- [x] User-Agent 또는 viewport 기반 모바일 진입 감지 — CSS viewport (`lg`
  breakpoint) 기반.
- [x] 로그인 전/후 화면 모두 모바일이면 안내 페이지로 폴백.
- [x] 안내 페이지에 실제 iOS 앱 다운로드 링크 연결 — 환경변수
  `NEXT_PUBLIC_IOS_APP_STORE_URL` wiring 완료. 값이 설정되면 "App Store에서
  받기" 버튼이 활성화되고 link로 동작. 값 비어 있으면 "App Store 출시 예정"
  비활성 상태로 표시. URL 확정 시 환경변수만 채우면 됨.
- [x] iOS 모바일 브라우저 진입 시 실제 앱스토어 주소로 자동 이동 — 같은
  환경변수 기반. iOS UA 감지 시 `window.location.replace`. 세션당 1회만
  시도하도록 sessionStorage 가드.
- [x] 안내 페이지에 Android 앱 출시 알림 대기 가입 연결 — 신규 Supabase
  `public.waitlist` 테이블(2026-05-11 마이그레이션) + `POST /api/waitlist`
  service-role 엔드포인트 + 안내 페이지 폼. 멱등 처리(`unique(email, platform)`,
  `ignoreDuplicates`).

### 7-5. 회귀 / 검증
- [x] 기존 web 도메인/sync 테스트 유지 확인.
- [x] 새 데스크탑 UI interaction 테스트 추가 — Task/Habit add modal,
  calendar date click vs hover `+`, Today Task/Habit check toggle, Settings
  selected-section rendering.
- [x] Manual offline sync verification (`docs/local_dev.md`)을 새 UI로 다시 통과.
  - 검증 중 오프라인 transition 의 realtime CHANNEL_ERROR 와 fetch 실패가
    `syncError` 로 잡혀 "확인 필요" / "저장 중 문제 발생" 가 노출되던 UX 버그
    두 건 발견 → fix:
    `apps/web/src/features/just-do/supabase-storage.ts` 에 `onChannelStatus`
    helper 추가 (navigator.onLine === false 면 emit 무시),
    `apps/web/src/features/just-do/store.tsx` 의 `reportSyncError` 도 동일
    가드. 오프라인은 큐가 source of truth이고 reconnect 시 자동 flush 되므로
    silent.
  - 5 stage 모두 통과: baseline → 온라인 smoke → 오프라인 mutation 적재 →
    online 복귀 자동 flush → 시크릿 창 cross-device mirror.
- [x] 데스크탑/노트북 해상도 (1024 / 1280 / 1440 / 1920)에서 시각 검증.
  - 1024px 헤더 squeeze 발견 → fix: 헤더 텍스트 `whitespace-nowrap` + 좌우
    묶음 `shrink-0` + 검색 input 을 `xl` (1280+) 에서만 노출 +
    `gap-3 xl:gap-4`. 검색 진입점은 사이드바 "빠른 검색" / `IconCommand`
    (Cmd+K) 로 다중 보장.
  - 1280 / 1440 / 1920 통과. 모바일 안내 페이지(`< lg`) iOS 비활성 라벨 +
    Android 폼 에러 메시지 동작 확인.

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

## Android Roadmap (v3)

> Platform Strategy (`just_do_prd.md` §1.5): v3까지 Android 사용자는 데스크탑 web 사용. v3에 네이티브 Android 앱 출시.

- [ ] 기술 선택 (React Native / Flutter / Compose Multiplatform / 네이티브 Kotlin) — v2 종료 시점에 결정.
- [ ] 도메인 모델 공유 방식 결정 (Supabase 클라이언트 직접 사용 vs 공유 SDK 작성).
- [ ] iOS 앱과의 기능 동등성 범위 (위젯, 알림, App Group 대응 등).
- [ ] 모바일 web 안내 페이지에 Android 출시 시점 업데이트.

## Deployment Backlog

- [x] Purchase production domain in Gabia — `justdo.co.kr` (2026-05-14).
- [x] Decide DNS mode — **Route 53 위임** (2026-05-14).
- [x] AWS 계정 셋업 — root MFA, IAM admin user (`justdo-admin`), 결제수단, Budget 알림 (`justdo-monthly` $20, 50/80/100% 실제 + 100% 예측), 리전 `ap-northeast-2` (2026-05-14).
- [x] Create Route 53 hosted zone for `justdo.co.kr` + 가비아 네임서버 교체 (2026-05-14).
- [x] Connect `apps/web` to AWS Amplify Hosting (app id `dcsdzu0ew3l2m`, 2026-05-16).
- [x] Add production Supabase env vars in Amplify (2026-05-16).
- [x] Connect custom domain and verify AWS-managed TLS certificate — `www.justdo.co.kr` canonical, apex redirect (2026-05-17).
- [x] Add production OAuth callback URLs in Supabase — Site URL `https://www.justdo.co.kr`, Redirect URLs allowlist 6개 (2026-05-16).
- [x] Run production smoke test after deployment — 운영 도메인 LIVE, Google 로그인 / Task / Habit / Settings 구독 패널 정상 동작 (2026-05-17).
- [ ] Toss webhook URL 등록 (`https://www.justdo.co.kr/api/webhook/toss`) — Toss 운영 심사 후.
- [ ] Supabase Redirect URLs에서 `https://main.dcsdzu0ew3l2m.amplifyapp.com/callback` 제거 (smoke test용, 더 이상 불필요).

### Deployment 트랙에서 발견한 SSR 함정 (참고)

1. Amplify Hosting의 자동 framework detection이 monorepo + appRoot 조합에서 실패 → CLI로
   `aws amplify update-app --platform WEB_COMPUTE` + `aws amplify update-branch --framework "Next.js - SSR"` 명시 + `AMPLIFY_MONOREPO_APP_ROOT=apps/web` 환경변수 등록 필요.
2. SSR Lambda의 `request.url` 호스트가 `localhost`로 들어옴 → `x-forwarded-host`/`x-forwarded-proto` 헤더 우선 사용 (`app/(auth)/callback/route.ts`).
3. Amplify Hosting Compute가 환경변수를 빌드 shell에는 노출하지만 SSR Lambda runtime에는 자동 전달 안 함 → `amplify.yml`의 build 단계에서 `.env.production` 생성으로 Next.js가 server bundle에 inline.

## Open Decisions

- [x] Subscription pricing — 월 ₩1,900 / 연 ₩9,900 (연 환산 월 ₩825). Apple Tier 2 (월 ₩1,900) + custom annual. Todomate (월 ₩1,500 / 연 ₩7,500) 대비 살짝 상위 포지션.
- [x] Web/iOS type sharing — v1 은 각 플랫폼이 로컬에서 mirror. Web 은 `supabase gen types typescript` 자동 생성, iOS 는 Swift Codable struct 를 손으로 작성 + drift 감지 unit test. 추후 트리거 (migration 10회 이상 또는 drift 버그 2회 이상) 발생 시 `database.types.ts` 파싱 기반 Swift codegen 자동화 도입.
- [x] Task Dependency 시각화 — v1 미포함, v2 에 모델+시각화 함께 도입 (PRD/planning 결정 유지). `task_dependencies` 테이블은 schema 에 이미 존재하지만 v1 동안 idle. v2 시작 전 컬럼 확장 (예: `kind: 'blocks' | 'related'`) 필요 여부 재검토.
- [x] User-customizable categories — v1 에 풀 CRUD 도입 (Pro 게이팅 없음). `me`/`ext` enum 폐기, `Task.categoryId: string | null` 로 전환. Settings 에 카테고리 관리 화면 (rename/색상/reorder/삭제). 색상은 v1 부터 custom hex picker (preset 팔레트 + hex 입력 동시 제공). 카테고리 개수 무제한, 검색 없음, 사용자 reorder 만. Habit 은 별개 — `Habit.category = "habit"` 유지. 별도 Phase 5.5 로 분리하여 Phase 6 iOS 시작 전 완료.
- [x] `settings` / `view` 원격 영속화 — `public.users.preferences jsonb` 컬럼 도입 (Phase 5.6). v1 동기화 필드는 `week_start` 하나만. 그 외 (`notify`, `notifyTime`, `dark`, `view.*`) 는 영구 device-local. `plan` 은 기존 `user_subscriptions` 그대로 사용.
- [x] `Habit.recur_type` 도메인 모델 정식화 — v1 에 daily + weekly 구현 (Phase 5.7). monthly 와 `recur_end_date` 는 v2. 도메인에 `Habit.recurType: 'daily' | 'weekly'`, `Habit.recurDays?: number[]` (0=일~6=토) 추가.
