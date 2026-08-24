# Just Do Full-Free Launch Plan

Decision date: 2026-08-19
Status: BUILD 14 PREFLIGHT PASSED — ARCHIVE/UPLOAD NEXT

## Launch Policy

- iOS and Web v1 launch with all currently implemented product features free.
- Authentication remains required for hosted sync; "free" does not mean guest
  access or removal of account requirements.
- A user's legacy `free`, `trial`, `pro`, expired, paused, or cancelled
  subscription row must not change feature availability.
- Remove user-facing Pro/Trial locks, blur previews, upgrade/paywall copy,
  subscription prices, purchase CTAs, and external payment paths.
- Do not offer IAP or web checkout as part of this release.
- Toss live billing and merchant review are paused and are not iOS/Web v1 launch
  blockers. Reintroducing monetization requires a separate product decision and
  a new implementation/review plan.
- Preserve billing code, subscription rows, and payment history until the
  rollout is verified. Do not destructively drop schema or erase historical
  payment data as part of the free launch.

## Release Gate

Full-free behavior is the required exception to the otherwise low-risk build 14
scope. The implementation and automated gates pass, production Web is live,
the billing schedule is disabled, and the candidate scope is frozen. Build 14
archive/upload and real-device TestFlight verification are next.

## Locked Implementation Decisions

These decisions remove ambiguity before product-code edits begin.

1. **Access rule:** every authenticated iOS/Web user receives all currently
   shipped v1 features. `user_subscriptions`, local `settings.plan`, Trial
   dates, and billing state are not entitlement inputs.
2. **Authentication rule:** hosted sync still requires sign-in. Full-free does
   not add guest mode or change Apple/Google authentication.
3. **Settings rule:** remove the user-facing `구독`, `현재 플랜`, Trial, Pro,
   price, payment method, next-payment, and cancellation UI entirely. Do not
   replace it with another plan/status row.
4. **Billing-write rule:** Web billing mutation endpoints return a stable
   `410 Gone` JSON response `{ "error": "billing_disabled" }` before parsing
   input, authenticating, reading the database, or calling Toss. Do not add a
   production environment switch that could accidentally re-enable billing.
5. **Stale-route rule:** `/billing/success` and `/billing/fail` remain safe for
   old bookmarks/redirects but show only that billing is unavailable and link
   back to the app. They must not call the issue-key endpoint or display a
   price, Trial, Pro, or retry-payment CTA.
6. **Compatibility rule:** keep billing migrations, tables, generated database
   types, legacy subscription decoding, and local `settings.plan` decoding for
   this release. They may not affect access or appear in UI.
7. **Migration rule:** do not add a production DB migration for the first
   full-free release. Removing the signup subscription row is deferred because
   clients already tolerate and store the legacy value, and the row is inert.
8. **Release rule:** the implementation gate is green, production Web is live,
   the AWS schedule is disabled, scope is frozen, and all Xcode configurations
   are now build 14. Archive/upload once, then use TestFlight for the remaining
   real-device checks.

## Detailed Execution Plan

### Batch A — Contract and Regression Baseline

Goal: encode the new behavior before deleting the old implementation.

1. Update Web component tests in
   `apps/web/src/features/just-do/app-shell.test.tsx`:
   - replace Trial/Pro eligibility tests with identical-access cases for no
     subscription, `free`, `trial`, `active`, `expired`, `paused`, and
     `cancelled` responses;
   - assert Stats renders without a subscription loading/error gate;
   - assert Just Do Mode can be enabled from the Today panel and Settings;
   - assert goal reports render full content with no blur or upgrade overlay;
   - assert Settings has no subscription entry, price, Trial/Pro badge, Toss
     action, or upgrade modal.
2. Replace billing-route success tests in
   `apps/web/src/app/api/billing/billing-routes.test.ts` with disabled-contract
   tests for issue-key, charge, cancel, and Toss webhook:
   - status is `410` and body is `{ error: "billing_disabled" }`;
   - malformed bodies and valid-looking authorization produce the same result;
   - Toss helpers and Supabase mutation clients are never called.
3. Retain iOS shared sync tests proving old `pro`, inactive, and missing
   subscription payloads still decode. Access equality is verified by removing
   all plan reads from app UI paths, a source audit, Release build, and manual
   account-state smoke because `ContentView` is not part of the Swift Package
   test target.
