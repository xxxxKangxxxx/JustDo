import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  firstWeekday,
  formatTime,
  isoOf,
  monthCalendar,
  parseISO,
  weekdayLabels,
  weekdayOfISO,
} from "./date";

describe("isoOf / parseISO", () => {
  it("zero-pads month and day", () => {
    expect(isoOf(2026, 4, 7)).toBe("2026-04-07");
    expect(isoOf(2026, 12, 31)).toBe("2026-12-31");
  });

  it("round-trips", () => {
    expect(parseISO("2026-04-07")).toEqual({ year: 2026, month: 4, day: 7 });
  });
});

describe("addDays", () => {
  it("crosses month boundary", () => {
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
  });

  it("crosses year boundary backwards", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("returns same iso for n=0", () => {
    expect(addDays("2026-04-07", 0)).toBe("2026-04-07");
  });
});

describe("addMonths", () => {
  it("rolls into next year", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("rolls into previous year", () => {
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("daysInMonth", () => {
  it("handles leap February", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it("handles non-leap February", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("handles 31-day months", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 7)).toBe(31);
  });
});

describe("firstWeekday / weekdayOfISO", () => {
  it("returns Sunday=0 for 2026-03-01", () => {
    expect(firstWeekday(2026, 3)).toBe(0);
    expect(weekdayOfISO("2026-03-01")).toBe(0);
  });

  it("returns Wednesday=3 for 2026-04-01", () => {
    expect(firstWeekday(2026, 4)).toBe(3);
  });
});

describe("weekdayLabels", () => {
  it("starts on Sunday by default", () => {
    expect(weekdayLabels()).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });

  it("rotates to Monday-first when weekStart=1", () => {
    expect(weekdayLabels(1)).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
  });
});

describe("monthCalendar", () => {
  it("April 2026 starts on Wednesday with Sunday-first", () => {
    const cells = monthCalendar(2026, 4, 0);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 3).every((cell) => cell.muted)).toBe(true);
    expect(cells[3]).toEqual({ day: 1, iso: "2026-04-01", muted: false });
    const lastReal = cells.findLast((cell) => !cell.muted);
    expect(lastReal).toEqual({ day: 30, iso: "2026-04-30", muted: false });
  });

  it("April 2026 with Monday-first shifts the leading offset by one", () => {
    const cells = monthCalendar(2026, 4, 1);
    expect(cells.slice(0, 2).every((cell) => cell.muted)).toBe(true);
    expect(cells[2]).toEqual({ day: 1, iso: "2026-04-01", muted: false });
  });

  it("March 2026 starts on Sunday with no leading offset under Sunday-first", () => {
    const cells = monthCalendar(2026, 3, 0);
    expect(cells[0]).toEqual({ day: 1, iso: "2026-03-01", muted: false });
  });

  it("March 2026 with Monday-first prepends six muted leading cells", () => {
    const cells = monthCalendar(2026, 3, 1);
    expect(cells.slice(0, 6).every((cell) => cell.muted)).toBe(true);
    expect(cells[6]).toEqual({ day: 1, iso: "2026-03-01", muted: false });
  });

  it("pads trailing cells to a multiple of seven when the month does not end on the last column", () => {
    const cells = monthCalendar(2026, 4, 0);
    expect(cells.length % 7).toBe(0);
    expect(cells.at(-1)?.muted).toBe(true);
  });

  it("does not over-pad when the month already ends on the last column", () => {
    const cells = monthCalendar(2026, 2, 0);
    expect(cells.length).toBe(28);
    expect(cells.at(-1)).toEqual({ day: 28, iso: "2026-02-28", muted: false });
  });
});

describe("formatTime", () => {
  it("returns empty string when missing", () => {
    expect(formatTime(undefined)).toBe("");
    expect(formatTime(null)).toBe("");
  });

  it("formats noon and midnight", () => {
    expect(formatTime("12:00")).toBe("오후 12시");
    expect(formatTime("00:00")).toBe("오전 12시");
  });

  it("formats with minutes", () => {
    expect(formatTime("14:05")).toBe("오후 2:05");
    expect(formatTime("09:30")).toBe("오전 9:30");
  });
});
