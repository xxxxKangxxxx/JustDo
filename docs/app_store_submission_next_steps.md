# App Store Submission Next Steps

Updated: 2026-08-05

## Ready Assets

- App name: `Just Do`
- Subtitle: `할 일·습관·목표를 한 곳에`
- Privacy Policy URL: `https://www.justdo.co.kr/privacy`
- Support URL: `https://www.justdo.co.kr`
- Marketing URL: `https://www.justdo.co.kr`
- Demo Google account: `kangym071900@gmail.com`
- Screenshot PNGs:
  - `app-store-screenshots/01-calendar-flow.png`
  - `app-store-screenshots/02-add-goals-flow.png`
  - `app-store-screenshots/03-review-flow.png`
  - `app-store-screenshots/04-goals-flow.png`

Do not store the demo account password in this repository. Enter it only in App
Store Connect review notes.

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
7. Add App Review notes:
   - Sign in with Apple is available.
   - Google demo account is available as fallback.
   - The iOS app has no IAP purchase flow or external payment link.
8. Archive from Xcode and upload the build.
9. Wait for processing, attach the build, then submit for review.

## Current TestFlight State

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
- App Review notes are saved with Sign in with Apple as the primary review path,
  the Google demo account as fallback, and explicit confirmation that this iOS
  build has no IAP, purchase flow, external payment link, or purchase CTA.
- Build 11 real-device regression checks passed.
- Next: consolidate any remaining changes, then verify the monthly List
  today-scroll and schedule-only body follow-ups in the next TestFlight build.

## Final Local Checks Before Archive

- Release build succeeds.
- App icon has no alpha.
- Privacy manifests are included in app and widget targets.
- `ITSAppUsesNonExemptEncryption = NO` is present.
- Real-device smoke:
  - Apple sign-in.
  - Google demo sign-in.
  - Calendar, task add, goal screen, report entry, widget.

For the current TestFlight internal validation pass, use
`docs/testflight_smoke_checklist.md`.
