// Just Do — interactive store
// All app state lives here, persisted to localStorage.
// Screens read via useStore() and dispatch via store.* methods.

const STORE_KEY = 'just-do/v2';

// April 2026 reference (today = 21 Tuesday)
const TODAY_ISO = '2026-04-21';

// Date math helpers — work in YYYY-MM-DD strings
const isoOf = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
const dim = (y, m) => new Date(y, m, 0).getDate(); // m=1-12
const firstWeekday = (y, m) => new Date(y, m - 1, 1).getDay(); // 0=Sun
const addDays = (iso, n) => {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(y, m - 1, d + n);
  return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};
const addMonths = (y, m, n) => {
  const dt = new Date(y, m - 1 + n, 1);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1 };
};
const weekdayOfISO = (iso) => { const { y, m, d } = parseISO(iso); return new Date(y, m - 1, d).getDay(); };

const initialState = () => ({
  view: { tab: 'home', screen: null, year: 2026, month: 4, selectedDate: TODAY_ISO, calendarMode: 'month', dark: false, sheet: null },
  tasks: [
    // multi-day
    { id: 't_samsung', title: '삼성전자 지원', cat: 'me', start: '2026-04-01', end: '2026-04-21', priority: 'high', done: false, time: null, tags: ['#취업','#면접'] },
    { id: 't_portfolio', title: '포트폴리오 정리', cat: 'me', start: '2026-04-06', end: '2026-04-12', priority: 'mid', done: true, tags: ['#작업'] },
    { id: 't_proj', title: '프로젝트 A 런칭', cat: 'ext', start: '2026-04-13', end: '2026-04-24', priority: 'high', done: false, tags: ['#팀'] },
    { id: 't_trip', title: '부산 출장', cat: 'ext', start: '2026-04-27', end: '2026-04-29', priority: 'mid', done: false, tags: ['#출장'] },
    // single-day
    { id: 't_book', title: '독서 30분', cat: 'me', start: '2026-04-21', end: '2026-04-21', done: true, tags: [] },
    { id: 't_pf', title: '포트폴리오 피드백 반영', cat: 'me', start: '2026-04-21', end: '2026-04-21', done: false, time: '21:00', tags: [] },
    { id: 't_meet', title: '업체 미팅', cat: 'ext', start: '2026-04-21', end: '2026-04-21', done: false, time: '14:00', priority: 'high', tags: ['#미팅'] },
    { id: 't_report', title: '팀 보고서 제출', cat: 'ext', start: '2026-04-15', end: '2026-04-21', done: false, tags: [] },
    // earlier
    { id: 't_d2', title: '주간 회고', cat: 'me', start: '2026-04-04', end: '2026-04-04', done: true, tags: [] },
    { id: 't_d3', title: '디자인 시스템 정리', cat: 'me', start: '2026-04-08', end: '2026-04-08', done: true, tags: [] },
    { id: 't_d4', title: '월간 결산', cat: 'ext', start: '2026-04-10', end: '2026-04-10', done: true, tags: [] },
    { id: 't_d5', title: '예산 검토', cat: 'ext', start: '2026-04-25', end: '2026-04-25', done: false, tags: [] },
  ],
  habits: [
    { id: 'h_run', title: '운동 30분', emoji: '🏃', startedAt: '2026-04-10', cat: 'habit',
      log: { '2026-04-10': 1, '2026-04-11': 1, '2026-04-13': 1, '2026-04-14': 1, '2026-04-15': 1, '2026-04-17': 1, '2026-04-18': 1, '2026-04-19': 1, '2026-04-20': 1, '2026-04-21': 1, '2026-04-14': 1 } },
    { id: 'h_water', title: '물 2L', emoji: '💧', startedAt: '2026-03-25', cat: 'habit',
      log: Object.fromEntries(Array.from({length: 28}, (_, i) => [addDays('2026-03-25', i), 1])) },
    { id: 'h_stretch', title: '아침 스트레칭', emoji: '🧘', startedAt: '2026-04-17', cat: 'habit',
      log: { '2026-04-17': 1, '2026-04-18': 1, '2026-04-19': 1, '2026-04-20': 1, '2026-04-21': 0 } },
    { id: 'h_read', title: '독서', emoji: '📖', startedAt: '2026-04-15', cat: 'habit',
      log: { '2026-04-15': 1, '2026-04-17': 1, '2026-04-18': 1, '2026-04-19': 1, '2026-04-20': 1, '2026-04-21': 1, '2026-04-14': 1 } },
  ],
  settings: { notify: true, notifyTime: '09:00', weekStart: 0, plan: 'free' },
});

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw);
    const init = initialState();
    // Always reset transient view to defaults
    return { ...init, ...saved, view: { ...init.view, ...(saved.view || {}), screen: null, sheet: null } };
  } catch { return initialState(); }
};

const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  const [state, setState] = React.useState(loadState);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  React.useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [state]);

  const update = (fn) => setState(s => fn(s));

  const api = React.useMemo(() => ({
    state,
    setView: (patch) => update(s => ({ ...s, view: { ...s.view, ...patch } })),
    setDark: (v) => update(s => ({ ...s, view: { ...s.view, dark: v } })),
    setTab: (tab) => update(s => ({ ...s, view: { ...s.view, tab, screen: null } })),
    setMonth: (year, month) => update(s => ({ ...s, view: { ...s.view, year, month } })),
    selectDate: (iso) => update(s => ({ ...s, view: { ...s.view, selectedDate: iso } })),
    openSheet: (kind, payload) => update(s => ({ ...s, view: { ...s.view, sheet: { kind, ...(payload || {}) } } })),
    closeSheet: () => update(s => ({ ...s, view: { ...s.view, sheet: null } })),
    pushScreen: (screen, payload) => update(s => ({ ...s, view: { ...s.view, screen: { kind: screen, ...(payload || {}) } } })),
    popScreen: () => update(s => ({ ...s, view: { ...s.view, screen: null } })),
    toggleTask: (id) => update(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
    addTask: (task) => update(s => ({ ...s, tasks: [...s.tasks, { id: 't_' + Math.random().toString(36).slice(2, 8), done: false, tags: [], ...task }] })),
    updateTask: (id, patch) => update(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })),
    deleteTask: (id) => update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) })),
    toggleHabit: (id, iso) => update(s => ({
      ...s,
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const cur = h.log[iso] || 0;
        return { ...h, log: { ...h.log, [iso]: cur ? 0 : 1 } };
      }),
    })),
    addHabit: (habit) => update(s => ({ ...s, habits: [...s.habits, { id: 'h_' + Math.random().toString(36).slice(2, 8), log: {}, cat: 'habit', startedAt: TODAY_ISO, ...habit }] })),
    updateSetting: (k, v) => update(s => ({ ...s, settings: { ...s.settings, [k]: v } })),
    reset: () => setState(initialState()),
  }), [state]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

const useStore = () => React.useContext(StoreCtx);

// Helpers used by screens
const tasksOnDate = (tasks, iso) => tasks.filter(t => t.start <= iso && iso <= t.end);
const tasksInRange = (tasks, startISO, endISO) => tasks.filter(t => !(t.end < startISO || t.start > endISO));
const habitStreak = (habit, today = TODAY_ISO) => {
  let n = 0, cur = today;
  while (habit.log[cur]) { n++; cur = addDays(cur, -1); }
  return n;
};

Object.assign(window, {
  StoreProvider, useStore, StoreCtx,
  TODAY_ISO, isoOf, parseISO, dim, firstWeekday, addDays, addMonths, weekdayOfISO,
  tasksOnDate, tasksInRange, habitStreak,
});
