# TestFlight Smoke Checklist

Updated: 2026-06-20

Purpose: validate TestFlight internal build 1 before deciding whether to submit
the iOS v1 build for public App Review.

## Test Setup

- Device: real iPhone with the TestFlight build installed.
- Build: App Store Connect / TestFlight internal build 1.
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
  - goal/report surfaces open from the current iOS IA.
- App Review-visible surfaces have no in-app purchase CTA or external payment
  link.

## Smoke Path

Current progress:

- [x] 1. Install and Launch — passed on 2026-06-20.
- [ ] 2. Apple Sign-In — next starting point.

### 1. Install and Launch

- [x] Open the TestFlight build.
- [x] Confirm the app launches without crash.
- [x] Confirm no debug-only placeholder or stale test copy is visible.

Result:

```text
Status: PASS
Notes: User confirmed basic TestFlight build 1 launch.
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
Status:
Notes:
```

### 3. Google Demo Sign-In

- [ ] Sign out.
- [ ] Sign in with the Google demo account.
- [ ] Confirm the app lands on Home.
- [ ] Confirm the seeded demo data syncs in.

Result:

```text
Status:
Notes:
```

### 4. Home and Calendar

- [ ] Move between dates in the calendar.
- [ ] Open a day with existing tasks/habits.
- [ ] Confirm Today / selected-day content is readable and not clipped.
- [ ] Confirm the bottom bar still only shows the centered Home tab.
- [ ] Open Settings from the Home top-right icon and close it.

Result:

```text
Status:
Notes:
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
Status:
Notes:
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
Status:
Notes:
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
Status:
Notes:
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
Status:
Notes:
```

### 9. Settings and Subscription Copy

- [ ] Open Settings.
- [ ] Confirm account state and sign-out are clear.
- [ ] Confirm Terms and Privacy screens mention Apple or Google login.
- [ ] Confirm the subscription section has no `Pro로 업그레이드` row, no purchase
  button, and no external payment link.
- [ ] Confirm Just Do Mode gating copy does not route to purchase.

Result:

```text
Status:
Notes:
```

### 10. Widget

- [ ] Add the Just Do widget to the Home Screen or Lock Screen.
- [ ] Confirm today's tasks/habits render.
- [ ] Toggle one task or habit from the widget.
- [ ] Open the app and confirm the widget mutation is reflected.
- [ ] Return to the widget and confirm it refreshes after app foregrounding.

Result:

```text
Status:
Notes:
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
Status:
Notes:
```

## Issue Log

Use this format for every failure or suspicious behavior.

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

## Release Decision

- [ ] PASS: submit current build for public App Review.
- [ ] FIX REQUIRED: patch, upload a new TestFlight build, and rerun affected
  sections.
- [ ] HOLD: defer App Review for Toss/business/payment-readiness reasons even if
  the build passes.

Decision:

```text
Status:
Reason:
Next action:
```
