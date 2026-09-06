import { describe, expect, it } from "vitest";
import {
  koreanPublicHoliday,
  koreanPublicHolidays,
} from "./korean-public-holidays";

describe("koreanPublicHolidays", () => {
  it("includes 2026 recurring and lunar holidays", () => {
    expect(koreanPublicHoliday("2026-01-01")?.name).toBe("신정");
    expect(koreanPublicHoliday("2026-02-17")?.name).toBe("설날");
    expect(koreanPublicHoliday("2026-05-24")?.name).toBe("부처님오신날");
    expect(koreanPublicHoliday("2026-09-25")?.name).toBe("추석");
  });

  it("includes 2026 substitute holidays", () => {
    expect(koreanPublicHoliday("2026-03-02")).toEqual({
      date: "2026-03-02",
      name: "대체공휴일 (삼일절)",
      isSubstitute: true,
    });
    expect(koreanPublicHoliday("2026-05-25")?.name).toBe(
      "대체공휴일 (부처님오신날)",
    );
    expect(koreanPublicHoliday("2026-08-17")?.name).toBe(
      "대체공휴일 (광복절)",
    );
    expect(koreanPublicHoliday("2026-10-05")?.name).toBe(
      "대체공휴일 (개천절)",
    );
  });

  it("includes overrides and excludes ordinary dates", () => {
    const holidays = koreanPublicHolidays(2026);
    expect(holidays.get("2026-05-01")?.name).toBe("노동절");
    expect(holidays.get("2026-06-03")?.name).toBe("제9회 전국동시지방선거");
    expect(holidays.get("2026-07-17")?.name).toBe("제헌절");
    expect(holidays.get("2026-08-04")).toBeUndefined();
  });
});
