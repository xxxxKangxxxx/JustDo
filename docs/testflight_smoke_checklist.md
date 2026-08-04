# TestFlight Smoke Checklist

Updated: 2026-08-02

Purpose: validate TestFlight internal build 11 regressions before deciding whether
to submit the iOS v1 build for public App Review.

## Test Setup

- Device: real iPhone with the TestFlight build installed.
- Build: App Store Connect / TestFlight build 11, installed and launched on the
  real device on 2026-08-02.
- Network: start online. Run one short offline check near the end.
- Accounts:
  - Apple Sign-In: primary review path.
  - Google demo account: `kangym071900@gmail.com` as fallback.
- Do not record the demo account password in this repository.

## Pass Criteria

- No crash, forced sign-out, blank screen, or unrecoverable loading state.
- Authentication works with Apple and Google demo account.
- Core data created on device syncs to Supabase and survives app relaunch.
- Recent high-risk UI changes behave correctly:
  - full-screen task/habit editors do not push the Home header under the keyboard.
  - habit add supports recur days and reminder time.
  - Home calendar/list segmented control is readable and stable.
  - widget Task/Habit toggle colors can be changed from Settings.
  - goal/report surfaces open from the current iOS IA.
- App Review-visible surfaces have no in-app purchase CTA or external payment
  link.

## Smoke Path

Current progress:

- [x] 1. Install and Launch — build 1 passed on 2026-06-20; build 3 installed on 2026-06-24.
- [x] 2. Apple Sign-In — passed on build 3, 2026-06-24.
- [x] 3. Google Demo Sign-In — passed on build 3, 2026-06-24.
- [x] 4. Home and Calendar — passed on build 4; H-001 verified.
- [x] 5. Task Add and Edit — passed on build 3, 2026-06-24.
- [x] 6. Habit Add and Edit — passed on build 5; H-002 and H-003 verified.
- [x] 7. Goal Management — passed on build 5 except H-004 known issue for build 6 verification.
- [x] 8. Report Entry — passed on build 5, 2026-07-01.
- [x] 9. Settings and Subscription Copy — passed on build 5, 2026-07-01.
- [x] 10. Widget — passed on build 5 with H-005 build 6 follow-up.
- [x] 11. Short Offline Check — passed on build 5, 2026-07-01.
- [x] 12. Build 9 Sheet Presentation — passed on build 10, 2026-07-25.
- [x] 13. Build 10 Notifications and Large Widget — remaining checks passed on
  build 11.
- [x] 14. Build 11 Consolidated Regression — passed on 2026-08-04.
- [ ] 15. Build 12 Calendar, Notification Copy, and Holidays — uploaded;
  processing in App Store Connect.

### 1. Install and Launch

- [x] Open the TestFlight build.
- [x] Confirm the app launches without crash.
- [x] Confirm no debug-only placeholder or stale test copy is visible.

Result:

```text
Status: PASS
Notes: User confirmed build 3 processed and was attached to internal TestFlight.
```

### 2. Apple Sign-In

- [ ] Sign out first if the app is already authenticated.
- [ ] Tap Sign in with Apple.
- [ ] Complete the native Apple sign-in sheet.
- [ ] Confirm the app lands on Home.
- [ ] Kill and relaunch the app.
- [ ] Confirm the session is still valid and Home opens directly.

Result:

```text
Status: PASS
Notes: User confirmed Apple login succeeded on TestFlight build 3.
```

### 3. Google Demo Sign-In

- [ ] Sign out.
- [ ] Sign in with the Google demo account.
- [ ] Confirm the app lands on Home.
- [ ] Confirm the seeded demo data syncs in.

Result:

```text
Status: PASS
Notes: User confirmed Google demo login succeeded, Home opened, seeded demo data appeared, and no issues were observed.
```

### 4. Home and Calendar

- [ ] Move between dates in the calendar.
- [ ] Toggle Home between `캘린더` and `리스트`.
- [ ] Confirm the segmented control is directly below the logo/settings header
  and the active state uses the app accent color.
