import { createPrivateKey, sign } from "node:crypto";

export type AppleServerConfiguration = {
  clientId: string;
  keyId: string;
  teamId: string;
  privateKeyBase64: string;
};
export type AppleRevocationFailureCode =
  | "apple_not_configured"
  | "apple_exchange_failed"
  | "apple_identity_mismatch"
  | "apple_revoke_failed";

export class AppleRevocationError extends Error {
  constructor(public readonly code: AppleRevocationFailureCode) {
    super(code);
    this.name = "AppleRevocationError";
  }
}

type AppleTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
};

const base64Url = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const jwtSubject = (token: string): string | null => {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      sub?: unknown;
    };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

export const createAppleClientSecret = (
  configuration: AppleServerConfiguration,
  now = new Date(),
): string => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = { alg: "ES256", kid: configuration.keyId };
  const payload = {
    iss: configuration.teamId,
    iat: issuedAt,
    exp: issuedAt + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: configuration.clientId,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const pem = Buffer.from(configuration.privateKeyBase64, "base64").toString("utf8");
  const signature = sign("SHA256", Buffer.from(signingInput), {
    key: createPrivateKey(pem),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${base64Url(signature)}`;
};

export const revokeAppleAuthorization = async ({
  authorizationCode,
  expectedSubject,
  configuration,
  fetchImpl = fetch,
}: {
  authorizationCode: string;
  expectedSubject: string;
  configuration: AppleServerConfiguration;
  fetchImpl?: typeof fetch;
}): Promise<void> => {
  let clientSecret: string;
  try {
    clientSecret = createAppleClientSecret(configuration);
  } catch {
    throw new AppleRevocationError("apple_not_configured");
  }

  const exchangeResponse = await fetchImpl("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
  });
  if (!exchangeResponse.ok) {
    throw new AppleRevocationError("apple_exchange_failed");
  }

  const tokenResponse = (await exchangeResponse.json()) as AppleTokenResponse;
  const idToken =
    typeof tokenResponse.id_token === "string" ? tokenResponse.id_token : null;
  if (!idToken || jwtSubject(idToken) !== expectedSubject) {
    throw new AppleRevocationError("apple_identity_mismatch");
  }

  const refreshToken =
    typeof tokenResponse.refresh_token === "string"
      ? tokenResponse.refresh_token
      : null;
  const accessToken =
    typeof tokenResponse.access_token === "string" ? tokenResponse.access_token : null;
  const token = refreshToken ?? accessToken;
  if (!token) {
    throw new AppleRevocationError("apple_exchange_failed");
  }

  const revokeResponse = await fetchImpl("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: refreshToken ? "refresh_token" : "access_token",
    }),
  });
  if (!revokeResponse.ok) {
    throw new AppleRevocationError("apple_revoke_failed");
  }
};