4. Run the focused Web test files before implementation and record expected
   failures as the test-first checkpoint. Do not treat those intentional
   failures as a release verification result.

Completion condition: the desired free-access and billing-disabled contracts
are explicit, and failures point only to the old gates/payment behavior.

#### Batch A Checkpoint (2026-08-21)

- Before the contract rewrite, the two focused files passed 31/31 tests.
- The rewritten focused suite contains 33 tests: 14 pass and 19 fail at the
  intentional red checkpoint.
- Eight failures cover issue-key, charge, cancel, and webhook routes still
  executing their legacy status/auth/DB/Toss behavior instead of returning the
  unconditional `410 billing_disabled` contract.
- Eleven failures cover the expected UI delta: non-Pro or malformed states and
  subscription-fetch failure still gate Stats; no-row users still cannot use
  Just Do Mode or full reports; Just Do Mode is not yet in non-commercial
  Settings; and subscription/pricing/checkout UI is still present.
- Trial and active-Pro Stats cases pass under the same fixtures, confirming the
  new matrix is reaching the intended dashboard rather than failing from an
  unrelated render/setup error.
- Web ESLint passes with the new tests. `git diff --check` passes.
- No product implementation file changed in Batch A. Batch B must turn the UI
  contract green; Batch C must turn the route contract green.

### Batch B — Web Access and UI Conversion

Primary file: `apps/web/src/features/just-do/app-shell.tsx`.

1. Remove Toss client imports, billing/plan types, payment-method definitions,
   status labels, entitlement helpers, and `useBillingSubscription` from the
   active app shell.
2. Root report flow:
   - remove subscription fetching and `reportUpgradePlan` state;
   - open `GoalReportModal` without a `locked` or `onUpgrade` contract;
   - delete report blur, locked overlay, `Pro로 펼치기`, and footer lock copy.
3. Today/Just Do flow:
   - base visibility only on the persisted `justDoMode` setting;
   - allow switching the setting for every signed-in user;
   - remove entitlement loading, Pro badge, and upgrade-modal branches.
4. Stats flow:
   - render the existing dashboard directly;
   - remove subscription loading/error states and `ProFeatureGate`;
   - delete the gate and plan-card components if no longer referenced.
5. Settings/goal flow:
   - remove `subscription` from `SettingsSection` and navigation;
   - delete `SubscriptionPanel`, `PlanBadge`, `UpgradeModal`, pricing cards,
     cancellation logic, and every `onUpgrade` prop/state;
   - keep goal creation/editing/report functionality unchanged apart from
     always rendering full report details.
6. Remove the final active import of `apps/web/src/lib/billing/toss-client.ts`.
   Preserve isolated billing helper files temporarily for history and route
   compatibility; dead-code deletion is a later cleanup unless lint requires
   it.

Completion condition: the authenticated Web shell never fetches a subscription
for access, every existing feature opens normally, and no active UI can load the
Toss SDK or navigate into billing.

#### Batch B Checkpoint (2026-08-21)

- Removed the active Toss client import, subscription models/hook, entitlement
  helpers, and every plan-dependent branch from the Web app shell.
- Stats now renders directly for no-row, Free, Trial, active, expired, paused,
  cancelled, malformed, and subscription-fetch-error cases.
- Just Do Mode depends only on the user's saved preference. Its toggle moved
  from the deleted subscription panel to the non-commercial `화면` settings.
- Goal reports now render all four steps without blur, disabled accessibility,
  locked overlays, plan badges, or upgrade actions.
- Removed the subscription navigation/panel, plan cards, prices, cancellation
  UI, upgrade modal, payment-method choices, and all active Toss checkout paths
  from `app-shell.tsx`.
- Web UI tests pass 25/25. All Web tests except the intentionally red Batch C
  billing-route contract pass 140/140. ESLint passes.
- Production build passes. The first sandboxed attempt failed only because
  Turbopack could not bind a local port; the approved unrestricted rerun
  compiled, type-checked, generated all pages, and completed successfully.
- The combined Batch A/B focused checkpoint is now 25 pass, 8 fail; all eight
  remaining failures are the four billing mutation handlers reserved for
  Batch C.

### Batch C — Web Billing Guard and Legal Routes