- [ ] In `리스트`, confirm selected-date tasks are grouped by category and
  active habits are visible.
- [ ] Open a day with existing tasks/habits.
- [ ] Confirm Today / selected-day content is readable and not clipped.
- [ ] Confirm the bottom bar still only shows the centered Home tab.
- [ ] Open Settings from the Home top-right icon and close it.

Result:

```text
Status: PASS
Notes: User confirmed calendar/list toggle, control placement/color, list date movement, category grouping, habits, clipping, bottom bar, and Settings entry/close on build 3. Issue H-001 was patched in build 4 and user confirmed the month/date sync behavior.
```

### 5. Task Add and Edit

- [ ] Add a task from Home.
- [ ] Focus the title field and show the keyboard.
- [ ] Confirm the Home header behind the editor does not move into the status bar.
- [ ] Set date/time, category, priority, and tags if visible.
- [ ] Save.
- [ ] Reopen the task editor.
- [ ] Edit the title or date/time and save.
- [ ] Delete or complete the test task.
- [ ] Kill and relaunch, then confirm the expected final state persists.

Result:

```text
Status: PASS
Notes: User confirmed task add, keyboard/header stability, date/time/category/priority/tag settings, save, edit, complete/delete, and relaunch persistence on TestFlight build 3.
```

### 6. Habit Add and Edit

- [ ] Add a habit from the Habit tab in the add flow.
- [ ] Set emoji.
- [ ] Change recurrence from daily to weekly.
- [ ] Select one or more weekdays.
- [ ] Set a reminder time.
- [ ] Clear the reminder time and set it again.
- [ ] Save.
- [ ] Reopen the habit editor and confirm recurrence/reminder values persisted.
- [ ] Focus a text field and confirm keyboard behavior is stable.

Result:

```text
Status: PASS
Notes: User confirmed habit add and emoji setting on build 3. Issue H-002 was patched in build 4 and user confirmed the selected-day sheet and Home List habit edit entry. H-003 was patched in build 5; user confirmed habit editor opens, reminder row is button-style, wheel time picker opens, selected time is reflected, clear works, and saved value persists after reopening.
```

### 7. Goal Management

- [ ] Open Settings.
- [ ] Open `목표`.
- [ ] Add a monthly goal.
- [ ] Add or edit a target value if visible.
- [ ] Lock and unlock a goal using the card lock badge.
- [ ] Tap a locked card and confirm the destructive/unlock confirmation behavior.
- [ ] Edit an unlocked goal.
- [ ] Delete a test goal and confirm the delete alert appears before removal.
- [ ] Close Goal management and return to Settings/Home cleanly.

Result:

```text
Status: PASS
Notes: User confirmed Goal Management entry/close, add, target save/denominator update, lock/unlock, locked-card confirmation, unlocked-card edit/save, delete confirmation/delete, and Settings/Home return on build 5. H-004 immediate progress refresh passed on build 6 and passed a light regression check again on build 8.
```

### 8. Report Entry

- [ ] Confirm the Home report banner appears when the seeded demo period has an
  available report.
- [ ] Open the report from the Home banner.
- [ ] Confirm report sections scroll and text is readable.
- [ ] Open Settings -> 목표 and confirm the smaller report entry works there too.
- [ ] Confirm Free/Pro gating copy is informational only and does not show a
  purchase CTA or external payment link.

Result:

```text
Status: PASS
Notes: User confirmed Home report banner appears, report opens from Home, report sections scroll with readable text, Settings -> 목표 supporting report entry works, and no purchase CTA or external payment link was visible in Free/Pro gating copy.
```

### 9. Settings and Subscription Copy

- [ ] Open Settings.
- [ ] Confirm account state and sign-out are clear.
- [ ] Open Settings -> Display -> `위젯 토글 색상`.
- [ ] Change Task/Habit colors with swatches or `#RRGGBB` hex input and confirm
  the sheet saves/returns cleanly.
- [ ] Confirm Terms and Privacy screens mention Apple or Google login.
- [ ] Confirm the subscription section has no `Pro로 업그레이드` row, no purchase
  button, and no external payment link.
