# App Store Connect 리스팅 초안 (iOS v1)

> 2026-06-14 작성 (Claude Code). 코드 감사 기반 초안 — App Store Connect 제출 시
> 그대로 복사/조정해서 사용. 추정이 아니라 실제 앱 동작/수집 기준으로 작성됨.
> 관련: `docs/next_steps.md` App Store prep, 메모리 `apple_signin_todo` /
> `payment_provider` / `deployment_domain`.

---

## 0. 먼저 처리해야 하는 선행 조건 (제출 전 blocker)

| 항목 | 상태 | 조치 |
|---|---|---|
| **개인정보처리방침 URL (공개 호스팅)** | ✅ LIVE (2026-06-16 확인) | 2026-06-14 `/privacy`·`/terms` 라우트 추가, 연락처 `kang071911@gmail.com`·시행일 2026-06-14 입력. main push → Amplify 배포 완료. **`https://www.justdo.co.kr/privacy`·`/terms` 둘 다 200 응답 확인.** App Store Connect 개인정보 URL에 그대로 입력 가능. |
| **데모 계정 / 심사 메모** | ✅ 데모 계정 준비 | Google 데모 계정 `kangym071900@gmail.com` 사용. 비밀번호는 제출 시 App Store Connect 심사 메모에만 입력. §4 참고. |
| **스크린샷** | ✅ 6.9" 포스터 PNG 생성 | `app-store-screenshots/01-calendar-flow.png` ~ `04-goals-flow.png` 생성 완료. §3 참고. |
| **iPad 지원 여부 결정** | ✅ iPhone 전용 결정·적용 (2026-06-14) | `TARGETED_DEVICE_FAMILY` 전 타깃 `1`로 변경. iPad 스크린샷 불필요. |
| **Export compliance 키** | ✅ 적용 (2026-06-14) | Info.plist에 `ITSAppUsesNonExemptEncryption = NO` 추가. |
| **인앱 약관/방침 텍스트 stale** | ✅ 갱신 (2026-06-14) | `ContentView.swift` 약관 "계정"·방침 "수집 항목"에 Apple 로그인 반영. |

---

## 1. App Privacy (개인정보 nutrition labels)

**감사 결과 (코드 기준 사실):**
- 서드파티 SDK 0개 (원격 SPM 없음, 로컬 `JustDoShared`만). 분석/추적/광고/크래시 SDK **없음**. ATT/IDFA **없음**.
- 앱이 통신하는 외부 서버 = **Supabase 프로젝트 하나뿐** (auth + REST 동기화). Apple/Google 로그인은 OS/웹 레벨, Gemini 임베딩은 **서버사이드**(앱에서 직접 호출 안 함).
- `service_role` 키 iOS에 없음. anon(public) 키만 사용.
- 로컬 알림 실제 미구현(설정 토글은 저장만). 위치/사진/연락처/건강 등 권한 요청 **없음**.

### "Data Used to Track You" → **없음 (No)**
추적/광고 식별자/제3자 데이터 결합 전혀 없음. ATT 프롬프트 불필요.

### "Data Linked to You" (계정에 연결되어 수집)
모두 목적 = **App Functionality** (서비스 제공·동기화). 광고/추적 목적 없음.

| Apple 데이터 카테고리 | 구체 항목 | 출처 | 비고 |
|---|---|---|---|
| **Contact Info** | Email Address | Google/Apple 로그인 | Apple "Hide My Email" 시 relay 주소 |
| **Contact Info** | Name | Google 로그인(프로필 이름) | Apple은 id_token에 이름 미제공 → Apple 사용자는 미수집 |
| **Identifiers** | User ID | Supabase user id | 계정 식별 |
| **User Content** | Other User Content (할 일·습관·목표·카테고리·메모·태그) | 사용자 입력 | 동기화 대상 |

### "Data Not Linked to You" → **없음**

