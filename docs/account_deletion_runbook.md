# Account Deletion Deployment and Verification

Updated: 2026-09-09

## Current Status

The account-deletion code and automated checks are complete locally. Production
is not ready until the server-only Apple credentials are registered in AWS
Amplify, the Web route is deployed, and destructive tests pass with disposable
accounts.

The endpoint is `POST https://www.justdo.co.kr/api/account/delete`. It accepts a
Supabase access token in the `Authorization: Bearer` header. Apple identities
also require a fresh native Sign in with Apple authorization code.

## Required Amplify Variables

Register these as server-only environment variables. Never add a
`NEXT_PUBLIC_` prefix and never commit their values.

- `SUPABASE_SERVICE_ROLE_KEY`: existing hosted-project service-role key.
- `APPLE_NATIVE_CLIENT_ID`: `kr.justdo.app`.
- `APPLE_SIGN_IN_TEAM_ID`: Apple Developer Team ID.
- `APPLE_SIGN_IN_KEY_ID`: Key ID for the Sign in with Apple `.p8` key.
- `APPLE_SIGN_IN_PRIVATE_KEY_BASE64`: the complete `.p8` file encoded as one
  base64 line.

On macOS, create the private-key value without printing or committing it:

```bash
base64 -i /secure/path/AuthKey_KEYID.p8 | tr -d '\n' | pbcopy
```

Paste the clipboard value directly into Amplify. If the `.p8` file is no longer
available, create an appropriate replacement key in Apple Developer rather than
putting another private key into the repository.

## Safe Deployment Check

1. Deploy the Web changes through the normal Amplify production workflow.
2. Open `https://www.justdo.co.kr/privacy` signed out and confirm the 시행일 is
   `2026-09-09` and section 5 describes in-app deletion.
3. Send an unauthenticated `POST` to the endpoint. Expected response: HTTP 401
   with `{ "error": "invalid_session" }`. This check deletes nothing.
4. Confirm Amplify logs contain no credential, bearer-token, or Apple
   authorization-code values.

## Destructive Device Check

Do not use the App Review Google demo account or an account whose data must be
preserved.

For a disposable Google account:

1. Sign in and create one Task, Habit, Goal, category, and a pending local
   notification; confirm they sync.
2. Open Settings → account → 회원 탈퇴.
3. Confirm the warning appears, choose `계정 및 데이터 삭제`, and verify the app
   returns to the signed-out screen.
4. Confirm the Auth user and owned database rows are gone, no payment-event row
   retains the user payload, the widget no longer shows the old account, and no
   old notification is delivered.
5. Sign in again with the same Google identity. It must create a clean account
   with none of the deleted data.

Repeat with a disposable Apple identity. The Apple confirmation sheet must
appear before deletion. After completion, also confirm the app is removed from
Settings → Apple Account → Sign in with Apple, or otherwise shows no active
Just Do authorization.

Cancel the destructive alert once and cancel the Apple confirmation once. Both
must leave the account and its data intact and allow a later retry.

## Pass Condition

P0 can be marked complete only after both provider checks pass on the candidate
binary against the deployed endpoint. Automated mocks and the simulator UI test
are supporting evidence, not substitutes for the destructive production-path
checks.

References:

- Apple TN3194, Handling account deletions and revoking tokens for Sign in with
  Apple: https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
- Supabase Auth Admin delete user reference:
  https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