- [ ] Confirm Just Do Mode gating copy does not route to purchase.

Result:

```text
Status: PASS
Notes: User confirmed account state/sign-out clarity, Settings -> Display -> 위젯 토글 색상 entry, Task/Habit color changes, clean return, Terms/Privacy login mention, no Pro upgrade row, no purchase button, no external payment link, and Just Do Mode gating does not route to purchase.
```

### 10. Widget

- [ ] Add the Just Do widget to the Home Screen or Lock Screen.
- [ ] Confirm today's tasks/habits render.
- [ ] Toggle one task or habit from the widget.
- [ ] Open the app and confirm the widget mutation is reflected.
- [ ] Return to the widget and confirm it refreshes after app foregrounding.

Result:

```text
Status: PASS
Notes: User confirmed Home Screen widget add, widget item display, widget task/habit toggle, app reflection after opening, and widget refresh after app foregrounding. Build 8 regression verification also confirmed the widget change synced after app foregrounding and remained after relaunch.
```

### 11. Short Offline Check

- [ ] Turn on Airplane Mode.
- [ ] Create or complete one low-risk task/habit.
- [ ] Confirm the UI updates locally.
- [ ] Turn network back on.
- [ ] Foreground the app and wait for sync.
- [ ] Kill/relaunch and confirm the final state remains correct.

Result:

```text
Status: PASS
Notes: User confirmed Airplane Mode, offline low-risk task/habit change, immediate local UI update, network restore, foreground wait, kill/relaunch, and final state persistence on build 5.
```

### 12. Build 9 Sheet Presentation

- [x] Open account detail and confirm nickname editing remains usable.
- [x] Open Task start/end date and time pickers from add and edit flows.
- [x] Open Task reminder controls and custom reminder pickers.
- [x] Open Habit reminder-time pickers.
- [x] Open Settings notification-time, week-start, and widget-color sheets.
- [x] Open a selected calendar day with tasks/habits.
- [x] Open Settings `습관`, nested `습관 관리`, `목표`, and
  `카테고리 관리`.
- [x] Confirm each surface uses the same large-sheet position as Terms/Privacy.
- [x] Confirm no bottom corner or underlying screen is visible below the sheet.
- [x] Confirm close, complete, cancel, save, scrolling, and keyboard behavior.
- [x] Tap `데이터 내보내기` and confirm its sheet appears immediately above
  Settings without returning to Home.
- [x] Share the generated CSV and dismiss the sheet.

Result:

```text
Status: PASS
Notes: Build 8 reproduced the detached-bottom presentation in every affected compact sheet and delayed data-export presentation until Settings was dismissed. On 2026-07-25, the user confirmed on TestFlight build 10 that account detail and nickname editing work correctly, the large-sheet presentation is clean, no underlying screen or bottom corner is exposed, and keyboard/save/close behavior is usable. Task add/edit start and end date/time pickers, Task reminder modes, custom reminder selection, saved-value persistence, untimed-Task guidance, and related sheet presentation also passed. Habit reminder time clear/reset/persistence, Settings briefing time, independent notification toggles, week-start selection, and widget-color save/persistence passed as well. The selected-day sheet and Settings Habit, nested Habit Management, Goal, and Category Management surfaces passed large-sheet placement, bottom coverage, controls, scrolling, keyboard, and return-navigation checks. Data export presented immediately above Settings, the CSV was shareable, and dismissal returned cleanly to Settings.
```

### 13. Build 10 Notifications and Large Widget

- [x] On first authenticated Home entry, confirm the app explanation appears
  before the iOS notification permission prompt.
- [x] Deny permission once, then confirm Settings -> `알림 설정` shows the
  system Settings shortcut while preserving the selected toggles.
- [x] Confirm `아침 브리핑`, `일정 알림`, and `습관 알림` are independent.
- [x] Change the briefing time.
- [x] Change the default Task reminder from 10 minutes.
- [x] Create timed and untimed Tasks and confirm the warning text and
  `기본값 / 직접 설정 / 없음` options; select up to three custom reminders.
