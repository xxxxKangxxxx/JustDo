# App Store Submission Next Steps

Updated: 2026-09-09

## Current Release Candidate Plan

> **2026-09-08 pre-submission audit: HOLD. Do not submit build 15.** The final
> device smoke passed, but source inspection found a placeholder-only account
> deletion action, a non-public Support URL/contact path, and a hard-coded
> in-app version (`1.0.2`) that does not match the submitted `1.0`. These require
> fixes and a new build 16. The screenshot files also need RGB/no-alpha
> flattening before submission. See
> `docs/app_store_pre_submission_audit_2026-09-08.md`.

- TestFlight build 15 was uploaded successfully at 2026-09-06 17:13 KST,
  processed, installed, and passed its targeted real-device verification on
  2026-09-07. The selected-day holiday name/red date treatment and ordinary
  Sunday red-date behavior display correctly.
- Build 15 contains the build 14 full-free policy, H-015 monthly List
  today-scroll, and H-016 schedule-only notification body changes in addition
  to the latest holiday/detail-sheet fix.
- Full-free implementation batches A-E and the Batch F local verification gate
  are complete: Web/iOS features no longer depend on legacy subscription state,
  purchase UI is removed, Web billing mutation routes are hard-disabled, and
  public copy is aligned. Commit `f0e584c` is live on production Web and every
  billing mutation route returns unconditional `410 billing_disabled` with
  unchanged billing-data aggregates. The production EventBridge billing
  schedule was confirmed and disabled on 2026-08-24. The existing production
  account passed the full-free device check on build 14; deterministic tests
  cover no-row and legacy subscription states. Follow
  `docs/full_free_launch_plan.md` for the implementation record.
- The candidate scope is frozen. Do not add unrelated product features,
  destructive schema changes, auth/sync redesign, or live-billing work.
- Build 15 is the frozen candidate. H-016 notification delivery passed on
  2026-09-08. Continue the final App Review-visible smoke on this installed
  build; do not upload another build unless it finds a release-critical defect.
- 2026-08-21 post-conversion verification passed: 98 Swift tests, 148 Web tests,
  Web ESLint, Web production build, generic iOS Release app/widget build, and
  5/5 iOS simulator UI tests including Free Settings/export access.
- 2026-08-24 build 14 preflight passed: 98 Swift tests, 149 Web tests, Web
  ESLint, `git diff --check`, and a signed generic iOS Release app/widget build.
  The expanded Free/legacy-plan UI scenarios are reserved for real-device
  TestFlight verification as requested; no new simulator run was used for this
  candidate.
- 2026-09-08 verification refresh passed: 153 Web tests, Web ESLint, 98 Swift
  Package tests, and `git diff --check`.

## Remaining Submission Actions

1. Configure the implemented account-deletion route with the server-only Apple
   credentials, deploy it, and run disposable Google/Apple account deletion
   checks plus the local-data verification in `docs/account_deletion_runbook.md`.
2. Deploy the implemented public `/support` page and verify it signed out; on a
   device, confirm the new iOS Settings customer-support row opens it.
3. Confirm Settings shows the bundle-derived version/build in the build 16
   device smoke.
4. Flatten the App Store screenshots to RGB/no-alpha and reupload them.
5. Run the full gate, bump every target to build 16, archive/upload, and rerun
   the affected real-device smoke.
6. Rotate and verify the Google demo password, replace App Review Notes, select
   build 16 for iOS version 1.0, and submit only after the release decision is
   changed to PASS.

## Ready Assets

- App name: `Just Do`
- Subtitle: `할 일·습관·목표를 한 곳에`
- Privacy Policy URL: `https://www.justdo.co.kr/privacy`
- Support URL: `https://www.justdo.co.kr/support` after the new public page is
  deployed; do not submit with the authenticated root URL.
- Marketing URL: `https://www.justdo.co.kr`
- Demo Google account: `kangym071900@gmail.com`
- Screenshot PNGs:
  - `app-store-screenshots/01-calendar-flow.png`
  - `app-store-screenshots/02-add-goals-flow.png`
  - `app-store-screenshots/03-review-flow.png`
  - `app-store-screenshots/04-goals-flow.png`
- The 6.9-inch and 6.5-inch screenshot sets were visually audited on
  2026-08-21 and contain no Pro/Trial/price/purchase/subscription surface.

