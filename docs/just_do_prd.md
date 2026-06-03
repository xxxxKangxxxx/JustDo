# Just Do — 개발 명세서 (PRD) v0.1

> 이 문서는 Claude Code에 전달하기 위한 개발 명세서입니다.
> 기획 문서(just_do_planning.md)와 DB 스키마(just_do_db_schema.md)를 함께 참고하세요.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 앱 이름 | Just Do |
| 컨셉 | 할일과 일정을 하나의 항목(Task)으로 통합 관리하는 캘린더 기반 To-Do 앱 |
| 플랫폼 | iOS (Swift + SwiftUI), 웹앱 (Next.js + TypeScript) |
| 플랫폼 전략 | Web = 데스크탑 productivity hub / iOS = 모바일 네이티브 / Android = v3. 자세한 내용은 §1.5 참고 |
| 백엔드 (v1) | Supabase (Auth, PostgreSQL, Realtime, Edge Functions) — 추후 자체 백엔드로 이전 가능성 열어둠. 자세한 운영 원칙은 `backend_strategy.md` 참고 |
| 개발 우선순위 | iOS + 웹앱 동시 개발 (v1), Android (v3) |

---

## 1.5. Platform Strategy

> 2026-05-10 결정. Web과 iOS는 도메인 모델/Supabase 스키마는 공유하지만 UI/UX는 의도적으로 분기한다.

| 플랫폼 | v1 위치 | 형태 | UI Reference |
|--------|---------|------|--------------|
| **Web** | v1 출시 | **데스크탑 productivity hub** (사이드바 nav, 멀티 컬럼 레이아웃, 키보드 단축키, 드래그앤드롭, 큰 dashboard) | `reference/web_proto/` + `reference/Just Do - Web Prototype.html` |
| **iOS** | v1 출시 | **모바일 네이티브** (홈 중심 하단 바, 단일 컬럼, bottom sheet add 플로우, 위젯) | `reference/proto/` |
| **Android** | v3 출시 | 모바일 네이티브 — 출시 전까지 모바일 사용자는 iOS 앱 또는 데스크탑 web 사용 권장 | (v3 결정 시점에 정의) |

### 핵심 원칙

- **공유**: 도메인 모델 (Task / Habit / Category / Settings), Supabase 스키마/RLS, 색상 토큰, 카테고리 색상 시스템
- **분기**: 레이아웃, 네비게이션 구조, 인터랙션 패턴, 화면 구성

### 모바일 웹 진입 처리

Web은 데스크탑 사용을 가정하므로, 모바일 브라우저 (특히 Android, iOS 앱 미설치) 진입 시 안내 페이지로 분기한다:

- iOS 사용자: iOS 앱 다운로드 안내. 공개 App Store URL 확정 후에는 iOS
  모바일 브라우저 진입 시 해당 URL로 자동 이동하고, 안내 페이지는 URL 미설정 /
  비지원 환경 / 이동 실패 시 fallback 으로 유지한다.
- Android 사용자: 데스크탑 web 사용 권장 + Android 앱 출시 알림 대기 가입 (선택)
- 데스크탑 권장 메시지

### 디자인 분기의 함의

- `reference/proto/`는 **모바일/iOS 전용** reference. 데스크탑 web prototype은 `reference/web_proto/`와 `reference/Just Do - Web Prototype.html`에 별도로 둔다.
- iOS와 Web은 동일한 *기능*을 다른 *형태*로 제공한다. 예: 리포트/활동 요약은 iOS에서는 홈 배너와 설정 내부 진입, Web에서는 dashboard/side panel 맥락으로 제공될 수 있음.
- 일부 기능은 플랫폼 전용일 수 있다 (예: 위젯 = iOS 전용, 드래그앤드롭 = Web 전용, 키보드 단축키 = Web 우선).

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| iOS 앱 | Swift + SwiftUI |
| iOS 위젯 | WidgetKit |
| iOS 로컬 저장 | Core Data |
| 웹 앱 | Next.js 14 + TypeScript |
| 웹 스타일링 | Tailwind CSS |
| 웹 로컬 저장 | IndexedDB |
| 백엔드 / DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (Apple, Google 소셜 로그인) |
| 실시간 동기화 | Supabase Realtime |
| 서버 집계 | Supabase Edge Functions |
| 푸시 알림 (iOS) | APNs |
| 푸시 알림 (웹) | Web Push API + FCM |

