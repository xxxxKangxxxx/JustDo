#!/usr/bin/env node
// Generates the Apple "client secret" JWT that Supabase needs for the Sign in
// with Apple *web* OAuth flow. Runs fully locally — the .p8 private key never
// leaves your machine. No external dependencies (Node built-in crypto only).
//
// Usage:
//   node supabase/scripts/generate-apple-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <PATH_TO_.p8>
//
// Example:
//   node supabase/scripts/generate-apple-secret.mjs A1B2C3D4E5 9Z9Z9Z9Z9Z kr.justdo.web ~/Downloads/AuthKey_9ZZZ.p8
//
// Paste the printed JWT into Supabase → Authentication → Providers → Apple →
// "Secret Key (for OAuth)". Apple caps the secret at 6 months, so re-run this
// and update Supabase before it expires.

import crypto from "node:crypto";
import fs from "node:fs";

const [teamId, keyId, servicesId, p8Path] = process.argv.slice(2);

if (!teamId || !keyId || !servicesId || !p8Path) {
  console.error(
    "Usage: node supabase/scripts/generate-apple-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <PATH_TO_.p8>",
  );
  process.exit(1);
}

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
const SIX_MONTHS = 60 * 60 * 24 * 180; // Apple's max is ~6 months.

const header = { alg: "ES256", kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: "https://appleid.apple.com",
  sub: servicesId,
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

const privateKey = crypto.createPrivateKey(fs.readFileSync(p8Path));
// JWS ES256 needs the raw R||S signature (ieee-p1363), not Node's default DER.
const signature = crypto.sign("SHA256", Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});

const jwt = `${signingInput}.${base64url(signature)}`;

console.log("\nApple client secret (paste into Supabase → Apple → Secret Key):\n");
console.log(jwt);
console.log(`\nExpires: ${new Date((now + SIX_MONTHS) * 1000).toISOString()} (regenerate before then)\n`);
