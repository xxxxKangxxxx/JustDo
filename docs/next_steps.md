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
- [ ] `lib/auth/useAuth.tsx` — Supabase Auth를 감싸는 훅. `{ user, status, signIn, signOut }` 도메인 타입만 노출. Supabase 세션/JWT 형태는 훅 안에서만 보임.
- [ ] `app/(auth)/callback/route.ts` — OAuth 콜백 처리.
- [ ] Apple / Google provider 활성화 (`supabase/config.toml` `[auth.external.*]` + `.env.local`에 client id/secret).
- [ ] `JustDoProvider`가 `useAuth().user`를 받아 로그인 상태에서는 `createSupabaseStorage(client, user.id)`, 비로그인 상태에서는 `createLocalStorageStorage(...)`를 사용하도록 storage 선택 로직 추가.
- [ ] `public.users` upsert / `user_subscriptions` Trial 레코드 생성은 `handle_new_auth_user()` 트리거가 처리 — 로그인 흐름에서 별도 확인만.
- [ ] `Task.tags` round-trip 활성화 — `task_tags` upsert/delete + `tags` 테이블 lookup-or-create. (Phase 4-2에서 미뤄둔 항목)
- [ ] `useAuth` 단위 테스트 (mocked Supabase Auth client).

### 4-4. Realtime
- [ ] `JustDoStorage.subscribe(callback)` 인터페이스 확장.
- [ ] tasks / habits / habit_logs 테이블 구독.
- [ ] Realtime 페이로드를 도메인 이벤트 타입으로 매핑.

### 4-5. 환경변수 / 보안
- [x] `.env.local.example` 작성, `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` 분리 명시.
- [ ] service_role 키가 클라이언트 번들에 들어가지 않도록 import 경로 검증 (server-only 모듈 도입 시 점검 — 4-3에서 server action 추가될 때 같이).

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

- [ ] Subscription pricing (월/연 금액).
- [ ] Whether web and iOS share generated types from the Supabase schema, or each platform regenerates locally.
- [ ] Whether Task Dependency visualization ships in v1 or remains v2.
- [ ] User-customizable category names (현재는 회원가입 트리거가 한국어 `나` / `외부` 시드 + 도메인 enum `me` / `ext` 매핑 — 사용자 rename UI 제공할지).
- [ ] `settings` / `view` 의 원격 영속화 위치 (현재 Supabase 어댑터에서 no-op). `public.user_settings` 테이블을 추가할지 vs 기기-로컬만 유지할지.
- [ ] `Habit.recur_type` 도메인 모델 정식화 (현재 어댑터는 `'daily'` 고정 insert).