---

## 3. 핵심 기능 명세

---

### 3-1. 인증 (Auth)

#### 소셜 로그인
- Apple 로그인, Google 로그인 지원
- Supabase Auth 사용
- 로그인 성공 시 `public.users` 테이블에 사용자 정보 upsert
- 로그인 성공 시 `public.user_subscriptions` 테이블에 Trial 레코드 생성 (trial_end_at = NOW() + 30일)

#### 로그아웃 / 회원탈퇴
- 로그아웃: 세션 종료, 로컬 캐시 유지
- 회원탈퇴: Supabase Auth 계정 삭제 + 관련 데이터 전체 삭제 (CASCADE)

---

### 3-2. Task

#### Task 생성
필수 입력:
- 제목 (title)

선택 입력:
- 날짜 범위 (start_date ~ end_date)
- 특정 시간 고정 (scheduled_time)
- 카테고리 (기본 카테고리 + 사용자 커스텀 카테고리)
- 태그 (복수 선택/생성 가능)
- 우선순위 (높음 / 중간 / 낮음)
- 메모
- 반복 설정 (v1: 매일 / 매주 특정 요일, v2: 매월)
- 반복 종료일 (v2)
- 알림 설정
- 서브태스크
- 이전/다음 Task 연결 (Dependency)

#### Task 완료 처리
- 체크박스 탭 → `is_completed = TRUE`, `completed_at = NOW()`
- 반복 Task 완료 시: 해당 날짜 인스턴스만 완료 처리, 다음 반복은 유지

#### Task 수정 / 삭제
- 반복 Task 수정 시 선택지 제공: "이 항목만" / "이후 모든 항목" / "전체"
- 삭제 시 서브태스크, task_tags, task_dependencies 함께 삭제 (CASCADE)

---

### 3-3. Habit

#### Habit 생성
필수 입력:
- 제목
- 반복 주기 (v1: 매일 / 매주 특정 요일, v2: 매월)

선택 입력:
- 목표 (예: '30분')
- Habit은 사용자 카테고리와 분리된 Habit 전용 그룹으로 관리
- 태그
- 알림 시간

#### Habit 완료 처리
- 날짜별 habit_logs 레코드 생성/업데이트
- 스트릭: habit_logs에서 연속된 완료일 수 계산
- 달성률: 해당 기간 완료일 수 / 전체 대상일 수

---

### 3-4. 캘린더 뷰

#### 월간 뷰
- 오늘 날짜 하이라이트
- 날짜 셀에 dot으로 Task/Habit 존재 표시
- 기간이 있는 Task는 색상 bar로 날짜 범위 연결
- 날짜 탭 → 하단 목록 업데이트

#### 주간 뷰
- 7일 타임라인
- Task/Habit 시간대별 표시

#### 일간 뷰
- 하루 타임라인
- 시간 고정 Task는 해당 시간대에 표시

#### 하단 목록
- 선택 날짜의 Task는 사용자 카테고리별로, Habit은 Habit 섹션으로 표시
```
[사용자 카테고리] / [Habit]
  ○ 제목          날짜/시간
```
- 체크박스로 완료 처리 가능
- 항목 탭 → Task/Habit 상세 화면 이동
- 항목 스와이프 → 삭제 / 수정 빠른 액션

---

### 3-5. 오프라인 지원

