# AWS EventBridge Billing Cron

Date: 2026-05-19

Status: DISABLED FOR FULL-FREE V1 (confirmed 2026-08-24). The
existing schedule was previously enabled for test-path verification, but v1 now
launches with all current features free. Production has no billing/customer key,
no next billing timestamp, and no payment event. The charge route requires both
keys and a due timestamp, so AWS access does not block the UI/code conversion.
The production rollout has a verified hard billing-disabled guard on the
charge endpoint, and the schedule itself is disabled. Do not re-enable payment
activity without a new monetization decision. See
`docs/full_free_launch_plan.md`.

## Full-Free Disablement Audit

- 2026-08-20: AWS authentication succeeded for the configured IAM identity.
- `scheduler:GetSchedule` for `justdo-prod-billing-charge-daily` returned
  `AccessDeniedException`, so current state could not be independently read.
- `lambda:GetFunctionConfiguration` for `justdo-prod-billing-cron` and
  `amplify:GetApp` for the production app also returned access denied.
- The in-app AWS Console fallback was unavailable in the current environment.
- Hosted Supabase has 0 stored billing keys, 0 customer keys, 0 next-billing
  timestamps, 0 due charge candidates, and 0 payment events. The deployed Web
  public Toss client key classifies as `test`.
- No schedule mutation was attempted because the exact existing target/settings
  could not be read and preserved safely.
- 2026-08-24: commit `f0e584c` was deployed to production. `/api/billing/charge`
  and the other three billing mutation routes return unconditional
  `410 { "error": "billing_disabled" }` before auth, DB, or provider access.
  Pre/post deploy Supabase aggregates were identical: 0 billing/customer keys,
  0 due charge candidates, and 0 payment events.
- 2026-08-24 follow-up: the only configured CLI profile is IAM user `Field` in
  account `058264290801`. `GetSchedule`, `ListSchedules`, Lambda get/list,
  CloudWatch Logs describe, resource-tag listing, and CloudWatch metrics are all
  denied before resource existence can be determined. No browser-backed AWS
  Console session is available in the current environment.
- CloudTrail lookup is allowed. Its visible 90-day Scheduler history contains
  only the denied 2026-08-20 `GetSchedule` probe and no `UpdateSchedule` or
  `DeleteSchedule` event. This does not prove the schedule still exists, but it
  also provides no evidence that the historically confirmed schedule was
  removed or disabled. At that point the state remained unknown until the
  following user-console confirmation.
- 2026-08-24 23:18 KST: the user opened the Seoul-region AWS console and
  confirmed `default/justdo-prod-billing-charge-daily` existed in `ENABLED`
  state with target Lambda `justdo-prod-billing-cron` and target type
  `LAMBDA_Invoke`.
- 2026-08-24 23:20:16 KST (14:20:16 UTC): the user used the console's
  `Disable` action. The console displayed a success confirmation and the list
  state changed to `DISABLED`. The schedule and Lambda target were preserved;
  neither was deleted.
- Defense-in-depth disablement is complete. Any future monetization project
  must make a new explicit decision before changing this state.

This document records the B3 cron decision and setup for Just Do Pro recurring
billing.

## Decision

- Scheduler: AWS EventBridge Scheduler.
- Target pattern: EventBridge Scheduler -> AWS Lambda ->
  `POST https://www.justdo.co.kr/api/billing/charge`.
- Schedule: daily at 05:30 KST.
- Timezone: `Asia/Seoul`.
- App auth: `Authorization: Bearer $BILLING_CRON_SECRET`.
- Lambda handler source: `infra/aws/billing-cron-lambda.mjs`.

Why Lambda instead of EventBridge API Destination directly:

- EventBridge API Destinations can call HTTPS endpoints, but AWS documents a
  maximum client execution timeout of 5 seconds for API destination endpoints.
- Billing may call Toss and update several subscriptions, so a Lambda wrapper
  gives us a normal serverless timeout window while keeping the scheduler in
  AWS and keeping the app endpoint database-agnostic.
- If the backend moves away from Supabase later, the scheduler still only calls
  the public billing endpoint.

## Lambda Environment Variables

