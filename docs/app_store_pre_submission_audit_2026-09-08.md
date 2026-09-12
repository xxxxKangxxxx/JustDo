# App Store Pre-Submission Audit — 2026-09-08

## Decision

**HOLD — do not submit TestFlight build 15 for public App Review.**

The completed real-device smoke remains valid, but the source audit found one
App Review blocker and two release defects that require a new binary. Resolve
the items below, upload build 16, rerun the affected checks, and only then
attach the build to iOS version 1.0.

## Required Before Submission

### P0 — Implement account deletion

Implementation status (2026-09-12): **implemented and deployed; destructive
device gate is still open.** The iOS app now provides a destructive confirmation and calls an
authenticated server route. The route validates the Supabase session, revokes
the Apple authorization for Apple identities, removes legacy payment-event
payloads, and hard-deletes the Auth user so the verified cascade removes owned
application data. After success the app clears Keychain, Core Data, queued
mutations, widget state, notifications, preferences, and temporary exports.
The in-app and hosted privacy text now describes the implemented behavior.

Verification passed: Web tests 163/163, Web ESLint, Web production build,
Swift tests 100/100, and all iOS simulator UI tests 10/10, including
confirmation-to-signed-out account deletion.
Apple/Supabase server credentials and commit `c4430bd` are live. Signed-out
`/support` and `/privacy` checks pass, and safe account-delete probes return
`401 invalid_session`. Production completion still requires destructive
real-device tests using disposable Google and Apple accounts; do not use the
App Review demo account for this check. See
`docs/account_deletion_runbook.md`.

Original finding:

- Settings exposed `회원 탈퇴`, but its action only displayed
  `회원 탈퇴는 서버 API 연결 후 활성화됩니다.`
- The app creates a Supabase account through Apple or Google OAuth. Apple
  requires apps that support account creation, including automatically created
  accounts, to let users initiate deletion from inside the app.
- Implement authenticated full account deletion rather than deactivation or an
  email-only support flow.
- Delete the Supabase Auth user and associated application data. Existing
  foreign keys already cascade from `auth.users` through `public.users` and
  owned data; verify the complete production schema before relying on this.
- For Sign in with Apple accounts, implement the required token-revocation
  handling.
- Add an explicit destructive confirmation, success/failure states, sign out,
  local data/Keychain cleanup, and automated plus real-device verification.
- Update the in-app and hosted privacy text after the behavior is real; do not
  continue saying deletion is only planned or handled by request.

Original evidence:

- `apps/ios/JustDoApp/JustDoApp/ContentView.swift:3933`
- `apps/ios/JustDoApp/JustDoApp/ContentView.swift:4419`
- `apps/ios/JustDoApp/JustDoApp/ContentView.swift:4649`

### P1 — Provide a real support path

> 2026-09-12 status: `/support` now provides the support email,
> email response path, account-deletion instructions, and policy links without
> requiring authentication. iOS Settings includes a customer-support row that
> opens this URL. Production returns 200 signed out; device smoke remains open.

- The App Store Connect Support URL currently points to the authenticated app
  root, `https://www.justdo.co.kr`, rather than a public support page with an
  obvious contact method.
- Add a public `/support` page with the product name, support email, expected
  response path, privacy link, and a short account/data-deletion explanation.
- Add an easy-to-find support/contact row inside iOS Settings.
- Change the App Store Connect Support URL to
  `https://www.justdo.co.kr/support` after deployment and verify it without a
  login session.

### P1 — Correct the in-app version display

> 2026-09-12 status: Settings now reads
> `CFBundleShortVersionString` and `CFBundleVersion`; the iOS UI regression
> verifies the displayed version/build format. Build 16 device smoke remains.

- The Xcode marketing version is `1.0` and build number is `15`, but Settings
  displays a hard-coded `1.0.2`.
- Read `CFBundleShortVersionString` and `CFBundleVersion` dynamically and show
  the actual submitted version, for example `1.0 (16)` in the next build.

