import { addDays, isoOf, parseISO } from "./date";

export type KoreanPublicHoliday = {
  date: string;
  name: string;
  isSubstitute: boolean;
};

type SubstitutePolicy = "none" | "saturdayOrSunday" | "sundayOnly";

type BaseHoliday = {
  date: string;
  name: string;
  substitutePolicy: SubstitutePolicy;
};

const oneOffHolidays: Record<string, string> = {
  "2024-04-10": "제22대 국회의원 선거",
  "2024-10-01": "국군의 날 임시공휴일",
  "2025-01-27": "임시공휴일",
  "2025-06-03": "제21대 대통령 선거",
  "2026-06-03": "제9회 전국동시지방선거",
};

const chineseCalendar = new Intl.DateTimeFormat("en-u-ca-chinese", {
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const cache = new Map<number, ReadonlyMap<string, KoreanPublicHoliday>>();

export const koreanPublicHoliday = (iso: string) => {
  const { year } = parseISO(iso);
  return koreanPublicHolidays(year).get(iso);
};

export const koreanPublicHolidays = (
  year: number,
): ReadonlyMap<string, KoreanPublicHoliday> => {
  const cached = cache.get(year);
  if (cached) return cached;

  const bases = baseHolidays(year);
  const namesByDate = new Map<string, string[]>();
  bases.forEach((holiday) => {
    namesByDate.set(holiday.date, [
      ...(namesByDate.get(holiday.date) ?? []),
      holiday.name,
    ]);
  });

  const substitutes = new Map<string, string>();
  [...bases]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((holiday) => {
      if (holiday.substitutePolicy === "none") return;
      const weekday = weekdayInSeoul(holiday.date);
      const overlapsAnotherHoliday = (namesByDate.get(holiday.date)?.length ?? 0) > 1;
      const needsSubstitute = holiday.substitutePolicy === "saturdayOrSunday"
        ? weekday === 0 || weekday === 6 || overlapsAnotherHoliday
        : weekday === 0 || overlapsAnotherHoliday;
      if (!needsSubstitute) return;

      let candidate = addDays(holiday.date, 1);
      while (true) {
        const candidateWeekday = weekdayInSeoul(candidate);
        const isWeekend = candidateWeekday === 0 || candidateWeekday === 6;
        if (
          !isWeekend &&
          !namesByDate.has(candidate) &&
          !substitutes.has(candidate)
        ) {
          substitutes.set(candidate, `대체공휴일 (${holiday.name})`);
          break;
        }
        candidate = addDays(candidate, 1);
      }
    });

  const result = new Map<string, KoreanPublicHoliday>();
  namesByDate.forEach((names, date) => {
    result.set(date, { date, name: names.join(" · "), isSubstitute: false });
  });
  substitutes.forEach((name, date) => {
    result.set(date, { date, name, isSubstitute: true });
  });
  cache.set(year, result);
  return result;
};

const baseHolidays = (year: number) => {
  const holidays: BaseHoliday[] = [];
  const add = (
    month: number,
    day: number,
    name: string,
    substitutePolicy: SubstitutePolicy = "none",
  ) => {
    holidays.push({
      date: isoOf(year, month, day),
      name,
      substitutePolicy,
    });
  };

  add(1, 1, "신정");
  add(3, 1, "삼일절", "saturdayOrSunday");
  if (year >= 2026) add(5, 1, "노동절", "saturdayOrSunday");
  add(5, 5, "어린이날", "saturdayOrSunday");
  add(6, 6, "현충일");
  if (year >= 2026) add(7, 17, "제헌절", "saturdayOrSunday");
  add(8, 15, "광복절", "saturdayOrSunday");
  add(10, 3, "개천절", "saturdayOrSunday");
  add(10, 9, "한글날", "saturdayOrSunday");
  add(12, 25, "기독탄신일", "saturdayOrSunday");

  const lunarNewYear = lunarDateInGregorianYear(year, 1, 1);
  if (lunarNewYear) {
    addLunarSequence(
      lunarNewYear,
      ["설날 전날", "설날", "설날 다음 날"],
      "sundayOnly",
      holidays,
    );
  }

  const buddhasBirthday = lunarDateInGregorianYear(year, 4, 8);
  if (buddhasBirthday) {
    holidays.push({
      date: buddhasBirthday,
      name: "부처님오신날",
      substitutePolicy: "saturdayOrSunday",
    });
  }

  const chuseok = lunarDateInGregorianYear(year, 8, 15);
  if (chuseok) {
    addLunarSequence(
      chuseok,
      ["추석 전날", "추석", "추석 다음 날"],
      "sundayOnly",
      holidays,
    );
  }

  Object.entries(oneOffHolidays).forEach(([date, name]) => {
    if (date.startsWith(`${year}-`)) {
      holidays.push({ date, name, substitutePolicy: "none" });
    }
  });
  return holidays;
};

const addLunarSequence = (
  centeredOn: string,
  names: [string, string, string],
  substitutePolicy: SubstitutePolicy,
  holidays: BaseHoliday[],
) => {
  [-1, 0, 1].forEach((offset, index) => {
    holidays.push({
      date: addDays(centeredOn, offset),
      name: names[index],
      substitutePolicy,
    });
  });
};

const lunarDateInGregorianYear = (
  year: number,
  targetMonth: number,
  targetDay: number,
) => {
  const days = (new Date(Date.UTC(year + 1, 0, 1)).getTime()
    - new Date(Date.UTC(year, 0, 1)).getTime()) / 86_400_000;
  for (let offset = 0; offset < days; offset += 1) {
    // Noon in Seoul keeps the Gregorian date stable in every browser time zone.
    const date = new Date(Date.UTC(year, 0, 1 + offset, 3));
    const parts = chineseCalendar.formatToParts(date);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = Number(parts.find((part) => part.type === "day")?.value);
    // Leap months are formatted as values such as "2bis", so this exact match
    // intentionally ignores them.
    if (month === String(targetMonth) && day === targetDay) {
      return isoOf(year, date.getUTCMonth() + 1, date.getUTCDate());
    }
  }
  return undefined;
};

const weekdayInSeoul = (iso: string) =>
  new Date(`${iso}T12:00:00+09:00`).getUTCDay();
