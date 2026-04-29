export const isoOf = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const todayISO = () => {
  const dt = new Date();
  return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

export const parseISO = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

export const firstWeekday = (year: number, month: number) =>
  new Date(year, month - 1, 1).getDay();

export const addDays = (iso: string, n: number) => {
  const { year, month, day } = parseISO(iso);
  const dt = new Date(year, month - 1, day + n);
  return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

export const addMonths = (year: number, month: number, n: number) => {
  const dt = new Date(year, month - 1 + n, 1);
  return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
};

export const weekdayOfISO = (iso: string) => {
  const { year, month, day } = parseISO(iso);
  return new Date(year, month - 1, day).getDay();
};

export type WeekStart = 0 | 1;

export type CalendarCell = { day: number; iso: string; muted: boolean };

const baseWeekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const weekdayLabels = (weekStart: WeekStart = 0) =>
  weekStart === 0
    ? [...baseWeekdayLabels]
    : [...baseWeekdayLabels.slice(1), baseWeekdayLabels[0]];

export const monthCalendar = (
  year: number,
  month: number,
  weekStart: WeekStart = 0,
): CalendarCell[] => {
  const jsDay = new Date(year, month - 1, 1).getDay();
  const offset = (jsDay - weekStart + 7) % 7;
  const days = daysInMonth(year, month);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < offset; i += 1) cells.push({ day: 0, iso: "", muted: true });
  for (let i = 0; i < days; i += 1) {
    const day = i + 1;
    cells.push({ day, iso: isoOf(year, month, day), muted: false });
  }
  while (cells.length % 7) cells.push({ day: 0, iso: "", muted: true });
  return cells;
};

export const formatTime = (hhmm?: string | null) => {
  if (!hhmm) return "";
  const [hour, minute] = hhmm.split(":").map(Number);
  const ampm = hour >= 12 ? "오후" : "오전";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${ampm} ${hour12}시`
    : `${ampm} ${hour12}:${String(minute).padStart(2, "0")}`;
};
