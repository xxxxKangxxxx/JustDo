# iOS Phase 6 Status

This document summarizes the current native iOS Phase 6 state, remaining
implementation gaps, and checks to run before testing or shipping.

## Current Implementation

- `JustDoShared` mirrors the web domain model and local mutation queue schema.
- Core Data mirror is implemented for categories, tasks, habits, goals, goal
  prompt dismissals, and queued mutations.
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
  tags/task_tags, habits, habit logs, goals, goal prompt dismissals, and
  `user_subscriptions`. Subscription rows map `plan_name='pro'` plus
  `status in ('trial', 'active')` to the local settings plan `pro`;
  inactive/cancelled/free states map to `free`.
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
- App deep links open the matching task/habit edit sheet for:
  - `justdo://task/<task-id>`
  - `justdo://habit/<habit-id>`
- The app registers the `justdo` URL scheme and resolves rows from the Core
  Data mirror before presenting the editor sheet.
- `JustDoAppUITests` covers task and habit deep-link editor-sheet opening with a
  DEBUG-only local mirror seed path.
- Pushed task/habit detail screens have been removed. Task/Habit app deep links
  resolve rows from the Core Data mirror and open the same editor sheets used by
  the native add/edit flows. Saves apply to the Core Data mirror and enqueue
  `taskUpsert` / `habitUpsert`; task deletes enqueue `taskDelete`.
- Settings includes an app-facing sync status row. It shows syncing, synced,
  pending mutation count, and failed states; failed syncs expose a retry action.
- The signed-in root shell currently renders native Home / Stats / Settings tabs
  based on `reference/proto/`, but the 2026-06-01 product IA decision changes
  the next target structure:
  - Settings moves out of the bottom tab bar and into a Home top-right icon.
  - The standalone Stats tab is removed; stats fold into Goal & Pro Report's
    report/activity-summary experience.
  - The bottom bar remains for continuity with a single centered Home tab.
  - Future bottom-bar expansion is reserved for `함께` friendship/scheduling,
    not for Stats.
- The Home tab includes the month calendar, the home header (Just Do
  wordmark + year/month navigation + today/add buttons), and the bottom tab bar.
- The Home calendar keeps date cells free of dot indicators; tasks are shown by
  horizontal bars with title text. Day cells fill the full row height so the
  tap target is the entire cell, not just the date pill; task bars sit above
  the cell with `.allowsHitTesting(false)` so taps still reach the cell button.
- Selected-day data is shown in a bottom sheet modal triggered by tapping a
  date. The sheet uses `.height(500)` plus `.large` detents so the task editor
  can fit inside the panel while still keeping the default footprint moderate.
  Drag-down and background tap dismiss the sheet via the iOS sheet defaults.
- In the selected-day sheet, Task row taps open `TaskDetailEditor` inline inside
  the same sheet. Habit row taps intentionally do nothing; only the habit check
  control mutates the selected date's habit log because full habit settings live
  in the dedicated Habit management surface.
- Just Do Mode in the selected-day sheet has local `오늘만` / `이 날까지` state
  separate from Settings. `settings.justDoMode` and subscription entitlement
  only decide whether `이 날까지` is available. Pro users with the setting enabled
  can still switch back to `오늘만`; when the setting is off, `이 날까지` is locked
  and disabled.
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
- Settings exposes the Goal & Pro Report management entry point:
  - Settings → 목표 opens a large native sheet with annual and current-month
    sections.
  - Each period supports up to five goals.
  - Goal cards show period label, title, note, completed/related/slipped counts,
    donut progress with centered percentage, and a `고정/열림` lock badge.
  - The card lock badge directly toggles locked state and queues a goal save.
  - Card tap opens editor for unlocked goals and shows a confirmation alert for
    locked goals.
  - Goal add/edit uses a centered dialog, not a nested bottom sheet; deleting an
    existing goal now requires a destructive confirmation alert.
  - Goal prompt flows cover onboarding, monthly, and yearly prompts with
    persisted dismissal state.
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
  Verified on iPhone 14 Pro / iOS 26.5 via 1-hour close-and-relaunch smoke
  on 2026-05-25. Watch item: `AuthViewModel.reload()` and
  `AppSyncCoordinator.validAppSession()` both refresh through the same
  `KeychainSupabaseSessionStore`, so a foreground entry can fire two refresh
	  calls in quick succession; the 2026-05-25 smoke did not surface this, but
	  if Supabase refresh-token rotation later breaks one of them, serialize
	  the store access or unify the refresh path.