1. Change these `POST` handlers to return the locked `410` contract as their
   first and only behavior:
   - `apps/web/src/app/api/billing/issue-key/route.ts`
   - `apps/web/src/app/api/billing/charge/route.ts`
   - `apps/web/src/app/api/billing/cancel/route.ts`
   - `apps/web/src/app/api/webhook/toss/route.ts`
2. Remove Toss, service-role, auth, and billing-calculation imports from those
   disabled handlers so a request cannot produce a hidden side effect.
3. Keep `/api/billing/subscription` read-only and unused for compatibility in
   this release. Mark it legacy in code; it must have no app-shell caller.
4. Replace billing success/fail pages with the neutral stale-route experience
   defined above. Remove `BillingSuccessClient` if it becomes unreachable.
5. Update Web Terms: all currently provided functionality is free; no purchase,
   subscription, automatic renewal, or refund flow is offered.
6. Run focused route/component tests, then full Web tests, lint, and production
   build before touching iOS.

Completion condition: even a valid-looking direct request cannot issue, charge,
delete, or record a billing key/payment, and the Web build has no purchase UI.

#### Batch C Checkpoint (2026-08-21)

- Replaced billing-key issue, recurring charge, cancellation, and Toss webhook
  handlers with the unconditional `410 { error: "billing_disabled" }`
  response. The disabled handlers no longer import auth, Supabase, Toss, plan,
  date, or billing-calculation code.
- Kept `/api/billing/subscription` as an explicitly marked read-only legacy
  compatibility endpoint. The Web app shell has no caller for it.
- Replaced both stale billing result pages with static all-free guidance and a
  home link. They no longer inspect Toss query values, register a billing key,
  display prices/Trial/Pro, or offer a subscription/retry action. Removed the
  now-unreachable `BillingSuccessClient`.
- Updated Web Terms with an August 21 effective date and the current policy:
  all functionality is free and no purchase, paid subscription, automatic
  renewal, cancellation, or refund workflow is offered.
- Billing disabled-contract tests pass 8/8; the complete Web suite passes
  148/148 across 9 files; ESLint passes without warnings.
- The production build compiles, type-checks, and generates all 14 pages. The
  initial sandbox run hit only the known Turbopack port restriction; the
  approved rerun completed successfully. `git diff --check` passes.

### Batch D — iOS Access and UI Conversion

Primary file: `apps/ios/JustDoApp/JustDoApp/ContentView.swift`.

1. Home/Just Do flow:
   - remove the root `isProPlan` computed value;
   - make `effectiveJustDoMode` depend only on the saved setting;
   - remove the guard and Pro error from Settings-originated changes.
2. Report flow:
   - remove `GoalReportPresentation.isPreview` and every constructor argument;
   - render report content without blur/disabled/accessibility-hidden state;
   - delete `GoalReportLockedOverlay` and Trial/Pro report copy;
   - remove `isProPlan` from `GoalManagementSheet`.
3. Settings/data flow:
   - remove the `구독` group, plan label, and Pro badge support used only by
     commercial UI;
   - allow Just Do Mode and data export without a plan guard;
   - remove plan from `AccountDetailSheet` and its `현재 플랜` row;
   - keep sync, reset, notification, goal, category, and export mechanics
     otherwise unchanged.
4. Legal copy: replace the in-app `유료 기능` clause with the same current
   all-free/no-purchase policy as Web Terms.
5. Compatibility: leave `Settings.plan`, Core Data mapping, and
   `SupabaseSubscriptionRow` decoding intact but confirm no `ContentView` access
   or copy depends on them.
6. Run `swift test`, then the generic iOS Release app/widget build. Do not bump
   build number yet.

Completion condition: a locally stored or remotely synced Free/inactive plan
cannot change any visible feature, and all existing iOS functionality builds
without Pro/Trial UI.

#### Batch D Checkpoint (2026-08-21)

- Removed every `settings.plan`/`isProPlan` read from active iOS UI code. Just
  Do Mode now depends only on its saved preference and Settings changes no
  longer have a plan guard or Pro error.
- Removed report preview state, constructor flags, blur/disabled/accessibility
  blocking, the locked overlay, and Trial/Pro report copy from both report
  entry points. Goal reports always render all four pages.
- Removed the Settings subscription group, Free/Pro plan label, commercial
  badge support, export gate, and the account-detail current-plan row. Just Do
  Mode now lives in the non-commercial Display group; data export directly
  invokes the existing exporter.
