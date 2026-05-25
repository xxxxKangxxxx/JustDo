# iOS Phase 6 Status

This document summarizes the current native iOS Phase 6 state, remaining
implementation gaps, and checks to run before testing or shipping.

## Current Implementation

- `JustDoShared` mirrors the web domain model and local mutation queue schema.
- Core Data mirror is implemented for categories, tasks, habits, and queued
  mutations.
- App Group storage is implemented for:
  - `widget_snapshot.json`
  - `mutation_queue.jsonl`
- WidgetKit home-screen small, medium, and large layouts are implemented.
  A separate lock-screen widget configuration supports inline, circular, and
  rectangular accessory families.
- Widget task/habit actions are interactive:
  - task complete/uncomplete
  - habit check/uncheck for the selected date
- Home-screen widgets default to Task mode across small, medium, and large
  sizes. The widget header exposes a Task/Habit toggle and shows completion
  progress scoped to the active mode: Task mode counts only tasks and Habit mode
  counts only habits. Completed items are pushed below incomplete items within
  the displayed list. Small / medium / large widget bodies are top-aligned so
  mode changes affect the remaining lower space instead of shifting the header
  area.
- Home-screen widget rows toggle completion from the whole row. Row text no
  longer deep-links into detail from the widget.
- Lock-screen rectangular widgets are Task-only, show task `completed/total`,
  and display up to two task rows. Lock-screen inline/circular widgets also use
  Task-mode data.
- App lifecycle widget refresh uses the current local date for the widget
  snapshot. The previous prototype date fallback (`2026-04-30`) has been
  removed from launch / foreground refresh.
- Widget actions optimistically update `widget_snapshot.json`, append App Group
  mutations, and request a timeline reload.
- The app drains App Group widget mutations into Core Data and preserves them in
  `CDQueuedMutation`.
- App and widget task completion toggles use a compact
  `task_completion_set` mutation. Supabase flush patches only
  `tasks.is_completed` and `tasks.completed_at`, clearing `completed_at` when a
  task is reopened instead of sending a full task upsert.
- When a valid Supabase session exists, the app flushes `CDQueuedMutation` to
  Supabase and removes rows only after successful remote writes.
- Supabase read-sync refreshes the Core Data mirror from categories, tasks,
  tags/task_tags, habits, and habit logs.
- Native Supabase PKCE OAuth is implemented with Keychain-backed session
  storage and refresh-token handling.
- `AuthViewModel.reload()` (UI status binding) is `async` and, when it finds
  an expired stored session, calls `SupabaseAuthClient.refreshSession(...)` to
  refresh access/refresh tokens, then re-saves into Keychain and keeps
  `status = .signedIn`. HTTP 400/401 from the refresh endpoint clears Keychain
  and falls through to `.signedOut`; transient failures (network, server)
  keep the user signed in using the stored profile so the UI does not drop
  the session unnecessarily.
- `ContentView` subscribes to `@Environment(\.scenePhase)` and re-runs
  `auth.reload()` whenever the scene transitions to `.active`, so a
  background → foreground return refreshes the token automatically instead of
  surfacing the auth landing for users who never explicitly signed out.
- App deep links still route pushed detail screens for:
  - `justdo://task/<task-id>`
  - `justdo://habit/<habit-id>`
- The app registers the `justdo` URL scheme and renders native task/habit detail
  screens from the Core Data mirror.
- Deep-linked task/habit screens are pushed with a SwiftUI `NavigationStack`
  route instead of being rendered inline on the root scaffold.
- `JustDoAppUITests` covers task and habit deep-link detail opening with a
  DEBUG-only local mirror seed path.
- Pushed task/habit detail screens support local edit and delete actions. Saves
  apply to the Core Data mirror and enqueue `taskUpsert` / `habitUpsert`; deletes
  enqueue `taskDelete` / `habitDelete` and return to the previous screen.
