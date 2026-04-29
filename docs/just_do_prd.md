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
| 백엔드 (v1) | Supabase (Auth, PostgreSQL, Realtime, Edge Functions) — 추후 자체 백엔드로 이전 가능성 열어둠. 자세한 운영 원칙은 `backend_strategy.md` 참고 |
| 개발 우선순위 | iOS + 웹앱 동시 개발 (v1), Android (v3) |

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
- 카테고리 ([나] / [외부])
- 태그 (복수 선택/생성 가능)
- 우선순위 (높음 / 중간 / 낮음)
- 메모
- 반복 설정 (매일 / 매주 특정 요일 / 매월)
- 반복 종료일
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
- 반복 주기 (매일 / 매주 특정 요일 / 매월)

선택 입력:
- 목표 (예: '30분')
- 카테고리
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
- 선택 날짜의 Task + Habit을 카테고리별 섹션으로 표시
```
[나] / [외부] / [Habit]
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

---

### 3-8. 통계

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

#### 월간 리포트
- 매월 자동 생성 (Supabase Edge Function)
- 포함 내용: Task 완료율, 카테고리별 완료율, Habit 달성률, 최고 스트릭

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
| 위젯 3종 | ✅ | ✅ |
| 소셜 로그인 / 동기화 | ✅ | ✅ |
| 오프라인 지원 | ✅ | ✅ |
| Task Dependency 시각화 | ❌ | ✅ |
| 월간 리포트 | ❌ | ✅ |
| 통계 (주간/월간) | ❌ | ✅ |
| 위젯 커스터마이징 | ❌ | ✅ |
| 공유/협업 (v2) | ❌ | ✅ |

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
| 통계 | Task/Habit 통계 및 월간 리포트 |
| 설정 | 계정, 알림, 카테고리/태그, 디스플레이, 구독, 데이터, 앱 정보 |
| 구독 유도 팝업 | Trial 만료 시 구독 안내 |

---

### 웹 전용 화면

| 화면 | 설명 |
|------|------|
| Task Dependency 시각화 | 연결된 Task 흐름을 간트차트 / 플로우차트로 표현 |
| Task 추가/편집 모달 | Bottom Sheet 대신 모달 형태 |

---

## 5. 디자인 가이드라인

| 항목 | 내용 |
|------|------|
| 톤앤매너 | 미니멀, 깔끔 (흰 배경 고정 아님) |
| 다크모드 | 지원 |
| 기본 캘린더 뷰 | 월간 (주간/일간 전환 가능) |
| 카테고리 색상 | [나] 블루 계열 / [외부] 레드·오렌지 계열 / [Habit] 그린 계열 |
| iOS 네이티브 | SwiftUI 기본 컴포넌트 적극 활용 |

---

## 6. 개발 로드맵

| 단계 | 내용 |
|------|------|
| **v1** | Task/Habit CRUD, 캘린더 뷰, 위젯 3종, 소셜 로그인, 실시간 동기화, 오프라인 지원, 푸시 알림, Trial/구독 |
| **v2** | Task Dependency 시각화 (웹), 공유/협업, 통계 고도화, 이메일 회원가입 |
| **v3** | Android 앱 출시 |

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
