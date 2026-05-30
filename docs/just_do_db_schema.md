# Just Do — DB 스키마 설계 v0.1
> Supabase (PostgreSQL) 기준

> **Source of truth:** `supabase/migrations/*.sql` — 실제 DB는 마이그레이션이 결정한다. 이 문서는 v0.1 설계 초안이며, 마이그레이션과 어긋나면 마이그레이션이 옳다.
>
> Phase 4-1에서 이 초안 대비 다음 항목이 보강되었다 (`supabase/migrations/20260429014750_init_schema.sql` 참고):
> - `set_updated_at()` 트리거 함수 → `users` / `tasks` / `subtasks` / `habits` / `habit_logs` / `user_subscriptions` 에 부착.
> - `tasks` 에 start/end_date 무결성 CHECK 추가.
> - `handle_new_auth_user()` 트리거: 회원가입 시 `public.users` + 기본 카테고리 (`나` / `외부`) + Trial subscription 자동 생성.
> - 누락됐던 RLS 정책 보강: `subtasks` / `task_dependencies` / `task_tags` / `habit_tags` / `user_subscriptions` / `plans`. 총 12개 테이블, 37개 정책.
> - `public.users.id` 가 모든 비즈니스 FK 의 종착점 — `auth.users` 직접 참조는 `public.users` 와 signup 트리거 한 곳에만 (이전 가능성 보존, `backend_strategy.md` 참고).
>
> Phase 4-2에서 `supabase/migrations/20260429021447_add_habit_emoji.sql` 으로 `habits.emoji TEXT NOT NULL DEFAULT '🌱'` 컬럼이 추가되었다.

---

## 1. 테이블 구조 개요

```
users
├── tasks
│   ├── subtasks
│   ├── task_dependencies
│   └── task_tags ──── tags
└── habits
    ├── habit_logs
    └── habit_tags ─── tags
```

---

## 2. 테이블 상세 설계

---

### users
> Supabase Auth가 기본 제공하는 auth.users 테이블을 확장

```sql
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  preferences   JSONB NOT NULL DEFAULT '{}'::jsonb, -- cross-device user prefs, v1: week_start
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

### categories
> 사용자 관리 Task 카테고리. 신규 가입 시 [나] / [외부] 2개가 기본 생성되며 이후 rename/color/reorder/delete 가능

```sql
CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,          -- 사용자 표시명
  color      TEXT NOT NULL,          -- hex 색상코드 (예: '#4A90E2')
  position   INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### tags
> 사용자가 자유롭게 생성하는 태그

```sql
CREATE TABLE public.tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,          -- '취업', '건강' 등
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);
```

---

### tasks
> 할일 + 일정 통합 항목. 반복 설정 포함.

```sql
CREATE TABLE public.tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- 기본 정보
  title            TEXT NOT NULL,
  memo             TEXT,
  priority         TEXT CHECK (priority IN ('high', 'medium', 'low')),

  -- 날짜 / 시간
  start_date       DATE,
  end_date         DATE,
  scheduled_time   TIME,             -- 특정 시간 고정 여부

  -- 완료 상태
  is_completed     BOOLEAN DEFAULT FALSE,
  completed_at     TIMESTAMPTZ,

  -- 반복 설정
  is_recurring     BOOLEAN DEFAULT FALSE,
  recur_type       TEXT CHECK (recur_type IN ('daily', 'weekly', 'monthly')),
  recur_days       INT[],            -- 요일 배열 (0=일, 1=월 ... 6=토)
  recur_end_date   DATE,             -- 반복 종료일 (없으면 무기한)

  -- 알림
  reminder_at      TIMESTAMPTZ,

  -- 오프라인 동기화
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

### subtasks
> Task 안의 서브태스크

```sql
CREATE TABLE public.subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order   INT DEFAULT 0,        -- 정렬 순서
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### task_dependencies
> Task 간 선후 관계 연결 (A → B: A가 완료되어야 B 시작)

```sql
CREATE TABLE public.task_dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prev_task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  next_task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prev_task_id, next_task_id),
  CHECK (prev_task_id != next_task_id)  -- 자기 자신 참조 방지
);
```

---

### task_tags
> Task ↔ Tag 다대다 연결