- [x] Confirm the morning briefing includes both timed and untimed Tasks.
- [x] Complete a Task in the app and confirm the five-second banner appears.
- [x] Confirm the completion banner can be dismissed and shows the next timed
  schedule, remaining count, or all-complete/tomorrow copy as appropriate.
- [x] Confirm completing a Task in the widget does not show an in-app banner.
- [x] Confirm a Habit notification arrives at its configured exact time.
- [x] Create two Habits at the same weekday/time and confirm they appear in one
  merged notification.
- [x] Confirm the merged Habit notification does not include emoji.
- [x] Complete one Habit before the reminder time and confirm it is omitted.
- [x] Tap a Task or Habit system notification and confirm Home opens on its
  target date; while the app is foregrounded, confirm an in-app banner appears.
- [x] Add the Large widget and verify weekday headers, the real month start
  position, faint adjacent-month dates without dots, and a single dot for any
  Task/Habit including completed-only dates.
- [x] Check representative 4-, 5-, and 6-row months and confirm the lower list
  shows at most 7, 6, and 5 items respectively without `외 N개`.

Result:

```text
Status: PASS
Notes: Build 10 uploaded successfully on 2026-07-24. On 2026-07-25, the user confirmed the TestFlight update and passed the app-explanation/system-permission ordering, denied-permission Settings shortcut, toggle preservation and permission recovery, independent notification toggles, briefing-time change, and timed/untimed Task reminder-mode checks including up to three custom reminders. The five-second completion banner appeared after completing a Task in the app, used situation-appropriate copy, and could be dismissed manually. Completing a Task in the widget updated the app state without incorrectly showing the in-app completion banner. On 2026-07-26, the user confirmed that a Habit notification arrived at the configured exact time; Habit reminders do not use the Task default lead offset. On 2026-07-28, the user confirmed that two Habits at the same time appeared together in one merged notification, the notification did not include Habit emoji, and a Habit completed before the reminder was omitted so only the incomplete Habit arrived. On 2026-08-02, the user confirmed that tapping a Task/Habit system notification opened Home on the target date and that a notification arriving while the app was foregrounded appeared as an in-app banner. Build 11 verification confirmed timed and untimed briefing coverage, changed default reminder delivery, and all Large-widget visuals. The August six-row Large widget capped its list at five items; deterministic tests cover the four- and five-row 7/6-item limits. Latest local verification passed 90 Swift tests, 146 web tests, and the app/widget Release build.
```

### 14. Build 11 Consolidated Regression

- [x] Install TestFlight build 11 and confirm the app opens with existing data.
- [x] Confirm a schedule-only notification title is `다음 일정`.
- [x] Set briefing and a timed Task reminder to the same minute; confirm the
  merged notification does not repeat that Task.
- [x] Confirm the same briefing still includes another incomplete timed Task and
  an incomplete untimed Task.
- [x] Change the default Task reminder from 10 minutes and confirm a Task using
  `기본값` fires at the changed offset.
- [x] Open Habit edit and confirm `취소`/`저장` are right-aligned and reminder
  time is displayed only to `HH:mm`.
- [x] Add more than four Tasks for today; confirm the Medium widget shows at
  most four items and no `+N` overflow label.
- [x] Confirm the dedicated Home List still exposes all Tasks beyond the
  calendar limit.
- [x] Confirm the selected-day sheet still exposes all Tasks beyond the
  calendar limit.
- [x] Finish Large widget visual checks and representative four-/five-row month
  limits; the August six-row/five-item case already passed on build 10.
Result:

