const DEFAULT_TIMEOUT_MS = 25_000;

const env = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

const timeoutMs = () => {
  const raw = process.env.BILLING_CHARGE_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("BILLING_CHARGE_TIMEOUT_MS must be a positive integer.");
  }
  return parsed;
};

export const handler = async (event = {}) => {
  const url = env("BILLING_CHARGE_URL");
  const secret = env("BILLING_CRON_SECRET");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "User-Agent": "justdo-billing-cron/1.0",
    },
    body: JSON.stringify({
      source: "aws.eventbridge.scheduler",
      scheduleTime: event.time ?? null,
    }),
    signal: AbortSignal.timeout(timeoutMs()),
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `Billing charge failed with ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return {
    ok: true,
    status: response.status,
    body,
  };
};