- 오프라인 상태에서 Task/Habit CRUD 모두 가능
- 로컬 저장소(Core Data / IndexedDB)에 변경사항 기록
- 온라인 복귀 시 Last Write Wins 방식으로 Supabase와 동기화
  - 클라이언트 `updated_at` > 서버 `updated_at` → 서버 업데이트
  - 서버 `updated_at` >= 클라이언트 `updated_at` → 서버 데이터 유지
- 오프라인 상태 UI 표시 (상단 배너 등)

---

### 3-6. 실시간 동기화

- Supabase Realtime 구독으로 iOS ↔ 웹 실시간 반영
- 구독 테이블: tasks, subtasks, habits, habit_logs
- 변경 이벤트: INSERT / UPDATE / DELETE 모두 구독

---

### 3-7. 위젯 (iOS)

#### 소 (Small) 위젯
- 오늘 할일 목록 (최대 3개)
- 각 항목 체크 완료 가능 (App Intent 사용)

#### 중 (Medium) 위젯
- 이번 주 미니 캘린더 + 오늘 할일 목록
- 각 항목 체크 완료 가능

#### 대 (Large) 위젯
- 월 캘린더 + 오늘 할일 목록
- 각 항목 체크 완료 가능

#### 위젯 데이터 갱신
- TimelineProvider로 주기적 갱신
- Task 완료 처리 시 앱과 동기화
- 위젯 체크 액션은 App Intent → iOS shared data layer / mutation queue → Supabase write 경로를 사용한다.
- 앱/웹이 열려 있으면 Supabase Realtime으로 변경을 즉시 반영한다.
- 위젯은 App Group cache를 읽고, action 후 WidgetKit timeline reload를 요청한다.
- 자세한 운영 전략은 `widget_sync_strategy.md` 참고.

---

### 3-8. 리포트 / 활동 요약

#### 제품 구조 결정 (2026-06-01)
- 하단 네비게이션은 매일 반복 사용하는 핵심 작업 공간만 남기는 방향으로 정리한다.
- 기존 독립 `통계` 탭은 정보 밀도가 낮아 장기적으로 하단 네비게이션에서 제거한다.
- 기존 통계성 정보는 Goal & Pro Report의 리포트/활동 요약 경험으로 흡수한다.
- 설정은 하단 탭이 아니라 홈 우측 상단 아이콘으로 이동한다.
- 목표는 설정 내부의 관리 화면으로 유지한다.
- 2026-06-01 구현 기준:
  - iOS 하단 바는 `홈` 단일 탭만 중앙에 표시한다.
  - Settings는 Home 우측 상단 gear icon에서 full-screen cover로 열린다.
  - 기존 `통계` 화면은 하단 탭이 아니라 `설정 → 습관`으로 이동했다.
  - `설정 → 습관` 화면은 타이틀을 `습관`으로 표시하고 기존 Task/Habit 통계와
    최근 7일 습관 체크 UI를 보여준다.
  - `설정 → 습관 → 편집`은 Habit management를 `습관` 화면 위에 full-screen으로
    열어야 한다. 닫으면 `습관` 화면으로 돌아온다.
  - `설정 → 목표`와 `설정 → 카테고리 관리`는 Settings 내부에서 full-screen
    management surface로 열린다. Home으로 빠져나간 뒤 sheet를 띄우면 안 된다.
- 하단 바는 단기적으로 유지하되 `홈` 탭 하나를 중앙에 둔다. 추후 친구/일정 공유 기능이 준비되면 `홈 / 함께` 구조로 확장한다.
- `함께`는 친구 추가, 가능한 시간 제안, 공유 일정 조율을 포함하는 후속 제품 트랙이다. TestFlight 전에는 전체 구현하지 않고 문서화한다.

#### Just Do Mode
- Trial/Pro 전용 Home 표시 모드다. Settings의 Just Do Mode toggle은 기능
  availability를 켜는 설정이며, Home sheet/panel의 현재 선택 상태와는 분리한다.
