# Deployment, Domain, and AWS Plan

This document tracks the work needed to connect a Gabia-purchased domain and
ship the web app through AWS. The current assumption is:

- Domain registrar: Gabia
- DNS hosting: preferably Amazon Route 53 after purchase
- Web hosting: AWS Amplify Hosting for the Next.js app
- Backend/Auth: hosted Supabase project

## Verification Before Deployment Work

- Confirm `main` is clean and all feature branches needed for release are
  merged.
- Run web checks:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run build
```

- Run iOS checks:

```bash
cd apps/ios
swift test
```

```bash
xcodebuild -project apps/ios/JustDoApp/JustDoApp.xcodeproj -scheme JustDoApp -destination 'generic/platform=iOS Simulator' build
```

## Gabia Domain Purchase

- 2026-05-14 결정: 운영 도메인 = **`justdo.co.kr`** (가비아 구매 완료).
  - root domain: `justdo.co.kr`
  - intended web host: `www.justdo.co.kr`
  - 사업자등록/통신판매업 신고와 함께 `.co.kr` 사용 (Toss 가맹점 트랙과 정렬).
- 2026-05-14 결정: DNS 관리 모드 = **Route 53 위임**.
  - Why: Amplify가 도메인 인증서 records를 자동 생성/갱신, AWS 단일 콘솔 관리,
    가비아 → Route 53 네임서버 1회 교체로 미래 DNS 작업 통합.
  - Cost: hosted zone $0.50/월 + 쿼리당 $0.40/M (예산 $20의 2.5%로 무시 가능).
- 다음 작업:
  - 가비아 계정에서 갱신일 / auto-renew 상태 기록.
  - Route 53 hosted zone 생성 후 4개 NS records 가비아에 등록.

## Route 53 DNS Option

Use this if we want AWS to manage DNS records.

- In AWS Route 53, create a public hosted zone for the purchased domain.
- Copy the four Route 53 name servers from the hosted zone.
- In Gabia domain management, replace the domain's name servers with the Route
  53 name servers.
- Wait for DNS propagation before debugging app-level issues.
- Add records required by Amplify custom domain setup.
- Keep any future email records such as MX/TXT/SPF/DKIM/DMARC documented before
  changing DNS so email is not accidentally broken.

Notes:

- Gabia states that name server changes can take up to 48 hours to propagate.
- AWS notes that domains bought from another registrar can use Route 53 for DNS
  hosting by creating a hosted zone and updating registrar name servers.

## Gabia DNS Option

Use this only if we decide not to delegate DNS to Route 53.

- In Gabia DNS management, add the records AWS/Amplify provides for:
  - domain ownership validation
  - `www` web traffic
  - root/apex domain handling if supported
- Confirm whether Gabia DNS supports the exact record type needed for the apex
  domain. If not, use `www` as primary and redirect apex separately.
- Do not delete existing MX/TXT records without checking email impact.

## AWS Account Setup

- Confirm root account MFA is enabled.
- Create or use an IAM admin role/user for deployment work; avoid daily use of
  the root user.
- Set AWS Budgets or billing alerts before enabling paid services.
- Confirm the target region for Amplify and Route 53 usage.
- Keep production secrets out of Git. Use AWS/Amplify environment variables or
  secret management where appropriate.

## AWS Amplify Hosting

- Connect the GitHub repository to Amplify Hosting.
- Set the app root/build settings for `apps/web`.
- Configure production branch, likely `main`.
- Configure required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Do not put service-role secrets in client-facing Amplify environment
  variables.
- Run the first Amplify build and confirm:
  - install succeeds
  - lint/test/build policy is clear
  - deployed app loads
  - no real secret is printed in build logs

## Custom Domain Connection

- In Amplify, add the custom domain.
- Decide canonical URL:
  - preferred app URL: `https://www.<domain>`
  - optional apex redirect: `https://<domain>` -> `https://www.<domain>`
- Complete DNS validation records in either Route 53 or Gabia DNS.
- Confirm AWS-managed TLS certificate is issued.
- Confirm both URLs resolve as expected:
  - `https://www.<domain>`
  - `https://<domain>`

## Supabase and OAuth Updates

- Add production web callback URL in Supabase Auth settings:
  - `https://www.<domain>/callback`
  - include apex callback only if apex directly serves the app.
- Add the same production authorized redirect URI in Google OAuth settings.
- Keep iOS callback URL:
  - `justdo://auth-callback`
- Confirm hosted Supabase URL and anon key used by Amplify match the intended
  project.

## Post-Deployment Smoke Test

- Visit the production URL in a clean browser profile.
- Confirm signed-out auth landing renders correctly.
- Sign in with Google.
- Confirm `public.users` / subscription seed trigger behavior still works.
- Create a task and habit.
- Refresh the page and confirm data persists.
- Test offline/online behavior from the deployed app.
- Confirm no console error exposes secrets or unexpected Supabase failures.

## References

- AWS Amplify environment variables:
  https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify setting environment variables:
  https://docs.aws.amazon.com/amplify/latest/userguide/setting-env-vars.html
- AWS Route 53 DNS for a domain purchased from another registrar:
  https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-new-domain.html
- Gabia DNS record management:
  https://customer.gabia.com/manual/dns/3041/3040
- Gabia name server management:
  https://customer.gabia.com/manual/domain/286/991