- Updated the in-app Terms to the same all-free/no-purchase policy as the Web.
- Preserved `Settings.plan`, Supabase subscription decoding, Core Data mapping,
  and their compatibility tests. Those values remain inert historical data and
  are not entitlement inputs.
- `swift test` passes 98/98. The generic iOS Release build compiles the app,
  widget extension, and shared package successfully. The initial sandbox runs
  were blocked only by user-cache/CoreSimulator permissions; approved reruns
  passed. `git diff --check` passes.
- All app and widget targets remain on build 13; no archive, upload, deployment,
  database migration, or production operation was performed.

### Batch E — Cross-Platform Copy and Static Audit

1. Search active Web/iOS source for `Pro`, `Trial`, `upgrade`, `paywall`,
   `subscription`, `billing`, `Toss`, `구독`, `결제`, and `유료`.
2. Classify every remaining match:
   - allowed: compatibility types, generated DB types, migrations, archived
     documentation, disabled route names, and historical tests/docs;
   - forbidden: user-visible sales copy, feature gates, prices, checkout links,
     Toss SDK callers, or billing mutation logic.
3. Update App Store listing, App Review notes, TestFlight checklist, README,
   handoff, worklog, and next-steps wording only after code behavior is final.
4. Inspect existing App Store screenshots for visible Pro/Trial/price content;
   regenerate only if such content is actually present.

Completion condition: every active-source match is reviewed and the Web, iOS,
legal, store, and review descriptions agree on the same policy.

#### Batch E Checkpoint (2026-08-21)

- Audited active Web/iOS source and classified every commercial-term match.
  Allowed matches are limited to isolated unreferenced Toss helpers, legacy
  plan/subscription decoding and persistence, disabled/read-only route names,
  billing-disabled safety tests, and negative “billing is unavailable” legal
  or stale-route guidance. No forbidden feature gate, sales copy, price,
  checkout link, Toss SDK caller, or billing mutation implementation remains in
  active product UI.
- Removed the obsolete Toss SDK/price mock and test client-key setup from the
  Web app-shell test now that the product module has no Toss import. Billing
  route mocks remain intentionally to assert zero external side effects.
- Updated README, App Store listing/review-note draft, submission next steps,
  TestFlight checklist, iOS status, handoff, paused Toss plan, and Web env
  example to the current all-free policy. Historical paid implementation notes
  are explicitly labeled non-executable instead of being deleted.
- Visually inspected all four 6.9-inch and four 6.5-inch App Store screenshots.
  They show only calendar, task, habit, review, and goal flows; no Pro, Trial,
  price, subscription, or purchase CTA appears, so regeneration is unnecessary.
- App Privacy remains unchanged: full-free access adds no collected data or
  purchase category. Web and in-app Terms use matching free/no-purchase copy;
  the Web change still requires Batch F production deployment.
- Web tests pass 148/148 and ESLint passes after audit cleanup.
  `git diff --check` passes.

### Batch F — Release Verification and Rollout

1. Re-run from a clean command invocation:
   - Web Vitest;
   - Web ESLint;
   - Web production build;
   - Swift Package tests;
   - generic iOS Release app/widget build;
   - `git diff --check` and a focused secret/value scan.
2. Test the behavior matrix on Web and iOS using no-row, Free, Trial, active,
   expired, paused, and cancelled legacy states. Verify equal access to Stats,
   reports, Just Do Mode, export, goals, sync, and widgets.
3. Probe deployed billing endpoints after the Web deployment and confirm `410`
   with no database/event changes. Confirm deployed bundles contain no active
   Toss checkout loader or upgrade copy.
4. Complete the AWS defense-in-depth step when authorized. If AWS access is
   still unavailable, the verified deployed `410` charge guard is the required
   safety condition; record the scheduler follow-up without blocking UI/iOS
   implementation.
5. Freeze scope, review the combined diff, and only then bump every iOS target
   from build 13 to 14.
6. Archive/upload once, perform real-device TestFlight smoke for full-free plus
   H-015/H-016, and proceed to App Review only after the checklist passes.

Completion condition: automated checks, static audit, deployed endpoint probes,
account-state matrix, and real-device smoke are all recorded as PASS.

#### Batch F Local Verification Checkpoint (2026-08-21)