- Home UI와 날짜 선택 흐름은 유지하되, 날짜를 선택했을 때 sheet/panel에서
  `오늘만`과 `이 날까지`를 전환한다.
- Trial/Pro 사용자가 Settings에서 Just Do Mode를 켜면 sheet/panel 안에서
  `오늘만`과 `이 날까지`를 둘 다 사용할 수 있어야 한다. Settings가 꺼져 있거나
  entitlement가 없으면 `이 날까지`는 lock 상태로 표시하고 전환하지 않는다.
- `오늘만`: 기존처럼 selectedDate에 해당하는 Task/Habit을 표시한다.
- `이 날까지`: `endDate <= selectedDate && isCompleted == false`인 Task를
  표시한다. Habit은 누적하지 않고 selectedDate 기준을 유지한다.
- 완료 Task는 Just Do Mode 목록에서 기본 숨김 처리한다.
- Just Do Mode 목록은 `지난일 / 오늘 / 해야할일` 섹션으로 나누고, 오래 밀린
  항목부터 볼 수 있도록 due date 오름차순으로 정렬한다.
- Just Do Mode task row에는 due date/time을 표시한다.
- Calendar date cell의 dot/bar 표시는 기존 기준을 유지한다. 누적 due-by
  상태를 캘린더 셀에 반영하지 않는다.
- `+` 버튼 기본값:
  - 기본 모드: `startDate = selectedDate`, `endDate = selectedDate`
  - Just Do Mode: `startDate = today`, `endDate = selectedDate`
  - `selectedDate < today`이면 둘 다 selectedDate로 설정한다.
- Free 사용자가 `이 날까지` 또는 Settings toggle을 누르면 Pro upgrade/paywall로
  유도하고 설정값은 변경하지 않는다.
- 실제 적용은 항상 `effectiveJustDoMode = hasProEntitlement && settings.justDoMode`
  로 계산한다. 단, 이 값은 `이 날까지` 사용 가능 여부이고 sheet/panel의 local
  선택값은 별도 state로 둔다.

#### 기간 전환
- 주간 / 월간 / 전체

#### Task 통계
- 완료한 Task 수
- 카테고리별 완료율 (도넛 차트)
- 미완료 Task 현황

#### Habit 통계
- 습관별 스트릭 (연속 달성일) 카드
- 주간/월간 달성률 그래프
- 전체 습관 달성률 요약

#### 기간 종료 리포트
- Trial/Pro 전용 리포트로 제공한다.
- Free gating (2026-06-03 결정): 목표 입력·관리는 Free도 가능. **리포트와 배너는
  Free에게도 노출**하되, 리포트를 열면 **실제 리포트 내용을 블러 처리하고 Pro
  CTA**를 덮는다(clean preview 아님 — 가려진 알맹이를 보여 전환 유도). Trial/Pro는
  블러 없이 전체를 본다.
- 초기 구현은 서버 snapshot 생성보다 앱/웹에서 실시간 계산 + 템플릿 narrative를
  우선한다. AI narrative와 report snapshot 저장은 후속 범위로 둔다.
- 리포트 내용 (2026-06-03 결정):
  - 단계 구성 유지: `완료율/평균 진행률 → 활동 → 목표별 진행 → 이야기`.
  - **목표별 진행이 핵심**: 자동 진행률 + target 반영(예: `운동 7/10`), 정성 목표는
    %. (선택) "이 목표에 반영된 항목" 읽기전용 노출.
  - 활동 요약: Task 완료율, 카테고리별 완료율, Habit 달성률, 최고 스트릭, 가장
    많이 밀린 작업.
  - 이야기: 템플릿 narrative를 유지하되 **실제 데이터로 채운다**(가장 잘 된 목표 /
    가장 뒤처진 목표를 문장에 반영). AI narrative는 후속.
  - 회고: 끝에 **비저장 회고 질문 1개**만 노출(예: `다음 기간엔 무엇을 바꿔볼까요?`).
    회고 메모 저장(저널)은 후속.
  - 연간 리포트에서 월간 목표를 연간 목표 아래로 텍스트 유사도로 묶는 **자동
    그룹핑은 v2 후속**. v1 연간은 연간 목표별 진행 + 12개월 추이로 충분.