Do not store the demo account password in this repository or screenshots. Enter
it only in the dedicated App Review login-information password field.

## App Store Connect Input Order

1. Create or open the iOS app record.
2. Fill App Information:
   - Category: Productivity
   - Secondary category: Lifestyle, optional
   - Age rating: 4+
3. Fill Pricing and Availability.
4. Fill App Privacy:
   - Tracking: No
   - Data linked to user: email address, name, user ID, user content
   - Purpose for all listed data: App Functionality
5. Fill version metadata using `docs/app_store_listing_draft.md`.
6. Upload the four screenshot PNGs under the 6.9-inch iPhone slot.
7. Under App Review Information, enable login required and enter the Google
   demo credentials in the dedicated login-information fields. Then add Review
   Notes:
   - Sign in with Apple is available.
   - Google demo account is available as fallback.
   - All current features are free.
   - The iOS app has no IAP, subscription, purchase flow, external payment link,
     paid entitlement, or purchase CTA.
8. Select processed build 16 for iOS version 1.0 after the required fixes and
   focused TestFlight verification.
9. Submit for review only after the release decision is PASS.

## Historical TestFlight Timeline

- Internal TestFlight build 1 is installed.
- Build 2 was uploaded to App Store Connect on 2026-06-23 via
  `xcodebuild -exportArchive` after Xcode Organizer's Distribute flow returned
  an App Store Connect 500 error.
- Build 3 was uploaded to App Store Connect on 2026-06-24 via
  `xcodebuild -exportArchive` for the Home segmented-control placement/color
  tweak and widget color picker sheet.
- Build 3 finished processing and was attached to internal TestFlight on
  2026-06-24.
- Build 4 was archived and uploaded to App Store Connect on 2026-06-24. It
  includes the TestFlight smoke fixes for Home List month navigation and habit
  row edit entry.
- Build 4 finished processing, was attached to internal TestFlight, and was
  installed on 2026-06-24.
- Build 5 was archived and uploaded to App Store Connect on 2026-06-25. It
  includes the habit edit reminder-time wheel-sheet refinement found during
  build 4 smoke.
- Build 5 finished processing, was attached to internal TestFlight, installed,
  and the habit edit reminder-time refinement was verified on 2026-06-25.
- Build 6 was archived and uploaded to App Store Connect on 2026-07-01. It
  includes the build 5 smoke follow-ups for immediate Goal Management progress
  refresh, active pending-sync retry on iOS and web, and iOS account nickname
  editing.
- Build 6 was installed and targeted validation resumed on 2026-07-16. H-004
  Goal Management immediate progress refresh passed, but pending-sync automatic
  retry failed: after a Goal add, sync entered failed state and did not retry
  automatically; manual `다시 시도` completed sync. Release decision for build 6
  remains FIX REQUIRED.
- Build 7 was archived and uploaded to App Store Connect on 2026-07-16. It
  includes the pending-sync automatic retry self-cancel fix, capped retry for
  failed sync states with pending mutations, and the account-detail sheet height
  fix for the added nickname section. Build 7 targeted smoke resumed on
  2026-07-18: install/login passed, task add sync passed, task completion sync
  passed, and Goal add sync passed. Account-detail behavior was functional, but
  the sheet height was too tall and the bottom sheet surface looked visually
  detached.
- Build 8 was archived and uploaded to App Store Connect on 2026-07-18. It
  refines the bottom sheet heights and applies a shared bottom-sheet surface
  fill to the app's compact sheet views so the sheet background reaches the
  bottom instead of looking like a floating card. Real-device validation showed
  the detached-bottom appearance still occurred in all affected compact sheets.
  Data export also opened only after leaving Settings because its presentation
  state was owned by Home.
- Build 9 was archived and uploaded to App Store Connect on 2026-07-18. It
  converts the affected compact and management surfaces to the same large-sheet
  presentation used by Terms and Privacy, and moves export presentation
  ownership into Settings so the share sheet opens immediately. App Store
  Connect reported that the uploaded package is processing.
- Build 10 was archived and uploaded to App Store Connect on 2026-07-24. It
  adds independent Task briefing/schedule and Habit notification settings,
  Task reminders with up to three offsets, foreground/completion banners,
  notification date routing, and the real-month Large widget calendar.
  The user confirmed the TestFlight update on a real device on 2026-07-25.