- Settings includes an app-facing sync status row. It shows syncing, synced,
  pending mutation count, and failed states; failed syncs expose a retry action.
- The signed-in root shell now renders native Home / Stats / Settings tabs
  based on `reference/proto/`.
- The Home tab includes the month calendar, the home header (Just Do
  wordmark + year/month navigation + today/add buttons), and the bottom tab bar.
- The Home calendar keeps date cells free of dot indicators; tasks are shown by
  horizontal bars with title text. Day cells fill the full row height so the
  tap target is the entire cell, not just the date pill; task bars sit above
  the cell with `.allowsHitTesting(false)` so taps still reach the cell button.
- Selected-day data is shown in a bottom sheet modal triggered by tapping a
  date. The sheet uses a single `.height(420)` detent (no large expansion);
  the panel content scrolls internally when it overflows. Drag-down and
  background tap dismiss the sheet via the iOS sheet defaults.
- Horizontal swipes inside the sheet move `selectedDate` by ±1 day
  (`JDDate.addDays`). Horizontal swipes on the calendar move the displayed
  month by ±1 (`moveMonth`). Both use `simultaneousGesture` so cell taps
  and the sheet's inner `ScrollView` keep working.
- Auth landing is locked to light mode via `.preferredColorScheme(.light)`
  so the cream radial gradient and brand styling stay consistent even under
  iOS-wide dark mode. The signed-in shell still respects the Settings
  dark-mode toggle.
- The add flow uses a partial-height bottom sheet with Task/Habit modes,
  task date/time/category/priority fields, and habit emoji entry.
- Settings owns dark-mode control. The home header no longer has a separate
  dark/light button.
- Settings exposes habit and category management entry points.
- Settings account rows use the signed-in Google profile name when available,
  with account detail actions for profile review, account switch, sign-out, and
  withdrawal entry points.
- Settings notification/display rows persist notification enabled, notification
  time, dark mode, and week-start preferences. Data export is Pro-gated CSV,
  reset-all-data is wired to local delete mutations, and basic Terms / Privacy
  sheets are available.
- Core Data mirror operations are serialized on the context queue, and
  snapshot/upsert paths update existing rows in place where possible.

## Resolved Issues

- **Launch crash after signed-in sync.** The app could terminate on launch with
  Core Data exceptions such as `Collection <__NSCFSet> was mutated while being
  enumerated`, followed by an `EXC_BAD_ACCESS` in habit updates. Root cause:
  overlapping app lifecycle sync tasks used the same `viewContext` while the
  store was deleting and re-inserting objects during snapshot replacement and
  upsert. Fix: public Core Data store methods now run through
  `context.performAndWait`, snapshot replacement reconciles existing rows, and
  category/task/habit/queued mutation upserts update existing managed objects.
- **Dark mode split control.** The home header toggle and settings toggle had
  separate local states. Fix: settings owns the single `isDarkMode` binding,
  and the home header button was removed.
- **Add sheet height.** The add sheet previously used a full-height `.large`
  detent. Fix: it now uses a partial-height detent and proto-like bottom-sheet
  layout.
- **Auth session dropped after access-token expiry.** Closing the app for an
  hour or longer and reopening it showed the auth landing, even though the
  stored refresh token was still valid. Root cause: `AuthViewModel.reload()`
  flipped to `.signedOut` the moment `SupabaseStoredSession.isExpired()`
  returned `true`, with no refresh attempt, and `ContentView` only ran
  `reload()` from `.task` so background → foreground transitions did not
  trigger another reload either. Fix: `reload()` is now async and refreshes
  via `SupabaseAuthClient.refreshSession(...)` before signing the user out
  (transient errors keep the user signed in; HTTP 400/401 clears Keychain),
  and `ContentView` watches `scenePhase` to re-run `reload()` on `.active`.
  Pending follow-up: `AuthViewModel.reload()` and
  `AppSyncCoordinator.validAppSession()` both refresh through the same
  `KeychainSupabaseSessionStore`, so a foreground entry can fire two refresh
  calls in quick succession; if Supabase refresh-token rotation breaks one of
  them, serialize the store access or unify the refresh path.

