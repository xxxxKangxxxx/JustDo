# Toss Merchant Review Plan

Date: 2026-05-19

This document tracks the external work needed before Just Do can switch Toss
Payments automatic billing from test keys to live keys.

## Goal

Enable production Pro subscription billing for `https://www.justdo.co.kr` using
Toss Payments automatic billing.

Current app state:

- Production web app is live at `https://www.justdo.co.kr`.
- Toss Payments test-key billing flow is wired in the app.
- Billing API routes exist, including `/api/billing/issue-key`,
  `/api/billing/charge`, `/api/billing/cancel`, and `/api/webhook/toss`.
- Live Toss automatic billing keys are blocked on business registration,
  merchant contract/review, and automatic-billing MID approval.

## Official References

- NTS business registration:
  https://g.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7777&mi=2444
- Toss automatic billing overview:
  https://docs.tosspayments.com/guides/v2/billing
- Toss automatic billing integration:
  https://docs.tosspayments.com/guides/v2/billing/integration
- Toss business number glossary:
  https://docs.tosspayments.com/resources/glossary/business-no
- Toss online business / mail-order sales glossary:
  https://docs.tosspayments.com/resources/glossary/online-business

## Current Decisions

- Business form: personal business first, unless tax/legal advice says
  otherwise.
- Payment provider: Toss Payments automatic billing for v1.
- Product type for review: subscription SaaS / productivity app.
- Production domain: `justdo.co.kr`, with canonical app URL
  `https://www.justdo.co.kr`.
- Webhook URL after approval:
  `https://www.justdo.co.kr/api/webhook/toss`.

## Decisions Still Needed

These need the owner's confirmation before filing applications.

1. Trade name
   - Recommended: use a Korean/English name that clearly maps to Just Do.
   - Needs consistency across business registration, Toss application, website
     footer, privacy policy, terms, and payment descriptor.

2. Business address
   - Decide whether to use home address, office address, or a virtual office
     that is acceptable for business registration and public merchant
     disclosure.
   - This affects the business registration certificate and may appear in
     online business disclosures.

3. Tax type
   - NTS separates personal businesses into simplified and general taxpayers
     based on expected annual supply amount. The NTS page currently states
     simplified taxpayer threshold as expected annual supply amount below
     KRW 104,000,000, with exclusion cases.
   - Recommended: confirm with a tax professional before choosing. For a small
     v1 SaaS launch, simplified taxpayer may be practical if eligible, but PG
     review, invoicing, and future B2B sales should be considered.

4. Business category / industry code
   - Likely direction: information/communication or software/SaaS service,
     plus online sales/mail-order if required by the application flow.
   - Needs final confirmation in Hometax or with a tax professional because
     industry code affects tax reporting.

5. Mail-order sales report
   - Toss states that selling online services or goods requires mail-order
     sales reporting unless an exemption applies.
   - Even if an early-stage exemption might apply, recommended for v1:
     complete the report if the application flow and local government allow it,
     because Toss/PG review and the production footer benefit from having the
     report number ready.

## Owner Checklist

### 1. Prepare business registration inputs

- [ ] Decide trade name.
- [ ] Decide business address.
- [ ] Decide tax type after checking eligibility.
- [ ] Decide business category / industry code.
- [ ] Prepare representative identity/authentication method for Hometax.
- [ ] Prepare lease/office proof if the selected address requires it.

### 2. File business registration

- [ ] Apply through Hometax or a tax office.
- [ ] Download/store business registration certificate after approval.
- [ ] Record business number and registered trade name.
- [ ] Verify the business status lookup shows the new business as active.

### 3. Prepare mail-order sales report

- [ ] Confirm whether reporting is required or exempt for this exact business
  state.
- [ ] If filing, prepare the business registration certificate and any required
  purchase-safety/escrow confirmation or PG/onboarding-provided document.
- [ ] File through the applicable government/local-government flow.
- [ ] Download/store the mail-order sales report certificate.
- [ ] Record the report number for the website footer and Toss application.

### 4. Prepare Toss application

- [ ] Create or use Toss Payments business account.
- [ ] Start electronic payment / automatic billing application.
- [ ] Submit business registration certificate.
- [ ] Submit mail-order sales report certificate or exemption explanation if
  applicable.
- [ ] Enter production domain: `https://www.justdo.co.kr`.
- [ ] Enter service/product description: Just Do Pro subscription, productivity
  web/iOS app, monthly/yearly recurring subscription.
- [ ] Enter pricing: monthly KRW 1,900 / yearly KRW 9,900.
- [ ] Request automatic billing / recurring subscription support.

### 5. After Toss approval

- [ ] Confirm automatic-billing MID is issued.
- [ ] Copy live client key and live secret key for the automatic-billing MID.
- [ ] Register webhook URL:
  `https://www.justdo.co.kr/api/webhook/toss`.
- [ ] Record the webhook signature secret/header details from the Toss
  dashboard.
- [ ] Update Amplify environment variables:
  - `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`
  - `TOSS_PAYMENTS_SECRET_KEY`
- [ ] Redeploy Amplify.
- [ ] Implement/enable Toss webhook signature verification in
  `apps/web/src/app/api/webhook/toss/route.ts`.
- [ ] Run production billing smoke test with a real low-risk account.

## Product Compliance Checklist

Before submitting the Toss application, the production site should clearly show:

- [ ] Service name and operator/business information.
- [ ] Pricing: monthly KRW 1,900 / yearly KRW 9,900.
- [ ] Trial policy: 30-day trial, then automatic billing.
- [ ] Recurring billing consent copy in the billing flow.
- [ ] Cancellation policy and path: Settings -> Subscription -> Cancel.
- [ ] Refund policy.
- [ ] Privacy policy.
- [ ] Terms of service.
- [ ] Contact email.
- [ ] Business registration number after issuance.
- [ ] Mail-order sales report number after issuance, unless exempt.

## Notes

- Toss documents state that automatic billing requires additional risk review
  and contract, and that it is limited by policy if the service is not a
  recurring subscription service.
- Toss documents also state that, after electronic payment contract completion,
  the app should use the client/secret keys for the automatic-billing MID.
- Toss documents state that the app is responsible for scheduling recurring
  billing calls. The Just Do route for that exists, but the cron scheduler is
  still a separate code task.
- This document is operational planning, not legal or tax advice. Final tax
  type, industry code, and mail-order reporting decisions should be checked
  against Hometax/local government guidance or a tax professional.
