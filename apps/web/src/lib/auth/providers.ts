import type { AuthProviderId } from "./useAuth";

export type AuthProviderConfig = {
  id: AuthProviderId;
  label: string;
  enabled: boolean;
  unavailableLabel: string;
};

export const authProviders: AuthProviderConfig[] = [
  {
    id: "google",
    label: "Google로 로그인",
    enabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false",
    unavailableLabel: "Google 로그인 준비 중",
  },
  {
    id: "apple",
    label: "Apple로 로그인",
    enabled: process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true",
    unavailableLabel: "Apple 로그인 준비 중",
  },
];