- 목표 진행률 산정 원칙 (2026-06-03 결정):
  - 목표 진행률은 사용자가 입력/수정할 수 없는 **자동 산정** 값이다. task를
    특정 목표에 임의로 귀속시키는 수동 연결 UI는 제공하지 않는다(진행률 조작
    레버 차단). 태그는 캘린더 필터 전용으로 유지하며 목표 귀속에 재사용하지
    않는다.
  - 조작 방지 수준은 "캐주얼한 부풀리기 차단"(레벨 가)으로 한정한다. task/목표
    텍스트의 관련도로 자동 판정하며, HealthKit 등 외부 신호 기반의 완전
    객관화(레벨 나)는 후속 트랙으로 둔다.
  - v1은 결정적(deterministic) 관련도 매처를 양 플랫폼에 **동일 알고리즘**으로
    적용해 web/iOS 진행률이 일치하게 한다. ML 임베딩(서버)은 정확도가 부족할
    때의 후속 업그레이드로 두고, 온디바이스 ML은 플랫폼 간 불일치로 배제한다.
  - 관련 항목이 0건인 목표는 전체 task 완료율로 폴백하지 않고 "관련 항목 없음"
    으로 표시한다.
  - 목표에 **선택적 숫자 target**을 둘 수 있다(예: `책 3권`). 분자(완료 수)는
    자동 산정을 유지하고 target은 분모로만 쓴다(`완료/target`). target 미설정
    정성 목표는 `완료/관련` 방식. target 설정은 목표 정의이지 진행률 조작이
    아니다. 마감일·카테고리 연동·수동 달성 표시는 제외한다.
  - 자세한 구현 계획은 `docs/next_steps.md` "Goal Progress Accuracy" 참고.
- 리포트는 상시 진입 메뉴가 아니라 월말/연말에 활성화되는 회고성 기능이다.
- 월간 리포트는 다음 달 1일부터 이전 달 리포트를 활성화한다.
  - 예: 2026-06-01부터 2026년 5월 리포트 제공.
- 연간 리포트는 다음 해 1월 1일부터 이전 해 리포트를 활성화한다.
  - 예: 2027-01-01부터 2026년 연간 리포트 제공.
- 현재 진행 중인 월/연도 리포트는 잠금 또는 미준비 상태로 둔다.
- 홈 상단 배너를 기본 진입점으로 사용한다.
  - 예: `5월 리포트가 준비됐어요`.
  - 월간/연간 리포트가 동시에 준비된 1월에는 연간 리포트를 우선 노출한다.
  - 홈 배너는 닫을 수 있고, 닫은 배너는 해당 기간 동안 재노출하지 않는 방향을 우선한다.
- 목표 화면에는 보조 배너를 둔다.
  - 예: `5월 리포트 준비 완료  보기`.
  - 목표 화면 보조 배너는 닫기 없이 유지해 사용자가 놓친 리포트를 다시 찾을 수 있게 한다.
  - 준비된 기간별로 연간/월간 섹션 근처에 작게 노출한다.

#### Goal & Pro Report
- Just Do Mode와 별도 기능으로 운영한다. Just Do Mode는 Home의 todo 표시
  방식이고, Goal & Pro Report는 월간/연간 목표와 회고 리포트 기능이다.
- 월간↔연간 목표 관계 (2026-06-03 결정): **완전 분리**한다. 저장된 부모 링크나
  하드 종속 없음. 진행률이 기간별 자동 산정이라 연간 목표는 스스로 진행률을
  가지며 월간 롤업이 불필요하다(관계는 UX 사안). 월간 목표 작성/조회 시 그 해
  연간 목표를 **읽기전용 맥락**으로만 노출한다. 리포트에서의 느슨한 자동
  그룹핑(텍스트 유사도)은 후속.
