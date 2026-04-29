"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseClient, type Supabase } from "@/lib/supabase/client";

export type AuthProviderId = "apple" | "google";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName?: string;
  avatarUrl?: string;
};

export type AuthStatus = "loading" | "signedIn" | "signedOut";

type AuthValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  clearError: () => void;
  signInWithProvider: (provider: AuthProviderId) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const profileString = (
  metadata: SupabaseUser["user_metadata"],
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
};

export const toAuthUser = (user: SupabaseUser): AuthUser => ({
  id: user.id,
  email: user.email ?? null,
  displayName: profileString(user.user_metadata, ["display_name", "full_name", "name"]),
  avatarUrl: profileString(user.user_metadata, ["avatar_url", "picture"]),
});

export const userFromSession = (session: Session | null): AuthUser | null =>
  session?.user ? toAuthUser(session.user) : null;

export const signInWithSupabaseProvider = async (
  auth: Supabase["auth"],
  provider: AuthProviderId,
  origin: string | undefined,
) => {
  const { error } = await auth.signInWithOAuth({
    provider,
    options: origin ? { redirectTo: `${origin}/callback` } : undefined,
  });
  if (error) throw error;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const nextUser = userFromSession(data.session);
        setUser(nextUser);
        setStatus(nextUser ? "signedIn" : "signedOut");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setUser(null);
        setStatus("signedOut");
        setError(authErrorMessage(err));
      });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = userFromSession(session);
      setUser(nextUser);
      setStatus(nextUser ? "signedIn" : "signedOut");
      setError(null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = useCallback(async (provider: AuthProviderId) => {
    const client = getSupabaseClient();
    const origin =
      typeof window === "undefined" ? undefined : window.location.origin;
    setError(null);
    try {
      await signInWithSupabaseProvider(client.auth, provider, origin);
    } catch (err) {
      setError(authErrorMessage(err));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    setError(null);
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(authErrorMessage(signOutError));
      throw signOutError;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthValue>(
    () => ({ user, status, error, clearError, signInWithProvider, signOut }),
    [user, status, error, clearError, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

const authErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  return "인증 처리 중 문제가 발생했습니다.";
};