Evidence: `apps/ios/JustDoApp/JustDoApp/ContentView.swift:3897`.

### P2 — Flatten App Store screenshots

- All four 6.9-inch images are the accepted `1320×2868` size and all four
  6.5-inch images are `1242×2688`.
- The files contain an alpha channel (`sips hasAlpha: yes`). Apple states that
  screenshots cannot include alpha channels or transparency. The current files
  appear visually opaque and App Store Connect accepted them, but convert them
  to RGB/no-alpha and reupload to remove the formal compliance risk.

## App Store Connect Review

### Already correct

- App version record: `1.0`, iPhone-only.
- Four screenshots are uploaded; their content has no Pro, price, purchase, or
  subscription surface.
- Description, promotional text, keywords, copyright, age rating, Free price,
  and App Privacy declarations are consistent with the full-free launch.
- Privacy Policy URL: `https://www.justdo.co.kr/privacy`.
- No In-App Purchase or subscription item is attached. This is correct.
- Manual release is selected. Keep it if post-approval release control is
  intended.
- Login required is enabled and the credentials are in the dedicated login
  information fields.

### Change before submission

1. Rotate the exposed Google demo password and update only the dedicated App
   Review password field. Do not place it in notes, repository files, or future
   screenshots.
2. Normalize the App Review contact phone to international format: after the
   `+82` country code, omit the Korean domestic leading `0`.
3. Replace Support URL with the deployed public `/support` URL.
4. Replace screenshots with flattened no-alpha copies.
5. Update Review Notes with the current free-policy text and concise review
   paths, including Settings → account deletion and Settings → support after
   those features exist.
6. Upload build 16, wait for processing, select it in the Build section, answer
   export-compliance questions if App Store Connect asks, and save.
7. Confirm the real app icon, `1.0 (16)`, and upload timestamp appear after
   build selection. The generic placeholder shown while no build is selected
   is not final evidence of an icon problem.

## Verified Technical Baseline

- Bundle IDs: `kr.justdo.app`, `kr.justdo.app.widget`.
- Deployment target: iOS 17; device family: iPhone.
- Sign in with Apple and shared App Group entitlements are present.
- App and widget Privacy Manifests are valid and included in the archive.
- `ITSAppUsesNonExemptEncryption = false` is present.
- The 1024×1024 app icon is RGB with no alpha.
- Build 15 upload completed successfully with app/widget dSYMs and no recorded
  upload warning or error.
- 2026-09-09 gate: Web tests 163/163, Web ESLint, Web production build,
  Swift tests 100/100, all iOS simulator UI tests 10/10, generic iOS app/widget
  build, plist validation, and `git diff --check` passed.
- 2026-09-09 production gate: server credentials were registered, commit
  `c4430bd` deployed, `/support` returned 200 signed out, `/privacy` showed the
  updated policy, and safe account-delete probes returned `401 invalid_session`.
- Build 15 real-device smoke passed authentication, sync and persistence,
  Goal/report access, full-free UI, export, widget mutation, offline recovery,
  notification delivery, and Terms parity.

## Build 16 Exit Gate

- [ ] Account deletion works for Google and Apple accounts and removes the
  server account plus associated data.
- [ ] Sign in with Apple deletion includes token revocation.
- [ ] Local session, Keychain, cached data, and widget snapshot are cleared
  after deletion.
- [x] Public `/support` works signed out in production.
- [ ] The iOS support row opens the production support page on a real device.
- [ ] Settings displays the actual bundle version/build.
- [ ] Privacy/Terms and Review Notes match implemented behavior.
- [ ] RGB/no-alpha screenshots are uploaded.
- [ ] Automated checks pass; build 16 archives/uploads without warnings.
- [ ] Focused TestFlight smoke passes on a real device.
- [ ] Demo credentials work after password rotation.
- [ ] Build 16 is selected for iOS version 1.0 and all required ASC fields are
  saved before `심사에 추가`.
