# Handoff (Claude Code → Codex)

Date: 2026-04-29
Direction: 다음 작업을 Codex가 이어받는다. 이 문서는 그 인계 노트.

## Repository State

- Branch: `main`
- Remote: `origin` → `https://github.com/xxxxKangxxxx/JustDo.git`
- Working tree: 마지막 커밋 후 깨끗 (이 핸드오프 갱신분 제외).
- Recent local commits (push 안 된 상태):
  - `feat(db): initial Supabase schema with RLS and signup fanout trigger`
  - `docs: add backend strategy and split Phase 4 into adapter-aligned steps`
  - `feat(web): add Vitest infra, weekStart-aware calendar, storage adapter`

## Phase Progress

- Phase 1 Repository Baseline — **완료** (Codex)
- Phase 2 Web App Bootstrap — **완료** (Codex)
- Phase 3 Local Data Layer — **완료** (Claude Code, 2026-04-28)
- Phase 4-1 Schema / Migrations — **완료** (Claude Code, 2026-04-29)
- Phase 4-2 Client / Adapter — **완료** (Claude Code, 2026-04-29)
- Phase 4-3 Auth — **다음 작업 ← Codex 시작점**
- Phase 4-4 Realtime — pending
- Phase 4-5 Env / Security — env example는 done, service-role import 검증은 4-3과 함께
- Phase 5 Offline Sync — pending
- Phase 6 iOS Planning — pending

## What Claude Code Just Completed

### Phase 3 (이미 핸드오프됨, 참고용)

- Vitest + Testing Library 셋업 (`apps/web` 루트의 `npm test` / 워크스페이스 `npm run test:web`).
- `lib/date.ts` 에 `monthCalendar(year, month, weekStart)` / `weekdayLabels(weekStart)` 헬퍼 추가.
- `home-screen.tsx` 가 `settings.weekStart` 를 캘린더 grid 와 weekday 헤더에 반영.
- `JustDoStorage` 인터페이스 도입 + `localStorage` / `memory` 어댑터.
- Store 가 비동기 hydrate 를 통해 어댑터에서 상태를 끌어옴 (SSR-safe).

### Phase 4-1 — 스키마 / 마이그레이션

- Supabase CLI 설치 (`brew install supabase/tap/supabase`, v2.95.4).
- `supabase init` → `supabase/config.toml` + `.gitignore`.
- `supabase/migrations/20260429014750_init_schema.sql`:
  - 12개 테이블 (users, categories, tags, tasks, subtasks, task_dependencies, task_tags, habits, habit_logs, habit_tags, plans, user_subscriptions).
  - 모든 비즈니스 FK 는 `public.users(id)` 만 참조 — `auth.users` 는 `public.users` 와 `handle_new_auth_user()` 트리거 한 곳에만.
  - `set_updated_at()` 트리거 함수, mutable 테이블에 모두 부착.
  - `tasks` start/end_date 무결성 CHECK.
  - `handle_new_auth_user()`: 회원가입 시 `public.users` + 기본 카테고리 (`나` / `외부`) + Trial `user_subscriptions` 자동 생성.
  - 12개 테이블 RLS 활성화 + 37개 정책. junction 테이블은 부모 ownership 으로 검증.
- `supabase/migrations/20260429021447_add_habit_emoji.sql`: `habits.emoji TEXT NOT NULL DEFAULT '🌱'` 보강.
- 로컬 검증 (`supabase start`): 마이그레이션 자동 적용, 트리거 fanout 정상, RLS 격리 (다른 사용자 0건 / 소유자 1건), CASCADE 정상.

### Phase 4-2 — 클라이언트 / 어댑터

- `@supabase/supabase-js` 의존성 추가.
- `apps/web/src/lib/supabase/client.ts`: 브라우저 싱글턴 + env 검증.
- `apps/web/src/lib/supabase/database.types.ts`: `supabase gen types typescript --local` 산출물.
- `apps/web/.env.local.example` 템플릿. `.env.local` 은 로컬 키로 채워둠 (gitignored).
- `JustDoStorage` 인터페이스를 per-entity 로 확장:
  ```
  load() / saveSettings / saveView /
  upsertTask / deleteTask /
  upsertHabit / setHabitLog
  ```
- `createMemoryStorage` / `createLocalStorageStorage` 둘 다 새 인터페이스로 재구현. 공유 헬퍼 `applyMutation`, `upsertById`.
- `store.tsx` 디바운스 전체 save → 각 mutation 에서 fire-and-forget per-entity 호출. `hydratedRef` 가드로 hydrate 전 mutation 스킵.
- `features/just-do/supabase-mapping.ts`: 도메인 ↔ DB row 매핑 (`taskRowToDomain`, `taskDomainToInsert`, `habitRowToDomain`, `habitDomainToInsert`, `mergeHabitLogs`, `taskCategoryToName`).
- `features/just-do/supabase-storage.ts`: `createSupabaseStorage(client, userId)`. categories name→id 캐시 lazy. `saveSettings` / `saveView` 는 v1 스키마에 자리가 없어 no-op (Phase 4-3 또는 별도 `user_settings` 테이블 도입 시 보강).

## Important Files (Codex 가 다음 작업에 자주 열어볼 곳)