```text
Status: PASS WITH BUILD 12 FOLLOW-UP
Notes: Build 11 was archived and uploaded successfully on 2026-08-02, then installed and launched on the real device with existing data intact. The user confirmed Habit edit action buttons are right-aligned, reminder time is shown without seconds, and the display remains correct after save/reopen. Medium correctly shows at most four items without `+N`. A briefing arrived normally, and a schedule-only Task notification used the corrected `다음 일정` title. A same-minute briefing and Task reminder arrived as one notification: the scheduled `test` Task appeared once in the schedule sentence, while the other timed/untimed `test2` and `test3` Tasks remained in the two-item briefing summary. A Task using the changed default reminder correctly arrived five minutes before its scheduled time. The Home `리스트` view and selected-day sheet both continue to show every Task beyond the calendar display limit. Large widget weekday/date placement, adjacent-month styling, activity dots, and completed-only dots all passed; deterministic tests cover its four-/five-row limits and August's six-row/five-item limit passed on-device. Home calendar build 11 showed the bounded layout, but the user requested a clearer revision: four Task lanes plus a dedicated fifth `+N` summary lane; patched locally for the next consolidated build. Korean public-holiday coloring was then added locally for Home and widget calendars. Latest local verification passed 90 Swift tests and the generic iOS Release app/widget build.
```

### 15. Build 12 Calendar, Notification Copy, and Holidays

- [ ] Install TestFlight build 12 and confirm the app opens with existing data.
- [ ] Add more than four overlapping Tasks to one Home calendar date; confirm
  four Task lanes are followed by a fixed fifth `+N` summary lane.
- [ ] Confirm briefing title/body use `일정 브리핑` and the concise
  `오늘 할 일 N개 · 다음 일정 HH:mm ‘Task’` format.
- [ ] Confirm a schedule-only notification title is only `HH:mm` and its body
  uses the concise `‘Task’ 일정이 있어요.` format.
- [ ] Confirm Korean public holidays use red dates in Home calendar and
  Medium/Large widgets, including `광복절` on August 15 and its substitute
  holiday on August 17; Task/Habit dots must remain visible.

Result:

```text
Status: UPLOADED — PROCESSING
Notes: Build 12 was archived and uploaded successfully on 2026-08-04. The archive contains app and widget version 1.0 (12), bundle IDs `kr.justdo.app` and `kr.justdo.app.widget`. Pre-upload verification passed 90 Swift tests, Release archive validation, and `git diff --check`. App Store Connect reported `Uploaded package is processing`.
```

## Issue Log

Use this format for every failure or suspicious behavior.

```text
ID: H-001
Severity: medium
Area: Home / List month navigation
Steps: In Home List mode, select 2026-06-24, then move the displayed month from June to July.
Expected: The selected date moves to 2026-07-24. If the same day does not exist in the target month, use the target month's last day.
Actual: The displayed month moved but the selected date remained on the previous month/day.
Screenshot or screen recording: Not needed; user described the behavior during TestFlight build 3 smoke.
Reproducible: Yes, from user smoke.
Notes: Patched in uploaded build 4 by updating moveMonth(_:) to also update selectedDate with day clamping. User verified on build 4.
```

```text
ID: H-002
Severity: high
Area: Habit edit entry / selected-day sheet
Steps: Open a selected-date sheet, then tap a habit row.
Expected: The habit row opens the habit editor, matching task row edit behavior.
Actual: Tapping the habit row did not open an editor; only the check control was interactive.
Screenshot or screen recording: Not needed; user reported during TestFlight build 3 smoke.
Reproducible: Yes, from user smoke.
Notes: Patched in uploaded build 4 by adding habit edit state to SelectedDayPanel, wiring HabitGroupSection/HabitRow open callbacks, and also enabling habit row edit from Home List. User verified on build 4.
```

```text
ID: H-003
Severity: medium
Area: Habit edit reminder time UI
Steps: Open a habit editor and inspect the reminder-time row.
Expected: Reminder time uses the same wheel-sheet style as the task/add flow, with a button value, picker sheet, and clear action.
Actual: Build 4 still used a raw HH:MM text field in the habit editor.
Screenshot or screen recording: Not needed; user requested the refinement during build 4 smoke.
Reproducible: Yes.
Notes: Patched locally by replacing the raw TextField with a button that opens TimePickerSheet and keeps the existing clear action.
```

```text
ID:
Severity: blocker / high / medium / low
Area:
Steps:
Expected:
Actual:
Screenshot or screen recording:
Reproducible:
Notes:
```

