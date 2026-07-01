# TestFlight Smoke Checklist

Updated: 2026-07-01

Purpose: validate TestFlight internal build 6 follow-ups before deciding whether
to submit the iOS v1 build for public App Review.

## Test Setup

- Device: real iPhone with the TestFlight build installed.
- Build: App Store Connect / TestFlight internal build 6 after processing and
  TestFlight attachment.
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
Status: PASS WITH KNOWN ISSUE
Notes: User confirmed Goal Management entry/close, add, target save/denominator update, lock/unlock, locked-card confirmation, unlocked-card edit/save, delete confirmation/delete, and Settings/Home return on build 5. H-004 remains: task completion did not update goal progress immediately; patch is included in uploaded build 6 and needs verification.
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
Status: PASS WITH FOLLOW-UP
Notes: User confirmed Home Screen widget add, widget item display, widget task/habit toggle, app reflection after opening, and widget refresh after app foregrounding. H-005 follow-up identified: widget mutations are queued locally and flushed when the app foregrounds/refreshes; uploaded build 6 adds a 3-second pending-sync retry loop while the app is active.
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
Notes: Patched in uploaded build 6 by changing GoalManagementSheet semantic-match refresh from count-only to a data-derived key that includes goal text/target, task title/tags/completion/date, and habit log changes. Needs build 6 affected-section verification after processing/TestFlight install.
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
Notes: Not an App Review blocker for build 5 because local widget feedback and app reflection after foreground work. Patched in uploaded build 6 with app-side 3-second pending-sync retry while active; larger future option is immediate widget-extension upload when session/network are available.
```

## Release Decision

- [ ] PASS: submit current build for public App Review.
- [ ] FIX REQUIRED: patch, upload a new TestFlight build, and rerun affected
  sections.
- [ ] HOLD: defer App Review for Toss/business/payment-readiness reasons even if
  the build passes.

Decision:

```text
Status: FIX REQUIRED
Reason: Build 5 smoke passed the full checklist, and build 6 has been uploaded with H-004, H-005, web/iOS pending-sync retry, and account nickname editing changes. Those changes still need TestFlight verification before App Review submission.
Next action: Wait for build 6 processing, attach/install it through internal TestFlight, then rerun affected sections: Goal Management progress refresh, Widget/sync retry, Settings account nickname editing, and a short offline/pending-sync check.
```
