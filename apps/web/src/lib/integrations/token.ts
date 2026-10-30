// Integration tokens: "jd_int_" + 32 random bytes (base64url). Only the
// SHA-256 hash is stored in public.integration_tokens.
import { createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "jd_int_";

export const newIntegrationToken = () => `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

export const hashIntegrationToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const bearerToken = (request: Request): string | null => {
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];
  return token && token.startsWith(TOKEN_PREFIX) && token.length <= 200 ? token : null;
};

/** Today in Korea (YYYY-MM-DD). Tasks use local dates. */
export const todayKST = (now = new Date()) => new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