```text
ID: H-004
Severity: medium
Area: Goal Management / progress refresh
Steps: Create or edit a monthly goal with a target, create a related task, complete the task, then check the goal card progress.
Expected: The goal card progress updates immediately after the related task completion is reflected locally.
Actual: The target denominator updated correctly, and the related task eventually changed progress, but the progress did not refresh immediately after completion.
Screenshot or screen recording: Not needed; user reported during build 5 Goal Management smoke.
Reproducible: Yes, from user smoke.
Notes: Patched in build 6 by changing GoalManagementSheet semantic-match refresh from count-only to a data-derived key that includes goal text/target, task title/tags/completion/date, and habit log changes. Passed on build 6 and passed a light regression check on build 8.
```

```text
ID: H-005
Severity: low
Area: Widget / sync timing
Steps: Toggle a task or habit from the Home Screen widget and observe backend sync timing without reopening/foregrounding the app.
Expected: Ideally, widget mutations would reach Supabase immediately when network/session are available, or at least clearly flush on app foreground.
Actual: Build 5 widget actions optimistically update the App Group widget snapshot and append `mutation_queue.jsonl`. The app drains and flushes this queue during launch/foreground widget refresh, so server sync may wait until the app is opened/foregrounded/refreshed.
Screenshot or screen recording: Not needed; user reported during build 5 widget smoke.
Reproducible: Expected from current architecture.
Notes: Not an App Review blocker for build 5 because local widget feedback and app reflection after foreground work. Patched in build 6 with app-side 3-second pending-sync retry while active. Build 8 regression verification passed, including persistence after relaunch.
```

```text
ID: H-006
Severity: medium
Area: iOS sheet presentation
Steps: Open account, date/time, notification-time, week-start, widget-color, data-export, or selected-day sheets on build 8.
Expected: The sheet uses the same bottom-attached presentation as Terms and Privacy, with no underlying screen visible below it.
Actual: The compact sheet appeared detached from the bottom edge and exposed the underlying screen below its rounded bottom corners.
Screenshot or screen recording: User supplied a build 7 account-sheet screenshot and confirmed the same behavior across build 8 affected sheets.
Reproducible: Yes, on build 8 real device.
Notes: Build 9 replaces the affected fixed-height detents with large sheets and also aligns Habit, Habit Management, Goal, and Category Management presentation. Pending TestFlight verification.
```

```text
ID: H-007
Severity: medium
Area: Settings / data export presentation
Steps: Open Settings and tap 데이터 내보내기 with a Pro tester account.
Expected: The CSV share sheet appears immediately above Settings.
Actual: No sheet appeared until Settings was closed and Home became visible.
Screenshot or screen recording: Not needed; user reported during build 8 smoke.
Reproducible: Yes, on build 8 real device.
Notes: Build 9 moves export-file sheet state from HomeRootView to SettingsRootTabView. Pending TestFlight verification.
```

```text
ID: H-008
Severity: medium
Area: Notifications / briefing and schedule merge
Steps: Create one timed Task whose on-time reminder fires at the configured briefing minute, then wait for the notifications on build 10.
Expected: The briefing and same-minute schedule reminder merge into one notification without repeating the same Task. A schedule-only notification title reads `다음 일정`.
Actual: The build 10 merged notification described the same timed Task once as today's work and again as a timed schedule. Schedule-only notification titles read `일정 안내`.
Screenshot or screen recording: User supplied a real-device Notification Center screenshot on 2026-07-25.
Reproducible: Yes; covered by a deterministic planner test.
Notes: Included in uploaded build 11 and passed real-device verification on 2026-08-04. A same-minute briefing and schedule reminder arrived as one notification; the scheduled `test` Task appeared only once, while the other timed/untimed `test2` and `test3` Tasks remained in the briefing summary. The schedule-only `다음 일정` title also passed separately.
```