- Re-ran the complete local gate from fresh command invocations: Web Vitest
  148/148, Web ESLint, Web production build, Swift Package tests 98/98, generic
  iOS Release app/widget build, and `git diff --check` all pass.
- Ran the iOS simulator UI regression suite: 5/5 pass, including a focused
  Free-fixture Settings/export UI case added after discovering that the project
  does have a UI-test target.
- Started the built Web production server locally and probed issue-key, charge,
  cancel, and Toss webhook with valid-looking payloads/headers. All four return
  `410 { "error": "billing_disabled" }`; stale billing success and Terms pages
  return 200.
- Audited the actual production output (`.next/static` and `.next/server`): no
  Toss SDK loader/client key, checkout call, Pro upgrade/price, report lock, or
  Stats gate string is present. The disabled route contract and current free
  legal/stale-route copy are present.
- Source/diff audit found no migration, package dependency, build-number, auth,
  sync, task, habit, goal, widget, or stored-data rewrite. Remaining plan data
  and Toss helpers are isolated compatibility/history only; all six Xcode build
  settings remain at 13.
- This checkpoint itself did not deploy or mutate operations. Production Web
  rollout/probes and AWS schedule disablement were subsequently completed on
  2026-08-24. Representative production-account/real-device smoke, build 14
  bump, archive/upload, and App Review submission remain pending.

## Implementation Stop Conditions

Pause the affected batch and investigate before continuing if any of these
occurs:

- a billing key, payment event, due charge, or live Toss credential is newly
  discovered;
- disabling a billing handler affects unrelated authentication, sync, or data
  APIs;
- removing a plan gate changes stored task/goal/habit data rather than only
  access/UI behavior;
- an account state loses data, reports, export, sync, or widget behavior;
- full tests or Release builds fail outside an intentionally changed contract;
- App Store/legal copy would claim behavior not yet deployed.

No schema deletion, customer-data rewrite, production deploy, AWS mutation,
build-number bump, TestFlight upload, or App Review submission is authorized by
the implementation batches themselves.

## Phase 0 — Billing Safety Audit

- [x] Confirm whether production has real paid customers, stored billing keys,
  pending charges, refunds, or active recurring agreements. The 2026-08-20
  aggregate audit found none; details are recorded below.
- [x] Apply the paid-customer stop condition. No real paid customer or payment
  record was found, so cancellation/refund communication is not required.
- [x] Classify the currently reachable Toss configuration. Local client/secret
  keys and the deployed public client key are `test`; Amplify's private
  environment remains unreadable without `amplify:GetApp`, but there is no
  stored billing key or charge candidate that could use it.
- [x] Determine whether the AWS EventBridge schedule must block UI/code work.
  It does not: the charge route selects only rows with both Toss billing and
  customer keys plus a due `next_billing_at`, and production has zero such
  rows. Schedule inspection/disablement remains a defense-in-depth operations
  follow-up and must be completed or made irrelevant by a hard-disabled charge
  endpoint before production rollout.
- [x] Audit repository-controlled charge triggers. The only automatic caller is
  `infra/aws/billing-cron-lambda.mjs` targeting `/api/billing/charge`; checkout
  authorization and the webhook remain separate guarded routes. External AWS
  resource state still requires the preceding checklist item.
- [x] Preserve secrets and billing records during the initial audit. No schema,
  subscription, payment event, key, or customer record was changed or deleted.

### Phase 0 Audit Evidence (2026-08-20)

The audit intentionally returned aggregate counts only; it did not print user
identifiers, billing keys, customer keys, or secret values.

- Hosted Supabase `user_subscriptions`: 6 total rows — 4 `trial`, 2 `active`,
  all legacy `plan_name=pro`, all with `billing_provider=null`.
- Stored Toss billing keys: 0. Stored Toss customer keys: 0.
- Last payment keys/timestamps: 0. Next billing timestamps: 0.
- Due charge candidates: 0. Positive payment failures: 0. Cancellation markers:
  0.
- Hosted Supabase `payment_events`: 0 rows.
- The six subscription rows are created by the repository's signup trigger as
  default Trial/Pro metadata. They are not evidence of checkout or payment.
- Local operational config: Toss public/secret keys both classify as `test`.
- Deployed Web public bundle: one Toss client-key reference, classified `test`.
- Production endpoint guards: unauthenticated `/api/billing/charge` returned
  401, unauthenticated `/api/webhook/toss` returned 401, and an empty
  `/api/billing/issue-key` request returned 400 without creating data.
