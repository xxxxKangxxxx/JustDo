// Web store — shares localStorage key 'just-do/v2' with mobile prototype.
// Adds web-specific view state on top: view mode, multi-select, filters, palette, modal.
const WSTORE_KEY = 'just-do/v2';
const WUI_KEY = 'just-do/web-ui';

const W_TODAY = '2026-04-21';
const wIso = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const wParse = (s) => { const [y,m,d] = s.split('-').map(Number); return {y,m,d}; };
const wDim = (y, m) => new Date(y, m, 0).getDate();
const wFirst = (y, m) => new Date(y, m-1, 1).getDay();
const wAdd = (iso, n) => { const {y,m,d} = wParse(iso); const dt = new Date(y, m-1, d+n); return wIso(dt.getFullYear(), dt.getMonth()+1, dt.getDate()); };
const wWday = (iso) => { const {y,m,d} = wParse(iso); return new Date(y, m-1, d).getDay(); };
const wAddMonths = (y, m, n) => { const dt = new Date(y, m-1+n, 1); return { y: dt.getFullYear(), m: dt.getMonth()+1 }; };
const wWeekStartISO = (iso) => { const wd = wWday(iso); return wAdd(iso, -wd); };

const wInitData = () => ({
  tasks: [
    { id: 't_samsung', title: '삼성전자 지원', cat: 'me', start: '2026-04-01', end: '2026-04-21', priority: 'high', done: false, time: null, tags: ['#취업','#면접'] },
    { id: 't_portfolio', title: '포트폴리오 정리', cat: 'me', start: '2026-04-06', end: '2026-04-12', priority: 'mid', done: true, tags: ['#작업'] },
    { id: 't_proj', title: '프로젝트 A 런칭', cat: 'ext', start: '2026-04-13', end: '2026-04-24', priority: 'high', done: false, tags: ['#팀'] },
    { id: 't_trip', title: '부산 출장', cat: 'ext', start: '2026-04-27', end: '2026-04-29', priority: 'mid', done: false, tags: ['#출장'] },
    { id: 't_book', title: '독서 30분', cat: 'me', start: '2026-04-21', end: '2026-04-21', done: true, tags: [] },
    { id: 't_pf', title: '포트폴리오 피드백 반영', cat: 'me', start: '2026-04-21', end: '2026-04-21', done: false, time: '21:00', tags: [] },
    { id: 't_meet', title: '업체 미팅', cat: 'ext', start: '2026-04-21', end: '2026-04-21', done: false, time: '14:00', priority: 'high', tags: ['#미팅'] },
    { id: 't_report', title: '팀 보고서 제출', cat: 'ext', start: '2026-04-15', end: '2026-04-21', done: false, tags: [] },
    { id: 't_d2', title: '주간 회고', cat: 'me', start: '2026-04-04', end: '2026-04-04', done: true, tags: [] },
    { id: 't_d3', title: '디자인 시스템 정리', cat: 'me', start: '2026-04-08', end: '2026-04-08', done: true, tags: [] },
    { id: 't_d4', title: '월간 결산', cat: 'ext', start: '2026-04-10', end: '2026-04-10', done: true, tags: [] },
    { id: 't_d5', title: '예산 검토', cat: 'ext', start: '2026-04-25', end: '2026-04-25', done: false, tags: [] },
  ],
  habits: [
    { id: 'h_run', title: '운동 30분', emoji: '🏃', startedAt: '2026-04-10', cat: 'habit',
      log: { '2026-04-10':1,'2026-04-11':1,'2026-04-13':1,'2026-04-14':1,'2026-04-15':1,'2026-04-17':1,'2026-04-18':1,'2026-04-19':1,'2026-04-20':1,'2026-04-21':1 } },
    { id: 'h_water', title: '물 2L', emoji: '💧', startedAt: '2026-03-25', cat: 'habit',
      log: Object.fromEntries(Array.from({length: 28}, (_, i) => [wAdd('2026-03-25', i), 1])) },
    { id: 'h_stretch', title: '아침 스트레칭', emoji: '🧘', startedAt: '2026-04-17', cat: 'habit',
      log: { '2026-04-17':1,'2026-04-18':1,'2026-04-19':1,'2026-04-20':1 } },
    { id: 'h_read', title: '독서', emoji: '📖', startedAt: '2026-04-15', cat: 'habit',
      log: { '2026-04-15':1,'2026-04-17':1,'2026-04-18':1,'2026-04-19':1,'2026-04-20':1,'2026-04-21':1 } },
  ],
  settings: { notify: true, notifyTime: '09:00', weekStart: 0, plan: 'free' },
  auth: { signedIn: false, provider: null },
});

const wInitUI = () => ({
  view: 'month',           // month | week | list
  page: 'calendar',        // calendar | stats | settings | search
  year: 2026, month: 4,
  selectedDate: W_TODAY,
  weekStart: W_TODAY,
  dark: false,
  showToday: true,
  filters: { cat: 'all', priority: 'all', showDone: true },
  selectedIds: [],
  modalTaskId: null,        // task detail modal
  newTask: null,            // { date, range:[s,e] }
  searchQ: '',
  paletteOpen: false,
  toast: null,
});