- 2026-05-29 결정: Just Do Mode iOS/Web smoke 후 다음 제품 구현 트랙으로
  진행한다.
- 2026-05-30 구현 상태: Supabase schema, Web MVP, iOS shared data layer, iOS
  Settings → 목표 UI, goal prompt, goal CRUD/sync, locked-goal confirmation,
  and lock toggle first pass are implemented. Settings → 목표 focused smoke와
  삭제 확인 UX도 완료됐다. 남은 범위는 기간 종료 리포트 배너 진입 UX 구현과
  TestFlight 준비다.
- 목표 입력은 Free / Trial / Pro 모두 가능하다.
- 목표 기반 월간/연간 리포트 상세 열람은 Trial / Pro 전용이다.
- 첫 가입 또는 첫 실행 사용자는 목표 설정 모달을 본다. 모달은 강제 입력이
  아니며 하단의 `나중에 할게요`로 건너뛸 수 있다.
- 월간 목표:
  - 매월 1일부터 3일까지 설정 프롬프트를 표시할 수 있다.
  - 해당 월 목표가 이미 있으면 프롬프트를 표시하지 않는다.
  - 사용자가 `다시 보지 않기`를 선택하고 닫으면 해당 월에는 다시 표시하지
    않는다.
  - 월간 목표는 최대 5개까지 입력할 수 있다.
- 연간 목표:
  - 매년 1월 1일부터 1월 7일까지 설정 프롬프트를 표시할 수 있다.
  - 해당 연도 목표가 이미 있으면 프롬프트를 표시하지 않는다.
  - 사용자가 `다시 보지 않기`를 선택하고 닫으면 해당 연도에는 다시 표시하지
    않는다.
  - 첫 가입 시점이 1월 1~7일이 아니더라도 신규 사용자에게는 연간 목표 설정
    여부를 묻는다.
  - 연간 목표는 최대 5개까지 입력할 수 있다.
- 월간 목표와 연간 목표는 서로 강제 연결하지 않는다. 월간 목표 입력 시 연간
  목표를 참고 문맥으로 보여줄 수는 있지만, 데이터 관계는 느슨하게 유지한다.
- 목표는 `title`과 선택 `note`로 시작한다. 수치 목표, 카테고리 연결, Task
  직접 연결은 후속 범위로 둔다.
- 목표 수정 잠금:
  - 목표 생성 시 `이번 기간 동안 목표를 고정할게요` 옵션을 제공할 수 있다.
  - 목표 관리 카드에서는 카드 내 `고정/열림` 자물쇠 배지로 잠금을 직접
    토글할 수 있다.
  - 잠긴 목표는 바로 수정하지 않고 확인 모달을 거친다.
  - 확인 문구 예: `고정한 목표를 수정할까요? 처음 세운 목표와 달라질 수
    있어요.`
  - 영구 수정 불가가 아니라 사용자의 의도 확인을 강화하는 UX로 둔다.
- 초기 알림은 앱/웹 진입 시 모달만 사용한다. 푸시 알림은 후속 범위로 둔다.
- MVP 구현 범위:
  - Web MVP를 먼저 구현하고, behavior가 안정되면 iOS에 반영한다.
    2026-05-30 기준 두 플랫폼 모두 first pass가 반영되어 있다.
  - 목표와 프롬프트 dismiss 상태는 Supabase에 저장한다.
  - 리포트는 기존 task/habit/habit log 데이터를 실시간 집계해 템플릿 문장으로
    렌더링한다.
  - saved report snapshot, AI narrative, 목표-Task/Habit 직접 연결, 수치형
    목표 progress는 후속 범위다.

---

### 3-9. 구독 / Trial