## Remaining App Gaps

- Real-device visual verification (2026-05-22 in progress on iPhone 14 Pro
  iOS 26.5):
  - [x] Auth landing — passed after `.preferredColorScheme(.light)` fix.
  - [x] Home calendar / panel — passed after the bottom-sheet redesign,
    cell-tap expansion, and the calendar/sheet swipe gestures.
  - [x] Add Sheet (Task / Habit) — passed after top-aligned entry layout,
    wheel DatePicker schedule sheet, optional `시간 포함` toggle, and
    selected-day sheet dismissal before Detail navigation.
  - [x] Task Detail edit / Stats — passed after aligning task edit UI with
    Add Sheet, preserving selected Home date after toggles, fixing Stats year
    formatting, category zero counts, and 7-day Habit cell labels.
  - [x] Settings — passed after account/profile, notification/display picker,
    data export/reset, and legal document fixes.
  - [x] Widget — passed enough to keep current layout after home/lock screen
    widget density, tap behavior, count, and lock-screen rectangular fixes.
- App icon: only the light (default) 1024x1024 variant is shipped. Dark
  and tinted home-screen variants are deferred until dedicated artwork
  is produced.

## Before Manual Testing

- Confirm `apps/ios/JustDoApp/Config/Local.xcconfig` exists locally and contains:
  - `JUSTDO_SUPABASE_URL`
  - `JUSTDO_SUPABASE_ANON_KEY`
- Confirm Supabase Auth URL Configuration includes:
  - `justdo://auth-callback`
- Confirm the signing setup in Xcode:
  - Apple Account in `Xcode > Settings > Accounts` shows the Developer Team
    (the Personal Team label disappears once the Developer Team is active;
    Sign Out / Sign In if the dropdown only shows Personal Team).
  - All three targets (`JustDoApp`, `JustDoWidgetExtension`,
    `JustDoAppUITests`) are bound to that Developer Team with automatic
    signing.
  - Bundle identifiers must remain on the `kr.justdo.app` namespace
    (`kr.justdo.app`, `kr.justdo.app.widget`, `kr.justdo.app.uitests`).
    Do not revert to `com.justdo.app` — that identifier is taken in
    Apple's global App ID registry.
  - App Group entitlement on both app and widget points at
    `group.kr.justdo.app`.
- Build the app target:

```bash
xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build
```

- Build for a paired physical device (replace the destination name with the
  actual device name from Xcode):

```bash
xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'platform=iOS,name=<device-name>' build
```

- Run shared tests:

```bash
cd apps/ios
swift test
```

## Manual Test Checklist

- Signed-out root shell:
  - Expected: auth landing matches `reference/proto/auth.jsx`.
  - Expected: Apple, Google, Kakao, and email buttons match
    `reference/proto/auth-button.jsx` styling and icons.
- Sign in with Google.
- Signed-in root shell:
  - Expected: app switches to the calendar home screen based on
    `reference/proto/home.jsx`.
  - Expected: month header, calendar grid, selected-day panel, task/habit rows,
    and bottom tab bar render without overlap.
  - Expected: task bars render with title text and no separate date-cell dots.
  - Expected: dragging the selected-day panel top area upward expands only the
    panel; dragging it down returns it to default height. The calendar itself
    does not scroll with the task/habit list.
  - Expected: home header has a `+` add button only; dark mode is controlled
    from Settings.
  - Expected: `+` opens a partial-height bottom sheet, not a full-screen sheet.
  - Expected: Settings > 다크모드 changes the whole app color scheme.
- Manage data from Settings:
  - Expected: Settings > 습관 관리 supports add/delete.
  - Expected: Settings > 카테고리 관리 supports add/delete.