const loadShared = () => { try { const r = localStorage.getItem(WSTORE_KEY); if (!r) return wInitData(); const o = JSON.parse(r); return { ...wInitData(), ...o }; } catch { return wInitData(); } };
const loadUI = () => { try { const r = localStorage.getItem(WUI_KEY); if (!r) return wInitUI(); return { ...wInitUI(), ...JSON.parse(r), modalTaskId: null, newTask: null, paletteOpen: false, toast: null, selectedIds: [] }; } catch { return wInitUI(); } };

const WStoreCtx = React.createContext(null);

function WStoreProvider({ children }) {
  const [data, setData] = React.useState(loadShared);
  const [ui, setUI] = React.useState(loadUI);

  React.useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(WSTORE_KEY, JSON.stringify(data)); } catch {} }, 200); return () => clearTimeout(t); }, [data]);
  React.useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(WUI_KEY, JSON.stringify({ ...ui, modalTaskId: null, newTask: null, paletteOpen: false, toast: null, selectedIds: [] })); } catch {} }, 200); return () => clearTimeout(t); }, [ui]);

  const api = React.useMemo(() => ({
    data, ui,
    setUI: (patch) => setUI(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
    setView: (v) => setUI(s => ({ ...s, view: v })),
    setPage: (p) => setUI(s => ({ ...s, page: p, modalTaskId: null })),
    setMonth: (y, m) => setUI(s => ({ ...s, year: y, month: m })),
    selectDate: (iso) => setUI(s => ({ ...s, selectedDate: iso, weekStart: wWeekStartISO(iso) })),
    setWeekStart: (iso) => setUI(s => ({ ...s, weekStart: iso })),
    toggleDark: () => setUI(s => ({ ...s, dark: !s.dark })),
    setFilter: (k, v) => setUI(s => ({ ...s, filters: { ...s.filters, [k]: v } })),
    setSearch: (q) => setUI(s => ({ ...s, searchQ: q, page: q ? 'search' : (s.page === 'search' ? 'calendar' : s.page) })),
    setPalette: (v) => setUI(s => ({ ...s, paletteOpen: v })),
    openModal: (id) => setUI(s => ({ ...s, modalTaskId: id })),
    closeModal: () => setUI(s => ({ ...s, modalTaskId: null })),
    openNew: (payload) => setUI(s => ({ ...s, newTask: payload })),
    closeNew: () => setUI(s => ({ ...s, newTask: null })),
    toggleSel: (id) => setUI(s => ({ ...s, selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter(x => x !== id) : [...s.selectedIds, id] })),
    clearSel: () => setUI(s => ({ ...s, selectedIds: [] })),
    selectMany: (ids) => setUI(s => ({ ...s, selectedIds: ids })),
    showToast: (msg) => { setUI(s => ({ ...s, toast: msg })); setTimeout(() => setUI(s => ({ ...s, toast: null })), 1800); },
    toggleToday: () => setUI(s => ({ ...s, showToday: !s.showToday })),

    // data
    addTask: (task) => { const id = 't_' + Math.random().toString(36).slice(2,8); setData(d => ({ ...d, tasks: [...d.tasks, { id, done: false, tags: [], ...task }] })); return id; },
    updateTask: (id, patch) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })),
    toggleTask: (id) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
    deleteTask: (id) => setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })),
    deleteMany: (ids) => setData(d => ({ ...d, tasks: d.tasks.filter(t => !ids.includes(t.id)) })),
    moveTaskTo: (id, iso) => setData(d => ({ ...d, tasks: d.tasks.map(t => {
      if (t.id !== id) return t;
      const len = (new Date(wParse(t.end).y, wParse(t.end).m-1, wParse(t.end).d) - new Date(wParse(t.start).y, wParse(t.start).m-1, wParse(t.start).d)) / 86400000;
      return { ...t, start: iso, end: wAdd(iso, len) };
    }) })),
    bulkDone: (ids, done) => setData(d => ({ ...d, tasks: d.tasks.map(t => ids.includes(t.id) ? { ...t, done } : t) })),
    toggleHabit: (id, iso) => setData(d => ({ ...d, habits: d.habits.map(h => h.id === id ? { ...h, log: { ...h.log, [iso]: h.log[iso] ? 0 : 1 } } : h) })),

    signIn: (provider) => setData(d => ({ ...d, auth: { signedIn: true, provider } })),
    signOut: () => setData(d => ({ ...d, auth: { signedIn: false, provider: null } })),
    updateSetting: (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } })),
    reset: () => { setData(wInitData()); setUI(wInitUI()); },
  }), [data, ui]);

  return <WStoreCtx.Provider value={api}>{children}</WStoreCtx.Provider>;
}

const useW = () => React.useContext(WStoreCtx);

const wTasksOnDate = (tasks, iso) => tasks.filter(t => t.start <= iso && iso <= t.end);
const wFilterTasks = (tasks, filters, q) => tasks.filter(t => {
  if (filters.cat !== 'all' && t.cat !== filters.cat) return false;
  if (filters.priority !== 'all' && (t.priority || 'mid') !== filters.priority) return false;
  if (!filters.showDone && t.done) return false;
  if (q) {
    const ql = q.toLowerCase();
    const hay = (t.title + ' ' + (t.tags || []).join(' ') + ' ' + t.start + ' ' + t.end).toLowerCase();
    if (!hay.includes(ql)) return false;
  }
  return true;
});

Object.assign(window, {
  WStoreProvider, useW, W_TODAY, wIso, wParse, wDim, wFirst, wAdd, wWday, wAddMonths, wWeekStartISO,
  wTasksOnDate, wFilterTasks,
});