#### Trial
- 가입 후 30일간 Pro 기능 전체 무료 체험
- D-7: 푸시 알림 + 앱 내 배너로 구독 유도
- D-Day: 구독 유도 팝업 → Free로 자동 다운그레이드
- 만료 후 Trial/Pro 기간 데이터: 읽기만 가능, 편집 불가

#### 플랜별 기능 접근 제어
| 기능 | Free | Trial / Pro |
|------|------|-------------|
| Task / Habit 기본 관리 | ✅ | ✅ |
| 캘린더 뷰 | ✅ | ✅ |
| 기본 위젯 3종 | ✅ | ✅ |
| 소셜 로그인 / 동기화 | ✅ | ✅ |
| 오프라인 지원 | ✅ | ✅ |
| Task Dependency 시각화 | ❌ | ✅ |
| 목표 입력 | ✅ | ✅ |
| 월간/연간 목표 리포트 상세 | ❌ | ✅ |
| 리포트/활동 요약 고급 분석 | ❌ | ✅ |
| 데이터 export | ✅ | ✅ |
| 고급 위젯 커스터마이징 (v2+) | 정책 미정 | 정책 미정 |
| 공유/협업 (v2) | ❌ | ✅ |

> 2026-05-19 결정: Free는 기록/관리와 기본 위젯 경험을 보장한다.
> Trial/Pro는 분석·리포트·고급 기능 중심으로 구분한다. 월간 리포트와 Task
> Dependency 시각화는 v2 도입 예정이며, 구현 시 Pro gate 대상이다. 위젯은
> 제품 핵심 기능이므로 기본 3종은 Free에 유지하고, 추후 위젯 커스터마이징을
> 도입할 때 고급 커스터마이징 범위만 별도 정책으로 확정한다.

---

### 3-10. 알림

| 알림 종류 | 조건 | 플랫폼 |
|-----------|------|--------|
| Task 알림 | reminder_at 도달 시 | iOS (APNs), 웹 (FCM) |
| Habit 알림 | reminder_at 매일 | iOS (APNs), 웹 (FCM) |
| Trial 만료 D-7 알림 | trial_end_at - 7일 | iOS, 웹 |
| Trial 만료 당일 알림 | trial_end_at 당일 | iOS, 웹 |

- 알림 트리거: Supabase Edge Function (cron job)

---

## 4. 화면 명세

---

### iOS 화면 목록

| 화면 | 설명 |
|------|------|
| 온보딩 | 앱 소개 + 소셜 로그인 |
| 홈 (캘린더 뷰) | 월간/주간/일간 캘린더 + 하단 Task 목록 |
| Task 추가 - Bottom Sheet | 기본 Task/Habit 입력 |
| Task 추가 - 전체화면 | 상세 설정 (서브태스크, 메모, 알림, Dependency) |
| Task 상세 | Task 정보 확인 및 편집 |
| Habit 상세 | Habit 정보 확인 및 편집 |
| 리포트/활동 요약 | 기간 종료 후 홈 배너 또는 설정/목표 보조 진입으로 확인하는 Task/Habit/Goal 회고 |
| 습관 | 설정 내부에서 진입. 기존 통계 화면을 흡수해 Task/Habit 월간 통계, 습관 카드, 최근 7일 습관 체크, `편집` 진입 제공 |
| 습관 관리 | `설정 → 습관 → 편집`에서 full-screen으로 진입. 닫으면 습관 화면으로 복귀 |
| 목표 | 설정 내부 full-screen 목표 관리 화면. 연간/월간 목표 추가, 수정, 고정, 삭제 |
| 설정 | 홈 우측 상단 아이콘으로 full-screen 진입. 계정, 알림, 습관, 목표, 카테고리 관리, 디스플레이, 구독, 데이터, 앱 정보 |
| 함께 (후속) | 친구 추가, 가능한 시간 제안, 공유 일정 조율. TestFlight 후 제품 트랙 |
| 구독 유도 팝업 | Trial 만료 시 구독 안내 |