- **iOS Settings stayed Free after hosted subscription was Pro.** Web reflected
  `user_subscriptions.plan_name='pro'` / `status='active'`, but iOS still showed
  Free after reinstall because the native read-sync path only loaded preferences
  from `public.users.preferences` and never read `user_subscriptions`. Fix:
  `SupabaseSnapshotClient.fetchAppSnapshot()` now fetches subscription rows and
  maps `pro + trial/active` to `settings.plan = "pro"`. Core Data snapshot
  replacement persists that raw `plan` preference, and snapshot loading restores
  it before Settings renders. Tests cover both Pro and inactive subscription
  mapping.
- **Manual Pro SQL failed on `trial_end_at`.** A direct upsert attempted to set
  `trial_end_at = null`, but hosted `user_subscriptions.trial_end_at` is NOT
  NULL, producing PostgreSQL `ERROR 23502`. Fix for future manual testing:
  preserve the existing non-null `trial_end_at` or insert a far-future non-null
  value for test accounts. Do not use `trial_end_at = null` in manual Pro
  upserts.
- **Just Do Mode sheet got stuck on `이 날까지`.** The first iOS implementation
  treated the Settings toggle as the selected-day sheet's current display mode.
  That made Pro users with Just Do Mode enabled see only due-by tasks. Fix:
  Settings/entitlement now gate availability only, while the sheet owns local
  `isShowingJustDoMode` state. Pro users can switch between `오늘만` and
  `이 날까지`; if the setting is off, `이 날까지` shows a lock icon and is disabled.
- **Task/Habit detail route mismatch.** The app still had pushed detail pages
  after the product direction moved edit behavior to sheet UI. Fix: remove the
  pushed detail screens and route Home/deep-link edits through existing editor
  sheets. Home task edits happen inline inside the selected-day sheet with
  delete support. Habit rows in the date sheet no-op except for the check
  control; full habit settings stay in the Habit management surface.
- **Goal sync failed with `goals_check1`.** Hosted migration was applied, but
  iOS goal sync failed with PostgreSQL `23514` because unlocked goal upserts
  omitted `locked_at`, allowing a previous non-null value to remain while
  `locked=false`. Fix: goal mutation encoding now explicitly sends
  `locked_at: null` and `note: null` for nil optionals. Regression test added
  in `SupabaseRestSyncTests`; user confirmed the sync error is resolved.

## Remaining App Gaps

- Real-device visual verification (iPhone 14 Pro / iOS 26.5):
  - [x] Auth landing — passed after `.preferredColorScheme(.light)` fix.
  - [x] Home calendar / panel — passed after the bottom-sheet redesign,
    cell-tap expansion, and the calendar/sheet swipe gestures.
  - [x] Add Sheet (Task / Habit) — passed after top-aligned entry layout,
    wheel DatePicker schedule sheet, optional `시간 포함` toggle, and
    selected-day sheet dismissal before editor presentation.
  - [x] Task editor sheet / Stats — passed after aligning task edit UI with
    Add Sheet, preserving selected Home date after toggles, fixing Stats year
    formatting, category zero counts, and 7-day Habit cell labels.
  - [x] Settings — passed after account/profile, notification/display picker,
    data export/reset, and legal document fixes.
  - [x] Widget — passed enough to keep current layout after home/lock screen
    widget density, tap behavior, count, and lock-screen rectangular fixes.