- Check Settings > 데이터 > 동기화:
  - Expected: synced, syncing, pending, and failed states render in Settings only.
  - Expected: failed state shows a retry button and keeps pending local changes.
- Launch app on simulator.
- Confirm the app writes a Keychain session and refreshes the widget snapshot.
- Add the widget to the simulator home screen.
- Confirm widget header date matches the current local date.
- Confirm widgets open in Task mode by default and show current-day tasks first.
- Confirm the Task/Habit toggle switches the visible list without changing
  widget size.
- Confirm small widget uses compact color-dot mode controls instead of clipped
  text labels.
- Confirm small, medium, and large widgets keep header/calendar/control content
  top-aligned when switching between Task and Habit.
- Confirm the progress label uses the active mode's `completed/total`
  formatting: Task mode counts tasks only, Habit mode counts habits only.
- Confirm completed task/habit rows move below incomplete rows.
- Tap a task check dot in the widget.
  - Expected: widget updates optimistically.
  - Expected: app foreground drains App Group queue.
  - Expected: Supabase `tasks.is_completed` updates after queue flush.
- Tap a habit check dot in the widget.
  - Expected: widget updates optimistically.
  - Expected: Supabase `habit_logs` row is inserted for value `1`.
  - Expected: Supabase `habit_logs` row is deleted for value `0`.
- Tap any part of a task/habit row in the home-screen widget.
  - Expected: the row toggles completion/check state optimistically.
  - Expected: the app does not open detail from widget row text.
- Relaunch app and widget.
  - Expected: remote read-sync preserves flushed changes.

## Before Deployment

- Move real production Supabase values into deployment/build settings, not
  `Local.xcconfig`.
- Confirm `Local.xcconfig` remains gitignored and is not staged.
- Confirm release build has non-empty `JUSTDO_SUPABASE_URL` and
  `JUSTDO_SUPABASE_ANON_KEY` in the generated app Info.plist.
- Confirm Associated Domains are not needed for the current custom-scheme
  deep-link approach. If universal links are added later, add associated domains
  and hosted apple-app-site-association configuration.
- Confirm App Group entitlement `group.kr.justdo.app` exists for both app and
  widget extension in the Apple Developer portal for the release bundle IDs.
- For web deployment and custom domain work, follow
  `docs/deployment_domain_aws_plan.md`.
- Run hosted OAuth/offline sync verification once before declaring v1 sync
  stable. Last passed: 2026-05-20 against hosted Supabase.

## Next Work

> 2026-05-25: 운영 도메인 신규 Google 가입 차단 버그(handle_new_auth_user
> 트리거 ON CONFLICT 매치 실패)는 마이그레이션
> `supabase/migrations/20260525090000_categories_user_name_unique.sql`로 hosted
> 적용 완료, 신규 가입 검증 정상.
> iOS 세션이 1시간+ 종료 후 재진입 시 로그인 화면을 다시 띄우던 문제는
> `AuthViewModel.reload()` async + `ContentView` scenePhase reload로 fix.
> 실기기 1시간+ 종료 → 재진입 smoke가 다음 검증 항목이며 통과 후 commit.
>
> 2026-05-22: iOS 실기기 검증이 본격 시작됨. Home + Auth landing +
> Add Sheet + Task Detail edit + Stats + Settings + Widget 보정까지 통과.
> 다음 차례는 문서/커밋 정리 후 잔여 실기기 smoke와 Toss 외부 의존 트랙.

- [ ] **세션 자동 refresh 실기기 smoke (2026-05-25 추가)**.
  - 시나리오: 정상 로그인 → 앱 종료(또는 백그라운드 보내기) → 1시간+ 대기 →
    다시 열기.
  - 기대: 로그인 루트 화면 없이 홈으로 바로 진입. 콘솔에 refresh 호출 로그
    또는 sync 동작 확인.
  - 통과 시: 미커밋 변경(`AuthViewModel.swift`, `ContentView.swift`)을
    `feat(ios): auto-refresh auth session on foreground` 형태로 commit.
  - 실패 시: `AuthViewModel.reload()` /
    `AppSyncCoordinator.validAppSession()`의 동시 refresh 호출에 의한
    refresh-token rotation 충돌 의심 → sessionStore 접근 직렬화 또는 refresh
    경로 일원화 follow-up 진행.

