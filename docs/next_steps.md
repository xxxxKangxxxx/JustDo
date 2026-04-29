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
- [ ] Date/time input polish: MVP는 브라우저/모바일 기본 `input type="date"` / `input type="time"` 유지. 추후 일관된 브랜드 경험이나 날짜 범위 선택 UX가 필요해지면 custom bottom-sheet picker 설계.

## Sync / Widget Backlog

- [x] Widget sync strategy documented in `docs/widget_sync_strategy.md`.
- [x] Define shared mutation event names that both web and iOS can implement.
- [x] Design iOS mutation queue schema for widget/offline writes.

## Open Decisions

- [ ] Subscription pricing (월/연 금액).
- [ ] Whether web and iOS share generated types from the Supabase schema, or each platform regenerates locally.
- [ ] Whether Task Dependency visualization ships in v1 or remains v2.
- [ ] User-customizable category names (현재는 회원가입 트리거가 한국어 `나` / `외부` 시드 + 도메인 enum `me` / `ext` 매핑 — 사용자 rename UI 제공할지).
- [ ] `settings` / `view` 의 원격 영속화 위치 (현재 Supabase 어댑터에서 no-op). `public.user_settings` 테이블을 추가할지 vs 기기-로컬만 유지할지.
- [ ] `Habit.recur_type` 도메인 모델 정식화 (현재 어댑터는 `'daily'` 고정 insert).