```sql
CREATE TABLE public.task_tags (
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

---

### habits
> 반복 습관 항목

```sql
CREATE TABLE public.habits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- 기본 정보
  title        TEXT NOT NULL,
  goal         TEXT,                 -- 목표 (예: '30분')

  -- 반복 설정
  recur_type   TEXT NOT NULL CHECK (recur_type IN ('daily', 'weekly', 'monthly')),
  recur_days   INT[],                -- 요일 배열 (weekly일 때)

  -- 알림
  reminder_at  TIME,                 -- 매일 알림 시간

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### habit_logs
> Habit 일별 완료 기록 (스트릭, 달성률 계산 기반)

```sql
CREATE TABLE public.habit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id     UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, log_date)
);
```

---

### habit_tags
> Habit ↔ Tag 다대다 연결

```sql
CREATE TABLE public.habit_tags (
  habit_id   UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);
```

---

## 3. RLS (Row Level Security) 정책

> 모든 테이블에 RLS 적용 필수 — 본인 데이터만 접근 가능

```sql
-- tasks 예시 (나머지 테이블도 동일한 패턴 적용)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 4. 오프라인 동기화 전략

> Last Write Wins — updated_at 타임스탬프 기준 최신 데이터 우선

- 모든 테이블에 `updated_at` 컬럼 포함
- 온라인 복귀 시 클라이언트 `updated_at` vs 서버 `updated_at` 비교
- 클라이언트가 더 최신이면 서버에 업데이트, 아니면 서버 데이터로 덮어쓰기
- Supabase Realtime으로 온라인 상태에서는 실시간 반영

---

## 5. 인덱스 설계

```sql
-- 자주 쓰이는 쿼리 기준 인덱스
CREATE INDEX idx_tasks_user_id       ON public.tasks(user_id);
CREATE INDEX idx_tasks_start_date    ON public.tasks(start_date);
CREATE INDEX idx_tasks_end_date      ON public.tasks(end_date);
CREATE INDEX idx_habits_user_id      ON public.habits(user_id);
CREATE INDEX idx_habit_logs_date     ON public.habit_logs(log_date);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
```

---

## 6. 구독 플랜 테이블

### plans
> 플랜 종류 정의 (Free / Pro)

```sql
CREATE TABLE public.plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,          -- 'free', 'pro'
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 데이터 삽입
INSERT INTO public.plans (name, description) VALUES
  ('free', '기본 무료 플랜'),
  ('pro',  '전체 기능 이용 가능');
```

---

### user_subscriptions
> 사용자별 구독 상태 관리

```sql
CREATE TABLE public.user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_name       TEXT NOT NULL DEFAULT 'free',  -- 'free', 'pro'
  status          TEXT NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial', 'active', 'past_due', 'paused', 'expired', 'cancelled')),

  -- Trial 기간
  trial_start_at  TIMESTAMPTZ DEFAULT NOW(),
  trial_end_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- 구독 기간 (Pro)
  subscribed_at   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,

  -- 알림 발송 여부
  reminded_7d     BOOLEAN DEFAULT FALSE,  -- 만료 7일 전 알림 발송 여부

  -- Toss Payments 자동결제
  billing_provider TEXT CHECK (billing_provider IS NULL OR billing_provider IN ('toss_payments')),
  toss_billing_key TEXT,
  toss_customer_key TEXT,
  toss_last_payment_key TEXT,
  plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'yearly')),
  amount_krw INTEGER NOT NULL DEFAULT 1900 CHECK (amount_krw > 0),
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  next_billing_at TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  payment_failures INTEGER NOT NULL DEFAULT 0 CHECK (payment_failures >= 0),
  payment_method_label TEXT,
  payment_method_last4 TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id)
);
```

### payment_events
> 결제 provider webhook/API 결과 저장 및 멱등 처리

```sql
CREATE TABLE public.payment_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL CHECK (provider IN ('toss_payments')),
  provider_event_id TEXT,
  event_type        TEXT NOT NULL,
  payment_key       TEXT,
  order_id          TEXT,
  subscription_id   UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at      TIMESTAMPTZ,
  processing_error  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 플랜별 기능 접근 제어