- AWS identity authentication succeeded, but Scheduler, Lambda configuration,
  and Amplify environment reads returned `AccessDeniedException`.
- In-app browser/console fallback was unavailable in this environment.

### UI and Code Exposure Audit

- Web actively reads `/api/billing/subscription` and uses the result to gate
  Stats, Just Do Mode, and full goal reports.
- Web still contains a subscription settings section, plan badges/prices,
  report blur/upgrade overlays, `UpgradeModal`, Toss SDK loading, billing
  success/fail pages, and issue-key/charge/cancel/webhook routes.
- iOS maps `user_subscriptions` to `settings.plan`, then uses that value to gate
  Just Do Mode, data export, and full goal reports. Settings still shows
  Free/Pro labels and Pro badges/copy.
- These are real product gates even though live payment was never completed.
  Removing those gates and purchase surfaces is therefore the primary launch
  work.
- Billing tables and migrations may remain for compatibility. Active UI
  imports/callers and state-dependent access must be removed, while mutation
  endpoints must return a billing-disabled response during the free release.

### AWS Operations Follow-Up

An authorized operator must grant the current deployment identity or use a
separate approved role with these minimum read/update actions for the named Just
Do resources:

- `scheduler:GetSchedule`
- `scheduler:UpdateSchedule`
- `lambda:GetFunctionConfiguration` (read-only confirmation)
- `amplify:GetApp` (read-only environment classification)

This follow-up does not block Phase 1 UI/code implementation. Before production
rollout, either complete the steps below or first deploy and verify the
server-side billing-disabled guard so the scheduler cannot create payment
activity.

After access is available:

1. Read `justdo-prod-billing-charge-daily` in `ap-northeast-2` and capture its
   current state, expression, timezone, target, retry policy, and flexible-time
   window without printing secrets.
2. If enabled, update the existing schedule state to `DISABLED` while preserving
   its other configuration.
3. Read it back and confirm `State=DISABLED`.
4. Record the actual disablement timestamp in this file and
   `docs/aws_eventbridge_billing_cron.md`.

## Phase 1 — Shared Product Policy

- [x] Define one explicit full-access policy used by both platforms: every
  authenticated user can use all currently shipped v1 features.
- [x] Keep legacy plan fields decodable for existing local/remote data, but stop
  using them as an entitlement source.
- [x] Remove Trial-expiry behavior and notifications from active product logic.
- [x] Rename user-facing `Goal & Pro Report` references to `목표와 리포트` or
  `Goal & Report`; internal historical filenames may remain until later cleanup.
- [x] Decide whether Settings should omit plan information entirely
  (recommended) or show a neutral `전체 기능 무료` status without a CTA.

## Phase 2 — Web

- [x] Make Stats, reports, Just Do Mode, data export, and every currently gated
  feature available regardless of `user_subscriptions` state.
- [x] Remove report blur/locked states and `Pro로 펼치기` actions.
- [x] Remove or replace the Settings subscription navigation and
  `SubscriptionPanel` with non-commercial copy; remove plan badges and prices.
- [x] Remove all paths that can open `UpgradeModal` or Toss billing
  authorization from the product UI.
- [x] Add a server-side billing-disabled guard so `/api/billing/issue-key` and
  `/api/billing/charge` cannot create new payment activity during the free
  release. Keep cancel/history handling only if Phase 0 finds a real customer
  need.
- [x] Update `/billing/success` and `/billing/fail` so stale direct visits do not
  advertise or initiate subscriptions.
- [x] Update hosted Terms and any pricing/subscription copy to state that all
  current features are free and no purchase is offered.
- [x] Update tests for free, trial, pro, expired, paused, cancelled, missing, and
  malformed subscription states; all must receive the same feature access and
  no checkout CTA.

Primary audit locations:

- `apps/web/src/features/just-do/app-shell.tsx`
- `apps/web/src/lib/billing/`
- `apps/web/src/app/api/billing/`
- `apps/web/src/app/billing/`
- `apps/web/src/app/terms/page.tsx`

## Phase 3 — iOS

- [x] Remove `isProPlan`/subscription checks from Just Do Mode, report detail,
  activity/statistics, data export, and all other shipped feature access.
