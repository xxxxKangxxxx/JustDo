import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { TossBillingPlanInterval } from "./toss";

export const constantTimeEquals = (actual: string | null, expected: string) => {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
};

export const authorizedBearer = (actualHeader: string | null, secret: string | undefined) => {
  if (!secret) return false;
  return constantTimeEquals(actualHeader, `Bearer ${secret}`);
};

export const authorizedSharedSecret = (
  actualHeader: string | null,
  secret: string | undefined,
) => {
  if (!secret) return false;
  return constantTimeEquals(actualHeader, secret);
};

const daysInUtcMonth = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export const addBillingInterval = (
  anchor: Date,
  interval: TossBillingPlanInterval,
) => {
  const monthsToAdd = interval === "yearly" ? 12 : 1;
  const sourceYear = anchor.getUTCFullYear();
  const sourceMonth = anchor.getUTCMonth();
  const targetMonth = sourceMonth + monthsToAdd;
  const targetYear = sourceYear + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
  const targetDay = Math.min(
    anchor.getUTCDate(),
    daysInUtcMonth(targetYear, normalizedTargetMonth),
  );

  return new Date(Date.UTC(
    targetYear,
    normalizedTargetMonth,
    targetDay,
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds(),
    anchor.getUTCMilliseconds(),
  ));
};