| 기능 | Free | Trial (30일) | Pro |
|------|------|-------------|-----|
| Task / Habit 기본 관리 | ✅ | ✅ | ✅ |
| 캘린더 뷰 | ✅ | ✅ | ✅ |
| 위젯 3종 | ✅ | ✅ | ✅ |
| 소셜 로그인 / 동기화 | ✅ | ✅ | ✅ |
| 오프라인 지원 | ✅ | ✅ | ✅ |
| Task Dependency 시각화 | ❌ | ✅ | ✅ |
| 월간 리포트 | ❌ | ✅ | ✅ |
| 통계 (주간/월간) | ❌ | ✅ | ✅ |
| 위젯 커스터마이징 | ❌ | ✅ | ✅ |
| 공유/협업 (v2) | ❌ | ✅ | ✅ |

---

### Trial 만료 처리 흐름

```
가입 → Trial 시작 (30일)
  └── D-7: 푸시 알림 + 앱 내 배너로 구독 유도 (reminded_7d = TRUE)
  └── D-Day: 구독 유도 팝업 표시 → Free로 자동 다운그레이드
              Trial/Pro 기간 데이터: 읽기만 가능, 편집 불가
```

---

## 7. Goal & Pro Report schema (implemented 2026-05-29/30)

> Goal 입력은 Free / Trial / Pro 모두 가능하다. 목표 기반 월간/연간 리포트 상세는
> Trial / Pro 전용으로 gate한다. 실제 마이그레이션은
> `supabase/migrations/20260529120000_goal_report.sql`이다. 2026-05-30 기준
> Local과 Remote hosted Supabase 모두에 적용되어 있다.
>
> 중요: 이 문서의 기존 백엔드 전략과 동일하게, business data FK는
> `auth.users`를 직접 참조하지 않고 `public.users(id)`를 참조한다.

### 7-1. goals

월간/연간 목표를 하나의 테이블에 저장한다. 월간 목표와 연간 목표는 강제 연결하지
않는다.

```sql
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'yearly')),
  period_key TEXT NOT NULL, -- monthly: '2026-06', yearly: '2026'
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (period_type = 'monthly' AND period_key ~ '^[0-9]{4}-[0-9]{2}$')
    OR (period_type = 'yearly' AND period_key ~ '^[0-9]{4}$')
  ),
  CHECK ((locked = false AND locked_at IS NULL) OR (locked = true))
);

CREATE INDEX idx_goals_user_period
  ON public.goals (user_id, period_type, period_key, sort_order);
```

- Migration includes `set_updated_at()` trigger on `public.goals`.
- Migration includes owner-only RLS policies following existing app tables:
  - `SELECT`: `auth.uid() = user_id`
  - `INSERT`: `auth.uid() = user_id`
  - `UPDATE`: `auth.uid() = user_id`
  - `DELETE`: `auth.uid() = user_id`
- 같은 `user_id + period_type + period_key` 기준으로 최대 5개까지 허용한다.
  MVP에서는 app/service layer에서 먼저 제한한다. DB trigger는 추후 필요 시
  추가한다.
- `locked = TRUE`는 영구 수정 금지가 아니라, 수정 전 확인 모달을 띄우는 UX
  플래그다.
- DB check constraint는 `locked = false`이면 `locked_at IS NULL`이어야 함을
  강제한다. iOS/Web sync payload는 잠금 해제 시 `locked_at: null`을 명시해야
  한다. iOS는 2026-05-30에 이 케이스를 회귀 테스트로 보강했다.
- 목표와 Task/Habit 직접 연결은 후속 범위로 둔다.
- `period_key` format은 application code에서 생성한다:
  - monthly: `YYYY-MM`
  - yearly: `YYYY`
- DB check constraint도 위 형식을 검증한다.
- `sort_order`는 같은 기간 내 사용자가 입력한 순서를 유지하기 위한 값이다.

### 7-2. goal_prompt_dismissals

월초/연초 목표 설정 모달을 해당 기간에 다시 띄우지 않기 위한 상태를 저장한다.

