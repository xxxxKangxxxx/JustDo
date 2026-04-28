# Just Do — DB 스키마 설계 v0.1
> Supabase (PostgreSQL) 기준

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
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

### categories
> [나] / [외부] 카테고리. 기본값 2개 + 사용자 커스텀 색상 설정 가능

```sql
CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,          -- '나', '외부'
  color      TEXT NOT NULL,          -- hex 색상코드 (예: '#4A90E2')
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
                  CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),

  -- Trial 기간
  trial_start_at  TIMESTAMPTZ DEFAULT NOW(),
  trial_end_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- 구독 기간 (Pro)
  subscribed_at   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,

  -- 알림 발송 여부
  reminded_7d     BOOLEAN DEFAULT FALSE,  -- 만료 7일 전 알림 발송 여부

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id)
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

## 7. 월간 리포트 집계 방식

> Supabase Edge Function으로 서버에서 집계 후 앱/웹에 전달

```
월간 리포트 요청
  └── Edge Function 호출
      ├── 해당 월 tasks 완료율 집계
      ├── 카테고리별 완료율 집계
      ├── habit_logs 기반 달성률 / 스트릭 계산
      └── 결과 JSON 반환 → 앱/웹에서 렌더링
```

---

## 8. 미결 사항

- [ ] 구독 가격 정책 (월/연 금액) — 출시 직전 확정
- [ ] 공유/협업 기능 테이블 설계 (v2)