- [x] **Add Sheet 시각 검증**.
  - Reference: `reference/proto/sheet-detail.jsx` (PAddSheet).
  - 반영/검증 완료:
    - Task / Habit 입력 영역은 Add Sheet 상단에 고정.
    - 시작/종료 날짜 선택은 텍스트 입력 대신 wheel `DatePicker` sheet 사용.
    - `시간 포함` 소형 커스텀 토글로 날짜만 저장하거나 시작 시간을 함께 저장.
    - Date Picker font/scale을 축소해 앱 sheet 디자인에 맞춤.
    - Calendar selected-day sheet에서 Detail 진입 시 기존 sheet dismiss.
    - `xcodebuild -project JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp
      -destination 'generic/platform=iOS Simulator' build` passed.
- [x] **Task Detail edit / Stats 시각 검증**.
  - Reference: `reference/proto/stats-settings.jsx`.
  - 반영/검증 완료:
    - Task Detail 편집 UI를 Add Sheet와 같은 wheel DatePicker / chip /
      footer 스타일로 정렬.
    - Task Detail 편집 화면의 완료 토글 제거. 완료 상태는 기존 값 보존.
    - Calendar selected-day sheet에서 다른 날짜 항목을 체크해도 해당 날짜 유지.
    - Stats 연월 `2026`이 `2,026`처럼 보이는 포맷 문제 수정.
    - Task 카테고리 통계에서 0개 카테고리를 1개로 보정하지 않도록 수정.
    - Habit 최근 7일 영역은 각 셀 안에 요일만 표시.
    - `xcodebuild -project JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp
      -destination 'generic/platform=iOS Simulator' build` passed.
    - `swift test` passed with 40 tests.
- [x] **Settings 시각 검증**.
  - Reference: `reference/proto/stats-settings.jsx`.
  - 반영/검증 완료:
    - Google 로그인 프로필 이름 표시, 계정 상세 sheet, 로그아웃 위치 변경.
    - 알림 토글/시간 picker, 다크모드, 캘린더 시작 요일 picker.
    - 습관/카테고리 관리 tap area 및 font scale 보정.
    - Pro-gated CSV export, 전체 데이터 초기화, 이용약관/개인정보처리방침.
- [x] **Widget 실기기 검증**.
  - Small / medium / large 3 사이즈 모두 홈 스크린에 추가.
  - Task / Habit mode 토글 동작.
  - 홈 화면 widget row 전체 탭으로 task complete / habit check.
  - Task/Habit mode별 `completed/total` 표시.
  - 잠금 화면 accessory widget 분리 및 rectangular Task-only 표시.
  - Widget tap으로 task complete / habit check 시
    `task_completion_set` mutation이 Supabase에 patch되는지(App
    foreground 시 flush).

### 미루는 항목 (별도 트랙)

- **Dark / Tinted app icon variants**. 현재 단일 light 1024 PNG만 있어서
  iOS 18+ 다크 / 단색 모드에서는 light icon이 자동 dim / monochrome 처리됨.
  Polished 디자인이 도착하면 `Contents.json`에 dark/tinted entry 추가.
- **앱 아이콘 화질 polish**. 단일 1024 PNG에서 모든 home-screen 사이즈를
  자동 생성하다 보니 약간 soft하게 보임. 2048+ master에서 redraw 또는
  explicit multi-size 제공 시점은 v1 App Store 심사 직전.
- **Phase 7 완료 후 hosted offline sync verification 회귀**. 이미 2026-05-20
  통과했지만 새 UI(이번 home redesign 등) 위에서 한 번 더 검증 권장.