---

### 웹 전용 화면

| 화면 | 설명 |
|------|------|
| Task Dependency 시각화 | 연결된 Task 흐름을 간트차트 / 플로우차트로 표현 |
| Task 추가/편집 모달 | Bottom Sheet 대신 모달 형태 |

---

## 5. 디자인 가이드라인

> Web과 iOS의 디자인 분기 원칙은 §1.5 Platform Strategy 참고. 아래는 양 플랫폼이 **공유**하는 가이드라인과 **플랫폼별** 가이드라인을 분리해 표기한다.

### 공통 (Web + iOS)

| 항목 | 내용 |
|------|------|
| 톤앤매너 | 미니멀, 깔끔 (흰 배경 고정 아님) |
| 다크모드 | 지원 |
| 기본 캘린더 뷰 | 월간 (주간/일간 전환 가능) |
| 카테고리 색상 | 사용자 카테고리별 커스텀 색상 / Habit은 그린 계열 |
| 디자인 토큰 | 색상/타이포 토큰은 양 플랫폼이 공유 |

### iOS

| 항목 | 내용 |
|------|------|
| 폼팩터 | 모바일 단일 컬럼 |
| 네비게이션 | 하단 바 유지. 단기적으로 `홈` 단일 탭을 중앙에 배치하고 설정은 홈 우측 상단 아이콘으로 full-screen 진입. 후속 `함께` 기능 도입 시 `홈 / 함께`로 확장 |
| Add 플로우 | bottom sheet (partial detent) |
| UI Reference | `reference/proto/` |
| 네이티브 | SwiftUI 기본 컴포넌트 적극 활용 |

### Web (데스크탑)

| 항목 | 내용 |
|------|------|
| 폼팩터 | 데스크탑 가정 (≥ 1024px). 좁은 윈도우/모바일 진입 시 안내 페이지 |
| 네비게이션 | 사이드바 또는 상단 톱바 (재디자인 단계에서 확정) |
| Add 플로우 | 모달 또는 인라인 |
| UI Reference | `reference/web_proto/` + `reference/Just Do - Web Prototype.html` |
| 데스크탑 가치 | 멀티 컬럼, 키보드 단축키, 드래그앤드롭, 큰 dashboard |

---

## 6. 개발 로드맵

| 단계 | 내용 |
|------|------|
| **v1** | iOS 앱 + Web (데스크탑 productivity hub) 동시 출시. Task/Habit CRUD, 캘린더 뷰, 위젯 3종 (iOS), 소셜 로그인, 실시간 동기화, 오프라인 지원, 푸시 알림, Trial/구독. **Web Desktop Redesign (Phase 7) v1 차단 항목** — 데스크탑 reference 도착 후 구현 진행 중, 출시 전 완료 필요 |
| **v2** | Task Dependency 시각화 (웹), Habit 매월 반복/반복 종료일, `함께` 친구/일정 공유, 리포트 고도화, 이메일 회원가입 |
| **v3** | Android 앱 출시 — v3 출시 전까지 Android 사용자는 데스크탑 web 사용 |

---

## 7. 보안 체크리스트

- [ ] 모든 Supabase 테이블 RLS 활성화
- [ ] `service_role key` 서버 환경변수로만 사용, 클라이언트 노출 금지
- [ ] Next.js `.env.local`에 민감 키 관리
- [ ] Apple / Google OAuth 콜백 URL 화이트리스트 등록
- [ ] APNs 인증서 / FCM 서버 키 안전하게 관리

---

## 8. 참고 문서

- `just_do_planning.md` — 전체 기획 문서
- `just_do_db_schema.md` — DB 스키마 설계
- `backend_strategy.md` — Supabase 우선/자체 백엔드 이전 가능성 운영 원칙
- `just_do_claude_design_prompt.md` — UI 디자인 프롬프트