Set these on the Lambda function:

```text
BILLING_CHARGE_URL=https://www.justdo.co.kr/api/billing/charge
BILLING_CRON_SECRET=<same value as Amplify BILLING_CRON_SECRET>
BILLING_CHARGE_TIMEOUT_MS=25000
```

Runtime:

- Node.js 20.x or newer.
- Architecture can be `arm64`.
- Timeout: 60 seconds.
- Memory: 128 MB is enough for the HTTP wrapper.

## EventBridge Scheduler Settings

Use an EventBridge Scheduler schedule, not a legacy EventBridge rule.

```text
Name: justdo-prod-billing-charge-daily
Schedule pattern: cron(30 5 * * ? *)
Timezone: Asia/Seoul
Flexible time window: Off
Target: Lambda function that uses infra/aws/billing-cron-lambda.mjs
Retry attempts: 0 or 1
Dead-letter queue: recommended once production billing is live
```

Retry guidance:

- Keep EventBridge/Lambda retries low because the application already tracks
  payment failure state with `payment_failures`, `next_billing_at`, and
  `status`.
- If Lambda retries are enabled, monitor duplicate charge risk closely. The app
  route currently limits due rows by `next_billing_at` and status, but full
  provider-level idempotency should be reviewed before raising retry counts.

## Manual Smoke Test

Before enabling the schedule, invoke the Lambda manually with a test event:

```json
{
  "source": "manual",
  "time": "2026-05-19T20:30:00Z"
}
```

Expected result:

```json
{
  "ok": true,
  "status": 200,
  "body": {
    "ok": true,
    "charged": [],
    "failed": []
  }
}
```

`charged` can be non-empty if a test subscription is due and has a Toss billing
key.

## Production Enablement Checklist

- [x] Confirm Amplify has `BILLING_CRON_SECRET`.
- [x] Create Lambda with `infra/aws/billing-cron-lambda.mjs`.
- [x] Set Lambda env vars listed above.
- [x] Invoke Lambda manually and confirm HTTP 200.
- [x] Review EventBridge Scheduler creation settings for 05:30 KST.
- [x] Create EventBridge Scheduler schedule for 05:30 KST.
- [x] Confirm first scheduled invocation in CloudWatch logs.
- [x] Confirm `/api/billing/charge` returns 200 and records `payment_events`.
- [ ] Add DLQ before live billing is enabled.

## Smoke Test Log

- 2026-05-19: Lambda `justdo-prod-billing-cron` manual test succeeded.
  Response status `200`, body `{ ok: true, charged: [], failed: [] }`.
  Duration was about 4.4 seconds on the AWS Lambda console test.
- 2026-05-19: EventBridge Scheduler final review screen was checked:
  `cron(30 5 * * ? *)`, timezone `Asia/Seoul`, target Lambda
  `justdo-prod-billing-cron`, payload
  `{ "source": "aws.eventbridge.scheduler" }`, enabled, retry off, no DLQ.
- 2026-05-21: First scheduled invocations confirmed in CloudWatch.
  Log group `/aws/lambda/justdo-prod-billing-cron` shows two automated
  firings: 2026-05-19 20:30:07 UTC (= 2026-05-20 05:30 KST) and
  2026-05-20 20:30:08 UTC (= 2026-05-21 05:30 KST). Both completed with
  INIT_START / START / END / REPORT and no error or throw. Lambda
  CloudWatch metrics (1 week window) show Invocations total 3
  (manual + 2 scheduled), Errors max 0, Success rate min 100%, Throttles
  max 0, async delivery failures 0, Duration min 3,281ms / avg 4,055ms /
  max 4,453ms (consistent with the manual smoke test). Supabase
  `payment_events` table remained at 0 rows, expected because no
  subscriptions are due before Toss merchant approval.

## Operational Notes

- The billing endpoint processes at most 20 due subscriptions per call.
- Failed Toss charges are marked `past_due` and retried the next day.
- After 3 failures, the subscription becomes `paused` and `next_billing_at` is
  cleared.
- Production Toss automatic billing still requires merchant approval and a live
  automatic-billing MID.