```
docs/backend_strategy.md            ← 최우선 숙지: 허용/금지 패턴, 이전 가능성 원칙
docs/next_steps.md                  ← 작업 단위 체크리스트, Open Decisions
docs/worklog.md                     ← 시간순 작업 기록 (Codex 도 여기 추가)
docs/just_do_prd.md                 ← 제품 명세
docs/just_do_db_schema.md           ← 스키마 v0.1 초안 (마이그레이션이 source of truth)

supabase/config.toml                ← 로컬 CLI 설정
supabase/migrations/20260429014750_init_schema.sql
supabase/migrations/20260429021447_add_habit_emoji.sql

apps/web/src/lib/supabase/client.ts          ← 브라우저 싱글턴
apps/web/src/lib/supabase/database.types.ts  ← generated, 마이그레이션 변경 후 재생성
apps/web/src/features/just-do/persistence.ts          ← JustDoStorage 인터페이스
apps/web/src/features/just-do/supabase-mapping.ts     ← 도메인 ↔ DB
apps/web/src/features/just-do/supabase-storage.ts     ← Supabase 어댑터
apps/web/src/features/just-do/store.tsx               ← React 상태 + 어댑터 연결
apps/web/.env.local.example
apps/web/.env.local                 ← gitignored, 로컬 키 보관
```

## Verification Status

- `npm --prefix apps/web run lint` → pass.
- `npm --prefix apps/web run build` → pass (TypeScript 포함).
- `npm --prefix apps/web test` → 52 / 52 pass (Vitest).
- `supabase start` 로컬 인스턴스: 살아 있음 (Codex 가 작업 시작 시 상태 확인 권장).

```bash
supabase status                # 로컬 인스턴스 상태
supabase status -o env         # 키 / URL 환경변수 형태로
```

## 다음 작업 — Phase 4-3 Auth (Codex 가 시작할 지점)

`docs/next_steps.md` 4-3 섹션이 작업 단위. 권장 순서:

1. **`useAuth()` 훅 추상화**
   - `apps/web/src/lib/auth/useAuth.tsx` 신설.
   - 노출 도메인 타입: `{ user: { id, email, displayName?, avatarUrl? } | null, status: 'loading' | 'signedIn' | 'signedOut', signInWithProvider(provider: 'apple' | 'google'): Promise<void>, signOut(): Promise<void> }`.
   - Supabase 의 `client.auth.onAuthStateChange` 와 `getSession` 은 훅 안에만 등장. Supabase 세션 객체 자체를 외부로 흘리지 않는다.

2. **OAuth 콜백 라우트**
   - `apps/web/src/app/(auth)/callback/route.ts` (Next.js Route Handler).
   - Supabase 의 `exchangeCodeForSession` 호출 → 홈으로 redirect.

3. **Provider 활성화**
   - `supabase/config.toml` 의 `[auth.external.apple]` / `[auth.external.google]` enabled true + client id / secret env 참조.
   - `.env.local.example` 에 새 키 추가, 사용자에게 실제 값을 받아 `.env.local` 채우기 요청.

4. **Storage 선택 로직**
   - `JustDoProvider` 가 `useAuth().user` 를 본다.
   - `user` 가 있으면 `createSupabaseStorage(client, user.id)`, 없으면 `createLocalStorageStorage(...)`.
   - 둘 사이 전환 시 hydrate 다시 한 번. 게스트 모드 데이터는 일단 손실 허용 (마이그레이션 정책은 별도 결정).

5. **`Task.tags` round-trip 활성화**
   - 현재 `taskRowToDomain` 이 `tags: []` 로 비어두고 있음.
   - `tasks` 쿼리에 `task_tags(tag_id, tags(name))` 조인 추가, domain `Task.tags` 를 채워서 반환.
   - `upsertTask` 시 tag string 들을 `tags` 테이블에 lookup-or-create 후 `task_tags` upsert. 기존 매핑 중 빠진 것은 delete.

6. **회원가입 fanout 검증**
   - `handle_new_auth_user()` 가 `public.users` + 기본 categories + `user_subscriptions(trial)` 을 만든다는 점 명심.
   - 클라이언트에서 추가로 upsert 할 필요 없음. 로그인 후 첫 fetch 가 categories 를 받아오는지만 확인.

7. **테스트**
   - `useAuth` 단위 테스트는 mocked `client.auth` 로.
   - Supabase 어댑터 e2e 테스트는 별도 옵션 — 로컬 supabase 와 service role key 로 시드 후 `auth.users` 에 row 삽입해 트리거 동작 확인.

## Backend Strategy 핵심 규칙 (다시)

`docs/backend_strategy.md` 참고. 작업 중 자주 위반될 수 있는 지점:

- ❌ 컴포넌트에서 `supabase.from(...)` 직접 호출 금지 — 항상 `JustDoStorage` 또는 (인증의 경우) `useAuth` 경유.
- ❌ `auth.users.id` 를 비즈니스 테이블 FK 로 직접 참조 금지 — `public.users.id` 만.
- ❌ ORM 자동 마이그레이션 금지. 모든 DB 변경은 raw SQL 마이그레이션.
- ✅ Supabase Realtime SDK 도 어댑터 인터페이스 안으로 (Phase 4-4).
- ✅ Edge Functions 는 얇은 wrapper 만, 비즈니스 로직은 일반 TS 모듈.

## Known Notes

- `npm audit`: PostCSS nested deps 에 moderate 2건. `npm audit fix --force` 가 깨는 다운그레이드라 미적용 (이전 핸드오프부터 동일).
- Supabase 로컬 인스턴스는 Docker 위에서 동작. Codex 가 작업하기 전 Docker daemon 켜기.
- `.env.local` 은 로컬 키로 채워져 있고 gitignored. 다른 머신에서 이어 작업하면 `supabase status -o env` 로 다시 채움.

## 마지막 검증 명령

Codex 가 작업 시작 전 sanity check 으로 실행하면 좋은 명령:

```bash
git status                                  # working tree clean 확인
supabase status                             # 로컬 인스턴스 살아 있는지
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm --prefix apps/web test
```