- Goal & Pro Report focused smoke:
  - [x] Hosted migration state confirmed through `supabase migration list`.
  - [x] Sync error after goal write fixed and user-confirmed.
  - [x] Settings → 목표 UI latest visual iteration accepted by user.
  - [x] Verify lock badge tap does not also trigger card edit.
  - [x] Verify add/edit/delete/lock changes survive app relaunch and cloud sync.
  - [x] Delete confirmation implemented for the goal editor.
  - [ ] Decide report entry UX now that card tap is reserved for edit.
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
> `AuthViewModel.reload()` async + `ContentView` scenePhase reload로 fix됨.
> iPhone 14 Pro / iOS 26.5에서 1시간+ 종료 후 재진입 smoke 통과 확인.
>
> 2026-05-22: iOS 실기기 검증이 본격 시작됨. Home + Auth landing +
> Add Sheet + Task Detail edit + Stats + Settings + Widget 보정까지 통과.
> 2026-05-25: 세션 자동 refresh smoke까지 통과.
> 2026-05-29: Pro subscription sync, editor-sheet routing cleanup, Just Do Mode
> gating follow-up까지 simulator build/shared tests 통과. 같은 날 iPhone 14 Pro
> iOS 26.5 최종 smoke에서 Smoke 1~5 정상 확인.
> 2026-05-30: Goal & Pro Report iOS first pass와 실기기 UI 피드백 반영 완료.
> Settings → 목표 focused smoke는 사용자 확인 완료. 삭제 확인 alert도 반영됨.
> 2026-06-01: 제품 IA 결정 반영 예정. Settings는 Home 우측 상단으로 이동,
> Stats 독립 탭은 리포트/활동 요약으로 흡수, 하단 바는 단기적으로 Home 단일
> 탭 중앙 배치, 미래 확장은 `함께` 탭으로 예약. 다음 차례는 이 구조 반영,
> 기간 종료 리포트 배너, Web 태그 UX, TestFlight/App Store 준비.

- [x] **iOS 최종 실기기 smoke (2026-05-29 통과)**.
  - 환경: `강영모의 iPhone` / iOS 26.5, bundle id `kr.justdo.app`.
  - 설치/실행: `xcodebuild` 실기기 Debug build 통과,
    `xcrun devicectl device install app` 설치 성공,
    `xcrun devicectl device process launch` 실행 성공.
  - Smoke 1~3: 기본 진입, Pro 플랜 표시, Just Do Mode ON/OFF gate,
    `오늘만`/`이 날까지` 전환, Task inline edit/delete, Habit row no-op +
    check 동작 정상.
  - Smoke 4~5: selected-day sheet `+`의 기본 날짜 동작, Widget task/habit
    toggle 및 mutation/sync, lock-screen widget row tap 동작 정상.

- [x] **Goal & Pro Report iOS first pass (2026-05-30 반영)**.
  - Settings → 목표 sheet, annual/monthly card stacks, max 5 goals per period.
  - Goal onboarding guide + annual/monthly entry, one initial active row,
    swipe-delete rows, memo input, keyboard dismissal.
  - Centered goal add/edit dialog with delete left of save and destructive
    confirmation before removal.
  - Goal cards with title/note/metrics/donut progress/lock badge.
  - Lock badge direct toggle; card tap still controls edit/locked confirmation.
  - Supabase goal sync error (`goals_check1`) fixed and user-confirmed.

- [ ] **iOS IA/report-entry follow-up (2026-06-01 결정)**.
  - Move Settings from bottom tab to Home top-right icon.
  - Remove standalone Stats tab from the bottom bar.
  - Keep a bottom bar with a single centered Home tab for continuity.
  - Fold existing Stats content into report/activity-summary surfaces.
  - Add Home top report banner when a previous month/year report becomes
    available.
  - Add smaller Settings → 목표 supporting report banners near the matching
    annual/monthly sections.
  - Reserve future bottom-bar slot for `함께` friendship/scheduling.
  - `swift test --package-path apps/ios` passed with 46 tests.
  - `xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme
    JustDoApp -destination 'generic/platform=iOS' build` passed.

- [x] **세션 자동 refresh 실기기 smoke (2026-05-25 통과)**.
  - 시나리오: 정상 로그인 → 앱 종료(또는 백그라운드 보내기) → 1시간+ 대기 →
    다시 열기.
  - 결과: 로그인 루트 화면 없이 홈으로 바로 진입 확인. `AuthViewModel.reload()`
    의 async refresh + `ContentView` scenePhase reload 경로가 의도대로 동작.
  - Watch item: `AuthViewModel.reload()` /
    `AppSyncCoordinator.validAppSession()`의 동시 refresh 호출이 Supabase
    refresh-token rotation과 충돌할 가능성은 이번 smoke에서 증상으로
    드러나지 않았음. 추후 unexpected sign-out이 보이면 sessionStore 접근
    직렬화 또는 refresh 경로 일원화 follow-up 진행.

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
- [x] **Task editor sheet / Stats 시각 검증**.
  - Reference: `reference/proto/stats-settings.jsx`.
  - 반영/검증 완료:
    - Task editor UI를 Add Sheet와 같은 wheel DatePicker / chip /
      footer 스타일로 정렬.
    - Task editor의 완료 토글 제거. 완료 상태는 기존 값 보존.
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
