import { addDays, parseISO, todayISO } from "@/lib/date";
import type { AppState } from "@/types/domain";

const sampleToday = todayISO();
const { year, month } = parseISO(sampleToday);

export const createInitialState = (): AppState => ({
  view: {
    tab: "home",
    year,
    month,
    selectedDate: sampleToday,
    dark: false,
    sheet: null,
    detailTaskId: null,
  },
  tasks: [
    {
      id: "t_portfolio",
      title: "포트폴리오 정리",
      category: "me",
      startDate: addDays(sampleToday, -3),
      endDate: addDays(sampleToday, 2),
      priority: "medium",
      isCompleted: false,
      scheduledTime: null,
      tags: ["#작업"],
    },
    {
      id: "t_interview",
      title: "면접 준비 자료 정리",
      category: "me",
      startDate: sampleToday,
      endDate: addDays(sampleToday, 4),
      priority: "high",
      isCompleted: false,
      scheduledTime: "19:00",
      tags: ["#취업", "#면접"],
    },
    {
      id: "t_meeting",
      title: "업체 미팅",
      category: "ext",
      startDate: sampleToday,
      endDate: sampleToday,
      priority: "high",
      isCompleted: false,
      scheduledTime: "14:00",
      tags: ["#미팅"],
    },
    {
      id: "t_report",
      title: "팀 보고서 제출",
      category: "ext",
      startDate: addDays(sampleToday, -6),
      endDate: sampleToday,
      priority: "medium",
      isCompleted: false,
      scheduledTime: null,
      tags: [],
    },
    {
      id: "t_read",
      title: "독서 30분",
      category: "me",
      startDate: sampleToday,
      endDate: sampleToday,
      priority: "low",
      isCompleted: true,
      scheduledTime: null,
      tags: [],
    },
  ],
  habits: [
    {
      id: "h_run",
      title: "운동 30분",
      emoji: "🏃",
      category: "habit",
      startedAt: addDays(sampleToday, -12),
      log: Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [addDays(sampleToday, i - 8), 1]),
      ),
    },
    {
      id: "h_water",
      title: "물 2L",
      emoji: "💧",
      category: "habit",
      startedAt: addDays(sampleToday, -28),
      log: Object.fromEntries(
        Array.from({ length: 28 }, (_, i) => [addDays(sampleToday, i - 27), 1]),
      ),
    },
    {
      id: "h_stretch",
      title: "아침 스트레칭",
      emoji: "🧘",
      category: "habit",
      startedAt: addDays(sampleToday, -5),
      log: {
        [addDays(sampleToday, -5)]: 1,
        [addDays(sampleToday, -4)]: 1,
        [addDays(sampleToday, -3)]: 1,
        [addDays(sampleToday, -1)]: 1,
      },
    },
  ],
  settings: {
    notify: true,
    notifyTime: "09:00",
    weekStart: 0,
    plan: "free",
  },
});