- [x] Render full report content for every account; remove the Free badge,
  preview blur, Pro CTA, and Trial/Pro explanatory copy.
- [x] Remove the Settings `구독`/`현재 플랜` sales surface or replace it with the
  agreed neutral free-service status.
- [x] Remove Pro-only error messages and lock indicators from Just Do Mode and
  export flows.
- [x] Update in-app Terms to remove the paid-feature section and describe the
  current all-free policy.
- [x] Keep legacy `settings.plan` and subscription sync decoding compatible for
  old snapshots, but ignore the value for UI access.
- [x] Add/adjust tests so free and inactive subscription fixtures receive the
  same report, Just Do Mode, statistics, and export access as legacy Pro data.
  Web covers the complete legacy-state matrix and zero subscription fetch;
  iOS combines zero active plan readers with a passing focused Free
  Settings/export UI case. The full remote-state and report/device smoke remains
  in Phase 6.

Primary audit locations:

- `apps/ios/JustDoApp/JustDoApp/ContentView.swift`
- `apps/ios/JustDoShared/Sync/SupabaseRestSync.swift`
- `apps/ios/Tests/JustDoSharedTests/`

## Phase 4 — Backend and Operations

- [x] Keep `user_subscriptions` and `payment_events` schema intact for
  compatibility and audit history; do not require a destructive migration.
- [x] Stop new-account Trial creation from implying or controlling access.
  A later cleanup migration may change the default record policy after clients
  no longer depend on it.
- [x] Disable the EventBridge billing schedule and record the date/state in
  `docs/aws_eventbridge_billing_cron.md`.
- [x] Keep the Toss webhook unregistered/inactive and billing endpoints guarded.
- [x] Mark `docs/toss_merchant_review_plan.md` PAUSED rather than deleting its
  historical implementation notes.
- [x] Deploy Web/backend changes and verify that no payment request is emitted.
  Commit `f0e584c` was deployed from `main` on 2026-08-24. All four billing
  mutation routes return `410 billing_disabled`; pre/post Supabase aggregate
  counts are identical with 0 payment events and 0 due charge candidates.

## Phase 5 — Store, Legal, and Public Copy

- [x] Remove Pro/future-paid copy from App Store description and screenshots if
  any appears visually.
- [x] Prepare replacement App Review notes stating all current features are free, the app has
  no IAP, subscription, purchase CTA, external payment link, or account-based
  paid entitlement.
- [x] Update Web and in-app Terms consistently before App Review submission.
- [x] Reconfirm App Privacy labels; full-free access does not by itself change
  collected-data categories.
- [x] Review support/marketing pages for price, Trial, Pro, Toss, upgrade, or
  subscription language.

## Phase 6 — Verification and Rollout

- [x] Web: run tests, lint, and production build.
- [x] iOS: run Swift tests and generic Release app/widget build.
- [ ] Test representative account states on Web and iOS: no subscription row,
  free, trial, active Pro, expired, paused, and cancelled.
- [ ] Confirm reports, Stats/activity, Just Do Mode, export, goals, widgets, and
  sync are available in every state.
- [ ] Confirm no Pro badge, lock, blur, upgrade action, price, Toss button,
  billing redirect, or Trial-expiry message remains user-visible.
- [x] Confirm the production Web cannot initiate a charge. The issue-key,
  charge, cancel, and Toss webhook routes all return `410 billing_disabled`.
- [x] Confirm the AWS schedule is disabled. The user verified the production
  console in `ap-northeast-2` and disabled
  `default/justdo-prod-billing-charge-daily` at 2026-08-24 23:20:16 KST while
  preserving its Lambda target and schedule resource.
- [x] Deploy the full-free Web policy before or together with the next iOS
  TestFlight build.
- [ ] Then freeze the remaining Release Candidate scope, bump all iOS targets
  from build 13 to 14, archive/upload, and verify full-free behavior plus
  H-015/H-016 and other batched fixes on a real device.
- [ ] Complete final App Review smoke and submit only after the full-free audit
  passes.

## Deferred Cleanup

The following are intentionally not required for the first free release:

- Dropping billing/subscription tables or columns.
- Deleting Toss integration history or migration files.
- Removing every internal `plan` type in one risky rewrite.
- Dark/tinted app icon artwork.
- Designing a future monetization model.
