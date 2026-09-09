import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  AppleRevocationError,
  createAppleClientSecret,
  revokeAppleAuthorization,
  type AppleServerConfiguration,
} from "./apple";

const privateKey = generateKeyPairSync("ec", { namedCurve: "P-256" })
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();

const configuration: AppleServerConfiguration = {
  clientId: "kr.justdo.app",
  keyId: "TESTKEY123",
  teamId: "TESTTEAM12",
  privateKeyBase64: Buffer.from(privateKey).toString("base64"),
};

const unsignedIdToken = (subject: string): string =>
  `header.${Buffer.from(JSON.stringify({ sub: subject })).toString("base64url")}.signature`;

describe("Apple account-deletion token handling", () => {
  it("creates a short-lived ES256 client secret for the native app", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const token = createAppleClientSecret(configuration, now);
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));

    expect(header).toEqual({ alg: "ES256", kid: "TESTKEY123" });
    expect(payload).toMatchObject({
      iss: "TESTTEAM12",
      aud: "https://appleid.apple.com",
      sub: "kr.justdo.app",
    });
    expect(payload.exp - payload.iat).toBe(300);
    expect(signaturePart).toBeTruthy();
  });

  it("exchanges a matching authorization code and revokes the refresh token", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id_token: unsignedIdToken("apple-user-1"),
            refresh_token: "apple-refresh-token",
            access_token: "apple-access-token",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await revokeAppleAuthorization({
      authorizationCode: "one-time-code",
      expectedSubject: "apple-user-1",
      configuration,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://appleid.apple.com/auth/token");
    const exchangeBody = fetchImpl.mock.calls[0][1]?.body as URLSearchParams;
    expect(exchangeBody.get("code")).toBe("one-time-code");
    expect(exchangeBody.get("client_id")).toBe("kr.justdo.app");

    expect(fetchImpl.mock.calls[1][0]).toBe("https://appleid.apple.com/auth/revoke");
    const revokeBody = fetchImpl.mock.calls[1][1]?.body as URLSearchParams;
    expect(revokeBody.get("token")).toBe("apple-refresh-token");
    expect(revokeBody.get("token_type_hint")).toBe("refresh_token");
  });

  it("refuses to revoke or delete for a different Apple subject", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id_token: unsignedIdToken("different-user"),
          refresh_token: "apple-refresh-token",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      revokeAppleAuthorization({
        authorizationCode: "one-time-code",
        expectedSubject: "apple-user-1",
        configuration,
        fetchImpl,
      }),
    ).rejects.toMatchObject<Partial<AppleRevocationError>>({
      code: "apple_identity_mismatch",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
