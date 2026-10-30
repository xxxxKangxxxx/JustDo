// Settings → 외부 연동: talks to /api/integrations/tokens with the user's session.
import { getSupabaseClient } from "@/lib/supabase/client";

export type IntegrationTokenInfo = {
  id: string;
  source: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

/** Services we know about. Anything else can be typed as a custom id. */
export const KNOWN_SOURCES: { id: string; name: string; hint: string }[] = [
  { id: "get_a_job", name: "취업 일정 (get_a_job)", hint: "지원하기로 한 공고의 서류 접수 기간을 할 일로 가져와요." },
];

export const sourceName = (id: string) => KNOWN_SOURCES.find((s) => s.id === id)?.name ?? id;

const ERRORS: Record<string, string> = {
  invalid_session: "로그인이 필요해요. 다시 로그인해 주세요.",
  invalid_source: "연동 서비스 이름은 영문 소문자·숫자·-·_ 로 40자까지 쓸 수 있어요.",
  invalid_label: "메모는 60자까지 쓸 수 있어요.",
  too_many_tokens: "연동은 10개까지 만들 수 있어요. 안 쓰는 연동을 끊어 주세요.",
  not_found: "이미 끊긴 연동이에요.",
};

export class IntegrationError extends Error {}

async function call<T>(method: string, query = "", body?: unknown): Promise<T> {
  const { data } = await getSupabaseClient().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new IntegrationError(ERRORS.invalid_session);
  const res = await fetch(`/api/integrations/tokens${query}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new IntegrationError(ERRORS[json.error ?? ""] ?? "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  return json;
}

export const listIntegrationTokens = () => call<{ tokens: IntegrationTokenInfo[] }>("GET").then((r) => r.tokens);

export const createIntegrationToken = (source: string, label: string) =>
  call<{ token: string; info: IntegrationTokenInfo }>("POST", "", { source, label });

export const revokeIntegrationToken = (id: string) =>
  call<{ ok: true }>("DELETE", `?id=${encodeURIComponent(id)}`);

/** Where external services send tasks. */
export const integrationEndpoint = () =>
  `${typeof window === "undefined" ? "https://www.justdo.co.kr" : window.location.origin}/api/integrations/tasks`;
