# Backend Strategy — Supabase First, Self-Hosted Later

> 이 문서는 v1을 Supabase 위에서 빠르게 출시하되, 추후 자체 백엔드로 옮길 수 있는 형태로 코드를 유지하기 위한 운영 원칙을 정의한다. Phase 4 이후의 모든 백엔드/데이터 작업은 이 문서를 따른다.

## 1. 결정 사항

- **v1 백엔드는 Supabase를 사용한다.** Auth, Postgres, RLS, Realtime, Edge Functions, cron 트리거 등을 활용해 출시 시간을 우선한다.
- **추후 자체 백엔드로 이전할 가능성을 열어둔다.** 옮길 시점은 사용자/트래픽/비용/제어권 필요성 기준으로 v1 출시 후 6~12개월 안에 재평가한다.
- **이전을 어렵게 만드는 결정은 의식적으로 회피한다.** 결정이 트레이드오프라면 "옮기기 쉬운 쪽"을 우선한다.

## 2. 이전 시 비싼 부분과 완화 원칙

| 비싼 영역 | 이유 | 완화 원칙 |
|---|---|---|
| Auth 사용자 ID | 모든 user-owned 테이블의 FK가 `auth.users.id`에 묶인다 | 앱 코드는 `public.users.id` (UUID)에만 의존한다. `auth.users`와는 1:1 매핑만 두고, 비즈니스 데이터는 `public.users.id`를 FK로 사용한다 |
| RLS | 직접 백엔드로 가면 모든 권한 검사를 앱 레벨에서 다시 짜야 한다 | 클라이언트에서 DB에 직접 쿼리하지 않는다. 모든 데이터 접근은 단일 어댑터 레이어를 통한다. RLS는 **방어선**이지 **유일한 방어선이 아니다** |
| Realtime SDK 결합 | 컴포넌트가 Supabase Realtime SDK를 직접 호출하면 옮길 때 UI를 다시 짜야 한다 | 어댑터가 `subscribe(entity, callback)` 같은 도메인 인터페이스를 노출하고, Supabase Realtime은 그 구현 디테일이다 |
| Edge Functions에 비즈니스 로직 | Deno 런타임 + Supabase 클라이언트 결합 | Edge Function은 **얇은 wrapper**만 둔다. 실제 비즈니스 로직은 일반 TS 모듈로 두고 Edge Function/서버/CLI 어디서나 호출 가능해야 한다 |
| Storage (이미지/파일) | Supabase Storage는 표준 S3와 호환되지 않는 부분이 있다 | v1에서 미디어 업로드 기능을 만들지 않는다. 필요해지면 그 시점에 호환 가능한 레이어를 설계한다 |
| Supabase 전용 SQL 함수 | `auth.uid()`, `pg_net`, `pg_cron`, Supabase 확장 등 | 표준 Postgres SQL만 앱 쿼리에 사용한다. `auth.uid()`는 RLS 정책 안에서만 허용한다 |

## 3. 허용 / 금지 패턴

### 허용 (Encouraged)

- ✅ 표준 Postgres 스키마/SQL — `CREATE TABLE`, `CHECK`, `FOREIGN KEY`, 인덱스, 트리거 함수 (`plpgsql`)
- ✅ RLS 정책에서 `auth.uid()` 사용 — 단, 정책 안에서만
- ✅ Supabase JS 클라이언트는 **데이터 어댑터 모듈 안에서만** import
- ✅ 마이그레이션은 `supabase/migrations/*.sql` raw SQL로 관리 (어디서나 재실행 가능)
- ✅ 공유 타입은 `supabase gen types typescript`로 생성된 타입을 사용 — 단, 어댑터가 그 타입을 도메인 타입으로 매핑
- ✅ Realtime은 v1에서 꼭 필요한 테이블만 (tasks, habits, habit_logs)
- ✅ Edge Functions는 cron 트리거와 푸시 알림 fanout 같은 인프라 작업에만 사용

### 금지 (Avoid)

- ❌ 컴포넌트/스크린에서 `supabase.from(...)` 직접 호출
- ❌ Supabase Realtime SDK를 컴포넌트에서 직접 구독
- ❌ `auth.users.id`를 비즈니스 테이블의 FK로 사용 (대신 `public.users.id` 경유)
- ❌ ORM이 자동 생성하는 마이그레이션을 적용 (수동 SQL이 진실)
- ❌ Edge Functions 안에 비즈니스 로직 작성 (Wrapper 만 두고 별도 모듈에 로직)
- ❌ Supabase Storage / pg_net / pgsodium 등 이전이 어려운 확장 적극 사용
- ❌ Supabase 전용 RPC 함수에 핵심 비즈니스 규칙 위임 (필요 시 일반 SQL view + 앱 코드로)

## 4. 데이터 어댑터 인터페이스 원칙

`apps/web/src/features/just-do/persistence.ts`의 `JustDoStorage`는 이미 추상화의 첫 단계다. Phase 4에서는:

1. **로컬 어댑터** (현재 `createLocalStorageStorage`) — 오프라인 캐시 / 게스트 모드
2. **Supabase 어댑터** (신규) — 인증된 사용자의 원격 저장소
3. **(추후) 자체 백엔드 어댑터** — 같은 인터페이스를 구현하는 새로운 어댑터

세 어댑터 모두 동일한 `JustDoStorage` 또는 그 확장 인터페이스를 구현한다. 컴포넌트는 어떤 어댑터인지 모른다.

Realtime 구독도 어댑터 인터페이스에 포함:

```ts
interface JustDoStorage {
  load(): Promise<Persisted | null>;
  save(value: Persisted): Promise<void>;
  // 신규 — Phase 4
  subscribe?(callback: (event: RemoteChange) => void): () => void;
}
```

`RemoteChange`는 Supabase Realtime payload의 직접 노출이 아니라 우리가 정의하는 도메인 이벤트 타입이다.

## 5. 인증 추상화

- 클라이언트의 모든 인증 상태는 `useAuth()` 훅 한 곳에서만 노출한다.
- Supabase Auth 구현은 그 훅 안에 숨긴다.
- Apple/Google OAuth는 Supabase Auth가 처리하지만, 토큰/세션 형태는 우리 도메인 타입으로 변환한 후 노출한다.

## 6. 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 클라이언트에 노출
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 환경(Next API Route, Edge Function)에서만 사용, 클라이언트 번들에 절대 포함되지 않도록 import 경로를 분리

## 7. 이전 시점 판단 기준

다음 중 하나라도 해당되면 자체 백엔드 이전 검토를 시작:

- Supabase 월 비용이 $100~200 이상으로 안정화됨
- DB 사이즈가 Pro 플랜 한도 (8 GB)에 근접
- Realtime 동시 연결이 Pro 플랜 한도 (500개)에 근접
- Edge Function 실행 시간/메모리 제한이 비즈니스 로직 발목을 잡기 시작
- 세밀한 인덱스/쿼리 플랜 통제가 필요해짐

이전 결정 시 이 문서를 갱신하고 마이그레이션 플랜을 별도 문서에 작성한다.

## 8. 참고

- `docs/just_do_prd.md` — 제품 명세
- `docs/just_do_db_schema.md` — DB 스키마 (Phase 4에서 마이그레이션으로 변환)
- `docs/just_do_planning.md` — 전체 기획
