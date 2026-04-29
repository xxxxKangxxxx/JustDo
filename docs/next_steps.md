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
- [ ] `docs/just_do_db_schema.md` 검토 — `auth.users` 직접 FK 제거, `public.users` 경유 구조 확인.
- [ ] `supabase/` 워크스페이스 셋업 (`supabase init`).
- [ ] raw SQL 마이그레이션 작성 (`supabase/migrations/0001_init.sql` 등).
- [ ] 모든 user-owned 테이블 RLS 정책 작성.
- [ ] `supabase start` 로컬 검증.

### 4-2. 클라이언트 / 어댑터
- [ ] `apps/web`에 `@supabase/supabase-js` 설치.
- [ ] `lib/supabase/` 클라이언트 (브라우저/서버 분리).
- [ ] `supabase gen types typescript` 로 생성 타입 → 도메인 타입 매핑 레이어.
- [ ] `JustDoStorage`를 구현하는 Supabase 어댑터.
- [ ] 어댑터 단위 테스트 (Memory storage 패턴 확장).

### 4-3. 인증
- [ ] `useAuth()` 훅 추상화 — Supabase Auth는 구현 디테일.
- [ ] Apple / Google OAuth 콜백 라우트.
- [ ] 로그인 시 `public.users` upsert + `user_subscriptions` Trial 레코드 생성.

### 4-4. Realtime
- [ ] `JustDoStorage.subscribe(callback)` 인터페이스 확장.
- [ ] tasks / habits / habit_logs 테이블 구독.
- [ ] Realtime 페이로드를 도메인 이벤트 타입으로 매핑.

### 4-5. 환경변수 / 보안
- [ ] `.env.local.example` 작성, `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` 분리 명시.
- [ ] service_role 키가 클라이언트 번들에 들어가지 않도록 import 경로 검증.

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

- [ ] Subscription pricing.
- [ ] Whether web and iOS share generated types from the Supabase schema.
- [ ] Whether Task Dependency visualization ships in v1 or remains v2.
- [ ] Final naming for categories beyond the default `[나]`, `[외부]`, and `Habit`.