```sql
CREATE TABLE public.goal_prompt_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('onboarding', 'monthly', 'yearly')),
  period_key TEXT NOT NULL,
  dismissed_permanently_for_period BOOLEAN NOT NULL DEFAULT TRUE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_type, period_key),
  CHECK (
    (prompt_type = 'monthly' AND period_key ~ '^[0-9]{4}-[0-9]{2}$')
    OR (prompt_type = 'yearly' AND period_key ~ '^[0-9]{4}$')
    OR (prompt_type = 'onboarding' AND period_key = 'initial')
  )
);
```

- Migration includes owner-only RLS policies following existing app tables.
- 월간 프롬프트는 매월 1~3일 사이에 표시 가능하다.
- 연간 프롬프트는 매년 1월 1~7일 사이에 표시 가능하다.
- 첫 가입 사용자는 위 기간이 아니더라도 onboarding flow에서 연간 목표 설정
  여부를 물을 수 있다.
- 해당 기간의 목표가 이미 존재하면 프롬프트를 표시하지 않는다.
- `prompt_type = 'onboarding'`은 첫 사용자 목표 설정 진입을 다시 띄우지 않기
  위한 상태다. 월간/연간 기간 프롬프트와 별도로 취급하며, MVP의
  `period_key`는 `initial`로 고정한다.
- `dismissed_permanently_for_period`는 MVP에서는 항상 true로 저장해도 된다.
  향후 "이번에는 닫기"와 "다시 보지 않기"를 분리할 때 확장 여지를 남긴다.

### 7-3. 구현/동기화 주의사항

- Hosted Supabase migration state was verified with `supabase migration list`
  on 2026-05-30:
  - Local: `20260529120000`
  - Remote: `20260529120000`
- Web storage maps `goals` and `goal_prompt_dismissals` through the existing
  Supabase adapter and local persistence queue.
- iOS storage mirrors the same data in Core Data entities `CDGoal` and
  `CDGoalPromptDismissal`, queues `goal_upsert`, `goal_delete`, and
  `goal_prompt_dismissal_upsert`, and fetches both tables during snapshot sync.
- `goal_prompt_dismissals` upsert uses
  `on_conflict=user_id,prompt_type,period_key`, matching the table unique
  constraint.
- Maximum 5 goals per `user_id + period_type + period_key` is still enforced in
  application code, not by a DB trigger.

## 8. 월간/연간 리포트 집계 방식

> 초기 구현은 앱/웹에서 실시간 계산 + 템플릿 narrative로 시작한다. Edge Function,
> AI narrative, report snapshot 저장은 후속 범위로 둔다.

```
월간/연간 리포트 요청
  └── 목표 + tasks + habits + habit_logs 로컬/클라이언트 집계
      ├── 해당 월 tasks 완료율 집계
      ├── 카테고리별 완료율 집계
      ├── habit_logs 기반 달성률 / 스트릭 계산
      ├── 목표 대비 진행 narrative 생성
      └── 앱/웹에서 렌더링
```

- Free user behavior:
  - 목표 입력/수정은 허용한다.
  - 리포트 상세는 잠그고, 일부 요약 preview와 Pro CTA를 보여준다.
- Trial / Pro behavior:
  - 월간/연간 리포트 상세를 보여준다.
  - Trial 사용자는 Pro entitlement와 동일하게 취급하되, subscription panel의
    Trial/결제 연결 안내는 기존 정책을 따른다.
- MVP report inputs:
  - goals for `period_type + period_key`
  - tasks whose date range intersects the period
  - habit logs inside the period
  - existing category names and completion status
- MVP report outputs:
  - 목표 목록과 간단한 진행 narrative
  - Task 완료율
  - 카테고리별 Task 완료율
  - Habit 달성률 / 최고 스트릭
  - 가장 많이 밀린 작업
- Explicitly out of scope for MVP:
  - saved report snapshots
  - AI-generated narrative
  - push notification reminders
  - numeric goal target/progress fields
  - direct task/habit-goal relationships

---

## 9. 미결 사항

- [x] 구독 가격 정책 (월 ₩1,900 / 연 ₩9,900)
- [x] Goal & Pro Report MVP 정책 (Free 입력 허용, Trial/Pro 리포트 상세,
  실시간 계산 + 템플릿 narrative)
- [ ] 공유/협업 기능 테이블 설계 (v2)