### 판단 보류 / 선택 항목
- **Purchases (구매 내역)**: 앱이 `user_subscriptions`의 plan 플래그(free/pro)를 **읽음**. 단 구매는 web Toss에서 발생하고 iOS는 entitlement만 읽는 수준 → **목록 미포함 권장**(인앱 구매 없음). 보수적으로 넣고 싶으면 "Purchases / App Functionality, Linked"로 추가 가능.

---

## 2. 앱 메타데이터 (한국어)

- **App Name (표시명)**: `Just Do` (번들 표시명과 일치)
- **Subtitle (부제, ≤30자)**: `할 일·습관·목표를 한 곳에`
- **Primary Category**: 생산성 (Productivity)
- **Secondary Category**: 라이프스타일 (선택)
- **Age Rating**: 4+ (유해 콘텐츠 없음)
- **Copyright**: `© 2026 [운영자/사업자명]`

### Promotional Text (≤170자)
> 할 일과 습관을 캘린더 한 화면에서 관리하고, 목표 진행률은 자동으로 채워집니다. 매달·매년 돌아보는 리포트와 홈 화면 위젯까지 — Just Do.

### Description (설명)
```
Just Do는 할 일, 습관, 목표를 한 곳에서 관리하는 개인 생산성 앱입니다.

■ 캘린더 중심의 할 일 관리
- 날짜를 탭하면 그날의 할 일과 습관을 바로 확인하고 추가합니다.
- 시간 포함/미포함, 카테고리, 우선순위까지 간단하게 설정합니다.

■ 습관 트래킹
- 매일 또는 요일별 습관을 만들고 체크하세요.
- 스트릭과 달성률로 꾸준함을 한눈에.

■ 목표와 자동 진행률
- 이번 달·올해 지켜보고 싶은 방향을 목표로 적으면,
  관련된 할 일의 완료가 진행률에 자동으로 반영됩니다.
- 진행률은 직접 조작할 수 없어 실제 실행을 정직하게 보여줍니다.

■ 돌아보는 리포트
- 매달, 매년이 끝나면 활동 요약과 목표별 흐름을 리포트로 돌아봅니다.

■ 홈 화면 · 잠금 화면 위젯
- 오늘의 할 일과 습관을 위젯에서 바로 체크합니다.

■ 안전한 동기화
- Apple 또는 Google로 로그인하면 기기 간 데이터가 동기화됩니다.

* 일부 고급 기능(Pro)은 추후 제공되는 별도 정책에 따릅니다.
```

### Keywords (≤100자, 쉼표 구분, 공백 없이)
```
할일,투두,투두리스트,습관,목표,플래너,캘린더,루틴,일정,체크리스트,생산성,다이어리,갓생,위젯
```

### URLs
- **Support URL**: `https://www.justdo.co.kr`
- **Marketing URL**: `https://www.justdo.co.kr`
- **Privacy Policy URL**: `https://www.justdo.co.kr/privacy`

---

## 3. 스크린샷

- **필수**: iPhone 6.9" (예: iPhone 16 Pro Max) — 1320×2868 또는 2868×1320.
  6.7"만 올려도 통과하지만 6.9" 권장.
- iPhone 전용 앱으로 제출하므로 iPad 스크린샷은 불필요.
- 현재 생성된 6.9" 업로드 후보:
  - `app-store-screenshots/01-calendar-flow.png` — 캘린더 중심 홈 + 오늘 할 일 흐름.
  - `app-store-screenshots/02-add-goals-flow.png` — 오늘 할 일 확인 후 Task 입력.
  - `app-store-screenshots/03-review-flow.png` — 오늘/마감 기준으로 할 일 정리.
  - `app-store-screenshots/04-goals-flow.png` — 목표별 진행률과 실행 흐름.
- 추가 후보가 필요하면 위젯 컷 1장을 5번째로 추가 가능.

---

## 4. App Review 메모 (리뷰어용 — 리젝 예방 핵심)

