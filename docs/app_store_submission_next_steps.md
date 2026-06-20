# App Store Submission Next Steps

Updated: 2026-06-20

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
- External testers have been added.
- Build 1 has been submitted for TestFlight Beta App Review.
- Next: wait for Beta App Review approval, then have external testers install
  through TestFlight. Continue internal build 1 smoke in parallel.

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
