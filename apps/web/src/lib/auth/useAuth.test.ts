import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  signInWithSupabaseProvider,
  toAuthUser,
  userFromSession,
} from "./useAuth";

const session = {
  user: {
    id: "user-1",
    email: "user@example.com",
    user_metadata: {
      full_name: "Jimin",
      avatar_url: "https://example.com/avatar.png",
    },
  },
} as Session;

describe("toAuthUser", () => {
  it("maps Supabase user metadata into the auth domain shape", () => {
    expect(toAuthUser(session.user)).toEqual({
      id: "user-1",
      email: "user@example.com",
      displayName: "Jimin",
      avatarUrl: "https://example.com/avatar.png",
    });
  });
});

describe("userFromSession", () => {
  it("returns null when there is no session", () => {
    expect(userFromSession(null)).toBeNull();
  });
});

describe("signInWithSupabaseProvider", () => {
  it("starts OAuth sign-in with the callback route", async () => {
    const auth = {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    await signInWithSupabaseProvider(
      auth as never,
      "google",
      "http://localhost:3000",
    );

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/callback" },
    });
  });
});