```text
ID: H-009
Severity: low
Area: Habit editor / action alignment and reminder-time display
Steps: Open an existing synced Habit whose Supabase `reminder_at` value includes seconds.
Expected: `취소` and `저장` are right-aligned, and the reminder time is displayed at minute precision (`HH:mm`).
Actual: The action buttons were left-aligned, and the raw Supabase time could display seconds (`HH:mm:ss`).
Screenshot or screen recording: Not needed; user reported during build 10 notification smoke.
Reproducible: Yes, from the current layout and Supabase `time` response shape.
Notes: Included in uploaded build 11. Habit editor actions are right-aligned; existing editor state and Supabase Habit mapping normalize reminder times to `HH:mm`. Pending build 11 real-device verification.
```

```text
ID: H-010
Severity: medium
Area: Medium widget / Home month calendar density
Steps: Add more than five Tasks for the same date, then inspect the Medium widget and the Home month calendar.
Expected: Medium shows at most four Task rows and relies on its existing completion/total counts without a separate `+N`; Home shows at most four Task bars and uses a fixed fifth row for the additional count as `+N`.
Actual: The Medium widget allowed six rows, and Home calendar week rows continued growing as overlapping Task lanes were added.
Screenshot or screen recording: Not needed; user reported during build 10 regression testing on 2026-08-02.
Reproducible: Yes, from the current item-limit and calendar row-height logic.
Notes: Medium behavior passed on build 11: visible items are limited to four with no separate overflow label. The Home calendar follow-up is included in uploaded build 12: lanes are compacted per week, four Task bars are shown, and a dedicated fifth lane displays the per-date `+N` count. Dedicated list and selected-day views remain unrestricted. Pending build 12 real-device verification for the revised Home layout.
```

```text
ID: H-011
Severity: low
Area: Notifications / briefing and schedule copy
Steps: Receive a briefing merged with a same-minute Task schedule reminder.
Expected: The notification communicates today's count and next schedule concisely without repeating full `예정되어 있습니다` sentences. Briefing title is `일정 브리핑`; a schedule-only title is the Task time in `HH:mm` only.
Actual: Build 11 correctly merged delivery and removed duplicate Task content, but concatenated two long sentences and repeated `예정되어 있습니다`; briefing title remained `오늘의 할 일`.
Screenshot or screen recording: Not needed; user reported during build 11 regression testing on 2026-08-04.
Reproducible: Yes; message output is covered by deterministic planner tests.
Notes: Included in uploaded build 12 using the selected compact format. Examples: `오늘 할 일 3개 · 다음 일정 14:00 ‘팀 회의’`; schedule-only title `14:00` with body `‘팀 회의’ 일정이 있어요.` Swift tests passed: 90 tests. Pending build 12 real-device verification.
```

```text
ID: H-012
Severity: low
Area: Home calendar and widgets / Korean public holidays
Steps: Inspect a Korean public holiday in Home calendar and Medium/Large widgets.
Expected: Current-month public holidays use red date styling while Task/Habit activity dots remain independent; holiday names are available to accessibility.
Actual: Calendars only distinguished weekends and did not identify national public holidays.
Screenshot or screen recording: Not needed; user requested the calendar enhancement after build 11 Large-widget verification on 2026-08-04.
Reproducible: Yes; calendar display models previously contained no holiday metadata.
Notes: Included in uploaded build 12. The shared offline calendar covers fixed, lunar, substitute, election, and announced temporary holidays, including the 2026 Labor Day and Constitution Day law changes. Home, Medium, and Large calendar dates share the result. Swift tests passed: 90 tests; generic iOS Release app/widget archive passed. Pending build 12 real-device verification.
```

## Release Decision

- [ ] PASS: submit current build for public App Review.
- [x] FIX REQUIRED: patch, upload a new TestFlight build, and rerun affected
  sections.
- [ ] HOLD: defer App Review for Toss/business/payment-readiness reasons even if
  the build passes.

Decision:

```text
Status: AWAITING BUILD 12 VALIDATION
Reason: Build 11 regression checks passed. Build 12 containing H-010's revised Home overflow presentation, H-011's concise notification copy, and H-012's Korean public-holiday display uploaded successfully and is processing.
Next action: Install TestFlight build 12 after processing and run section 15.
```
