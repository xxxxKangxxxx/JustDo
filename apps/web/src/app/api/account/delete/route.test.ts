import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    identities?: Array<{
      id?: string;
      provider?: string;
      identity_data?: Record<string, unknown>;
    }>;
  },
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  paymentDelete: vi.fn(),
  paymentEq: vi.fn(),
  getSupabaseServiceRoleClient: vi.fn(),
  revokeAppleAuthorization: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/service-role", () => ({
  getSupabaseServiceRoleClient: mocks.getSupabaseServiceRoleClient,
}));

vi.mock("@/lib/account-deletion/apple", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/account-deletion/apple")>();
  return {
    ...original,
    revokeAppleAuthorization: mocks.revokeAppleAuthorization,
  };
});
const request = (body?: unknown, accessToken = "supabase-access-token") =>
  new Request("http://test.local/api/account/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  mocks.user = {
    id: "11111111-1111-4111-8111-111111111111",
    identities: [{ id: "google-user-1", provider: "google" }],
  };
  mocks.getUser.mockReset().mockImplementation(async () => ({
    data: { user: mocks.user },
    error: mocks.user ? null : new Error("invalid session"),
  }));
  mocks.deleteUser.mockReset().mockResolvedValue({ error: null });
  mocks.paymentEq.mockReset().mockResolvedValue({ error: null });
  mocks.paymentDelete.mockReset().mockReturnValue({ eq: mocks.paymentEq });
  mocks.getSupabaseServiceRoleClient.mockReset().mockReturnValue({
    auth: {
      getUser: mocks.getUser,
      admin: { deleteUser: mocks.deleteUser },
    },
    from: vi.fn(() => ({ delete: mocks.paymentDelete })),
  });
  mocks.revokeAppleAuthorization.mockReset().mockResolvedValue(undefined);
  process.env.APPLE_NATIVE_CLIENT_ID = "kr.justdo.app";
  process.env.APPLE_SIGN_IN_TEAM_ID = "TESTTEAM12";
  process.env.APPLE_SIGN_IN_KEY_ID = "TESTKEY123";
  process.env.APPLE_SIGN_IN_PRIVATE_KEY_BASE64 = "test-key";
});

describe("POST /api/account/delete", () => {
  it("rejects requests without a bearer session", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://test.local", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_session" });
    expect(mocks.getSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("deletes historical payloads and the authenticated Google account", async () => {
    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.getUser).toHaveBeenCalledWith("supabase-access-token");
    expect(mocks.paymentEq).toHaveBeenCalledWith("user_id", mocks.user?.id);
    expect(mocks.deleteUser).toHaveBeenCalledWith(mocks.user?.id, false);
    expect(mocks.revokeAppleAuthorization).not.toHaveBeenCalled();
  });

  it("requires Apple reauthentication before deleting an Apple account", async () => {
    mocks.user = {
      id: "11111111-1111-4111-8111-111111111111",
      identities: [
        {
          id: "apple-user-1",
          provider: "apple",
          identity_data: { sub: "apple-user-1" },
        },
      ],
    };
    const { POST } = await import("./route");
    const response = await POST(request({}));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "apple_reauthentication_required" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("revokes the matching Apple authorization before deleting the account", async () => {
    mocks.user = {
      id: "11111111-1111-4111-8111-111111111111",
      identities: [
        {
          id: "apple-user-1",
          provider: "apple",
          identity_data: { sub: "apple-user-1" },
        },
      ],
    };
    const { POST } = await import("./route");
    const response = await POST(
      request({ apple_authorization_code: "one-time-apple-code" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.revokeAppleAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationCode: "one-time-apple-code",
        expectedSubject: "apple-user-1",
      }),
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith(mocks.user.id, false);
  });

  it("keeps the Supabase account when Apple revocation fails", async () => {
    mocks.user = {
      id: "11111111-1111-4111-8111-111111111111",
      identities: [{ id: "apple-user-1", provider: "apple" }],
    };
    const { AppleRevocationError } = await import("@/lib/account-deletion/apple");
    mocks.revokeAppleAuthorization.mockRejectedValue(
      new AppleRevocationError("apple_revoke_failed"),
    );
    const { POST } = await import("./route");
    const response = await POST(request({ apple_authorization_code: "bad-code" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "apple_revoke_failed" });
    expect(mocks.paymentDelete).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