```
- 로그인은 Sign in with Apple 또는 Google OAuth만 제공합니다.
  심사 시 "Sign in with Apple"로 바로 로그인하실 수 있습니다.
  별도 데모 계정이 필요하면 아래 Google 테스트 계정을 사용하세요.
  Google demo account: kangym071900@gmail.com
  Password: <App Store Connect 제출 시에만 입력>

- 구독(Pro) 안내: 본 앱은 인앱 결제(IAP)를 포함하지 않습니다.
  Pro 기능은 당사 웹사이트(justdo.co.kr)에서 별도로 구독한 사용자의
  계정에 한해 제공되는 멀티플랫폼 서비스이며, 앱 내에는 어떠한 구매 흐름이나
  외부 결제 링크도 없습니다. (Guideline 3.1.1 관련)

- 위젯: 홈/잠금 화면 위젯에서 할 일 완료·습관 체크가 가능합니다.
```

> Google 데모 계정 비밀번호는 문서/저장소에 남기지 말고 App Store Connect 제출
> 화면의 Review Notes에만 입력.

---

## 5. 개인정보처리방침 페이지 (web 호스팅 완료)

> 2026-06-14 `apps/web`에 `/privacy` 및 `/terms` 라우트 추가 완료.
> 2026-06-16 운영 배포 후 `https://www.justdo.co.kr/privacy` 및
> `https://www.justdo.co.kr/terms` 200 응답 확인. App Store Connect에는
> `https://www.justdo.co.kr/privacy`를 입력하면 됨. 아래는 현재 hosted 페이지와
> 일치하는 최소 고지 내용 — 제출 전 필요 시 법무 검토.

```
개인정보처리방침 (Just Do)

1. 수집 항목
- 계정 정보: Apple 또는 Google 로그인 시 제공되는 이메일 주소, (Google의 경우)
  프로필 이름, 서비스 내 사용자 식별자.
- 서비스 데이터: 사용자가 입력한 할 일, 습관, 목표, 카테고리, 메모, 태그 및
  앱 설정.

2. 이용 목적
- 로그인 및 계정 식별, 기기 간 데이터 동기화, 위젯 표시, 사용자 설정 유지 등
  서비스 제공 목적으로만 사용합니다.

3. 제3자 제공 및 추적
- 법령에 따른 경우를 제외하고 사용자 정보를 제3자에게 제공하지 않습니다.
- 광고·분석을 위한 추적이나 광고 식별자 수집을 하지 않습니다.

4. 위탁/저장
- 데이터는 클라우드 인프라(Supabase)에 저장되며, 서비스 제공을 위한 범위에서만
  처리됩니다.

5. 보관 및 삭제
- 데이터는 서비스 이용 기간 동안 보관되며, 계정/데이터 삭제 요청 시 처리됩니다.

6. 문의
- 개인정보 관련 문의: kang071911@gmail.com

시행일: 2026-06-14
```

---

## 6. 빌드/제출 체크리스트 (요약)

- [x] iPad 지원 여부 결정 → iPhone 전용 `1` (2026-06-14)
- [x] `ITSAppUsesNonExemptEncryption = NO` Info.plist 추가 (2026-06-14)
- [x] 인앱 약관/방침 텍스트 Apple 로그인 반영 갱신 (2026-06-14)
- [x] `/privacy` (+`/terms`) 페이지 생성·연락처 입력·운영 배포 완료 (2026-06-16)
- [x] 앱 아이콘 alpha 제거 (1024 PNG RGB)
- [x] 스크린샷 6.9" 포스터 PNG 생성
- [x] 데모 계정 발급 + seed data 동기화
- [x] App Store Connect 심사 메모에 데모 계정 입력 (비밀번호는 App Store Connect에만 저장)
- [x] Archive → App Store Connect 업로드 → TestFlight 내부 테스트 설치
- [ ] TestFlight smoke + 수정 필요 항목 반영
- [ ] Public App Review 제출
- [ ] 최종 실기기 시각 smoke (구독 그룹 변경 포함)