- Build 11 was archived and uploaded to App Store Connect on 2026-08-02. It
  consolidates the notification merge/title fix, Habit editor alignment and
  minute-precision display, Medium widget four-item cap, and bounded Home
  calendar overflow display. App Store Connect reported that the package is
  processing.
- Build 12 was archived and uploaded to App Store Connect on 2026-08-04. It
  adds the Home four-lane plus fixed fifth `+N` overflow row, concise briefing
  and schedule notification copy, time-only schedule titles, and Korean public
  holiday coloring in Home and widget calendars. App Store Connect accepted
  the upload and reported that the package is processing.
- Build 12 real-device validation passed the Home overflow row, concise
  briefing copy, public-holiday coloring, and holiday activity-dot checks. The
  schedule-only time title worked but could be mistaken for the current time;
  build 13 uses relative titles for pre-alerts and keeps
  the Task time only for on-time reminders.
- Build 13 also changes the iOS Home List from a single-day
  view to the displayed month's Tasks grouped by date. Existing month
  navigation controls the list, and tapping a date still opens the daily detail
  panel for Habits and day-specific review.
- Build 13 was archived and uploaded to App Store Connect on 2026-08-05. The
  app and widget are version 1.0 (13), and App Store Connect reported that the
  uploaded package is processing.
- Build 13 installed with existing data intact. The user confirmed monthly List
  date grouping, month navigation, Task actions, multi-day/carry-over handling,
  and date-header entry into daily detail. A next-build local follow-up now
  scrolls to today's section both when entering List and when tapping `오늘`.
- Build 13 relative schedule-only titles passed on a real device. A next-build
  local follow-up now adds the actual Task date/time to the body, such as
  `오늘 15:00에 ‘Task’ 일정이 있어요.` or `내일 15:00에 …`.
- Build 14 finished processing and was installed from TestFlight on 2026-08-25.
  Version confirmation, launch, existing session, existing Task/Habit/Goal data,
  and force-quit/relaunch retention all passed on a real iPhone.
- Build 14 full-free UI/access smoke passed on 2026-08-28 for the installed
  production account: Settings has no plan/subscription/payment surface, Just
  Do Mode and CSV export work, Stats and full Goal reports are accessible, and
  no lock/blur/price/upgrade/Toss/expiry UI was found. Exact no-row and every
  legacy-state account fixture remain covered by automation rather than this
  single real-device account.
- Build 14 H-015 passed on 2026-08-28: current-month List entry scrolls to
  today's section, `오늘` restores it after scrolling or visiting another month,
  and date-detail plus Task edit behavior remains intact. H-016 notification
  delivery later passed on build 15 on 2026-09-08.
- Build 15 was archived and uploaded to App Store Connect on 2026-09-06. The
  app and widget are version 1.0 (15), both Privacy Manifests and dSYMs are
  present, and App Store Connect accepted the package without warnings or
  errors. It was installed and its targeted public-holiday/Sunday display
  checks passed on a real iPhone on 2026-09-07.
- External testers have been added.
- Build 1 has been submitted for TestFlight Beta App Review.
- App Store Connect required metadata currently shows no red missing-information
  warnings.
- Age rating is saved as `4+`.
- Pricing is set to Free.
- App Privacy is saved: no tracking; linked data limited to email address, name,
  user ID, and user content for App Functionality.
- Content rights are set for the app's own/user-entered productivity content
  model; the app does not provide third-party media/content catalogs.
- Existing App Review notes were saved before the 2026-08-19 full-free decision
  and must be replaced before submission. The new notes should keep Sign in with
  Apple as primary and the Google demo account from the dedicated login fields
  as fallback, while stating that
  all current features are free and there is no IAP, subscription, purchase
  flow, external payment link, paid entitlement, or purchase CTA.
- Build 11 real-device regression checks passed.
- Current next action is the required build 16 fix set described at the top of
  this document. Build 15 must not be submitted for public App Review.

## Build 15 Baseline Checks

- Signed build 15 archive/upload succeeded.
- App icon has no alpha.
- Privacy manifests are included in app and widget targets.
- `ITSAppUsesNonExemptEncryption = NO` is present.
- The final build 15 real-device smoke passed, but the pre-submission source
  audit found release blockers outside that smoke path. Follow the build 16
  exit gate in `docs/app_store_pre_submission_audit_2026-09-08.md`.

For the current TestFlight internal validation pass, use
`docs/testflight_smoke_checklist.md`.
