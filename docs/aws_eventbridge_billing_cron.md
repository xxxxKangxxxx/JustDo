# AWS EventBridge Billing Cron

Date: 2026-05-19

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
- [ ] Create EventBridge Scheduler schedule for 05:30 KST if not already
  created from the final review screen.
- [ ] Confirm first scheduled invocation in CloudWatch logs.
- [ ] Confirm `/api/billing/charge` returns 200 and records `payment_events`.
- [ ] Add DLQ before live billing is enabled.

## Smoke Test Log

- 2026-05-19: Lambda `justdo-prod-billing-cron` manual test succeeded.
  Response status `200`, body `{ ok: true, charged: [], failed: [] }`.
  Duration was about 4.4 seconds on the AWS Lambda console test.
- 2026-05-19: EventBridge Scheduler final review screen was checked:
  `cron(30 5 * * ? *)`, timezone `Asia/Seoul`, target Lambda
  `justdo-prod-billing-cron`, payload
  `{ "source": "aws.eventbridge.scheduler" }`, enabled, retry off, no DLQ.

## Operational Notes

- The billing endpoint processes at most 20 due subscriptions per call.
- Failed Toss charges are marked `past_due` and retried the next day.
- After 3 failures, the subscription becomes `paused` and `next_billing_at` is
  cleared.
- Production Toss automatic billing still requires merchant approval and a live
  automatic-billing MID.
