// Sidebar (left) + Glass header — main shell
const WSidebar = ({ collapsed, onToggle }) => {
  const w = useW(); const t = useT();
  const items = [
    { id: 'calendar', label: '캘린더', icon: <IconCal /> },
    { id: 'stats', label: '통계', icon: <IconChart /> },
    { id: 'settings', label: '설정', icon: <IconGear /> },
  ];
  const counts = {
    today: wTasksOnDate(w.data.tasks, W_TODAY).filter(x => !x.done).length,
    inbox: w.data.tasks.filter(x => !x.done).length,
  };
  return (
    <aside style={{
      width: collapsed ? 60 : 240, transition: 'width .2s ease',
      borderRight: `0.5px solid ${t.divider}`,
      display: 'flex', flexDirection: 'column',
      background: t.bg2, padding: '14px 10px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 16px', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ fontFamily: W_FONT, fontSize: 19, fontWeight: 800, letterSpacing: -0.8, color: t.text, display: 'flex', alignItems: 'baseline', gap: 3 }}>
            Just Do
            <span style={{ width: 5, height: 5, borderRadius: 3, background: t.accent, alignSelf: 'center' }} />
          </div>
        )}
        <button onClick={onToggle} title="사이드바 토글" style={{
          all: 'unset', cursor: 'pointer', width: 26, height: 26, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.textSecondary,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2v10M2 2h10v10H2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => w.setPage(it.id)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 9,
            padding: collapsed ? '8px 0' : '7px 10px', borderRadius: 7,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: w.ui.page === it.id ? t.selected : 'transparent',
            color: w.ui.page === it.id ? t.text : t.textSecondary,
            fontSize: 13, fontWeight: w.ui.page === it.id ? 600 : 500,
          }}>
            <span style={{ display: 'flex', color: w.ui.page === it.id ? t.text : t.textSecondary }}>{it.icon}</span>
            {!collapsed && it.label}
          </button>
        ))}
      </div>

      {!collapsed && (
        <>
          <SidebarSection label="필터" t={t}>
            <SidebarChip active={w.ui.filters.cat === 'all'} onClick={() => w.setFilter('cat', 'all')} t={t}>전체 <Pill t={t}>{w.data.tasks.length}</Pill></SidebarChip>
            <SidebarChip active={w.ui.filters.cat === 'me'} onClick={() => w.setFilter('cat', 'me')} dotColor={t.me.solid} t={t}>나</SidebarChip>
            <SidebarChip active={w.ui.filters.cat === 'ext'} onClick={() => w.setFilter('cat', 'ext')} dotColor={t.ext.solid} t={t}>외부</SidebarChip>
          </SidebarSection>

          <SidebarSection label="우선순위" t={t}>
            {[{k:'all',l:'모두'},{k:'high',l:'높음'},{k:'mid',l:'중간'},{k:'low',l:'낮음'}].map(p => (
              <SidebarChip key={p.k} active={w.ui.filters.priority === p.k} onClick={() => w.setFilter('priority', p.k)} t={t}>{p.l}</SidebarChip>
            ))}
          </SidebarSection>

          <SidebarSection label="태그" t={t}>
            {['#취업','#팀','#작업','#출장','#미팅'].map(tg => (
              <SidebarChip key={tg} onClick={() => w.setSearch(tg)} t={t}>{tg}</SidebarChip>
            ))}
          </SidebarSection>

          <div style={{ flex: 1 }} />

          <button onClick={() => w.setPalette(true)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: 7,
            color: t.textSecondary, fontSize: 12, fontWeight: 500,
            border: `0.5px solid ${t.divider}`, marginTop: 6,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              빠른 검색
            </span>
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: t.surfaceAlt, fontWeight: 600 }}>⌘K</span>
          </button>

          <button onClick={() => w.toggleDark()} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 7,
            color: t.textSecondary, fontSize: 12, fontWeight: 500, marginTop: 6,
          }}>
            <span style={{ width: 14, textAlign: 'center' }}>{w.ui.dark ? '☾' : '☼'}</span>
            {w.ui.dark ? '다크 모드' : '라이트 모드'}
          </button>

          {w.data.auth.signedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 10px 4px', borderTop: `0.5px solid ${t.divider}`, marginTop: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: t.me.solid, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>지</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>지민</div>
                <div style={{ fontSize: 10, color: t.textTertiary }}>{w.data.auth.provider}</div>
              </div>
              <button onClick={() => w.signOut()} title="로그아웃" style={{ all: 'unset', cursor: 'pointer', color: t.textTertiary, fontSize: 11 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2v9h3M8 4l3 2.5L8 9M5 6.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

const SidebarSection = ({ label, t, children }) => (
  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 1 }}>
    <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
    {children}
  </div>
);

const SidebarChip = ({ active, onClick, dotColor, children, t }) => (
  <button onClick={onClick} style={{
    all: 'unset', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', borderRadius: 7,
    background: active ? t.selected : 'transparent',
    color: active ? t.text : t.textSecondary,
    fontSize: 12.5, fontWeight: active ? 600 : 500,
  }}>
    {dotColor && <span style={{ width: 7, height: 7, borderRadius: 4, background: dotColor }} />}
    <span>{children}</span>
  </button>
);

const Pill = ({ children, t }) => (
  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: t.surfaceAlt, color: t.textTertiary, fontWeight: 600 }}>{children}</span>
);

// Glass top header — floating over content
const WHeader = ({ onSearchFocus }) => {
  const w = useW(); const t = useT();
  const isCalendar = w.ui.page === 'calendar';
  const titleText = w.ui.page === 'calendar' ? `${w.ui.year}년 ${w.ui.month}월` : w.ui.page === 'stats' ? '통계' : w.ui.page === 'settings' ? '설정' : '검색';
  const searchRef = React.useRef(null);
  React.useImperativeHandle(onSearchFocus, () => ({ focus: () => searchRef.current?.focus() }));

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      background: t.glass,
      borderBottom: `0.5px solid ${t.glassBorder}`,
      padding: '10px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {isCalendar ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => {
              if (w.ui.view === 'week') {
                const ns = wAdd(w.ui.weekStart, -7);
                w.setWeekStart(ns);
                const p = wParse(ns); w.setMonth(p.y, p.m);
              } else if (w.ui.view === 'list') {
                w.selectDate(wAdd(w.ui.selectedDate, -1));
              } else {
                const {y, m} = wAddMonths(w.ui.year, w.ui.month, -1); w.setMonth(y, m);
              }
            }} style={navBtn(t)}>
              <svg width="11" height="11" viewBox="0 0 11 11"><path d="M7 2L3 5.5l4 3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => { w.setMonth(2026, 4); w.selectDate(W_TODAY); }} style={{
              all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.textSecondary,
              padding: '5px 10px', borderRadius: 6, border: `0.5px solid ${t.divider}`,
            }}>오늘</button>
            <button onClick={() => {
              if (w.ui.view === 'week') {
                const ns = wAdd(w.ui.weekStart, 7);
                w.setWeekStart(ns);
                const p = wParse(ns); w.setMonth(p.y, p.m);
              } else if (w.ui.view === 'list') {
                w.selectDate(wAdd(w.ui.selectedDate, 1));
              } else {
                const {y, m} = wAddMonths(w.ui.year, w.ui.month, 1); w.setMonth(y, m);
              }
            }} style={navBtn(t)}>
              <svg width="11" height="11" viewBox="0 0 11 11"><path d="M4 2l4 3.5L4 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div style={{ fontFamily: W_FONT, fontSize: 19, fontWeight: 700, letterSpacing: -0.6, color: t.text }}>
            {w.ui.view === 'week' ? (() => { const s = wParse(w.ui.weekStart); const e = wParse(wAdd(w.ui.weekStart, 6)); return `${s.y}년 ${s.m}월 ${s.d}일 – ${e.m}월 ${e.d}일`; })() : titleText}
          </div>

          <div style={{ display: 'flex', gap: 1, padding: 2, borderRadius: 8, background: t.surfaceAlt }}>
            {[{k:'month',l:'월'},{k:'week',l:'주'},{k:'list',l:'리스트'}].map(o => (
              <button key={o.k} onClick={() => w.setView(o.k)} style={{
                all: 'unset', cursor: 'pointer',
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: w.ui.view === o.k ? t.surface : 'transparent',
                color: w.ui.view === o.k ? t.text : t.textSecondary,
                boxShadow: w.ui.view === o.k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}>{o.l}</button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontFamily: W_FONT, fontSize: 19, fontWeight: 700, letterSpacing: -0.6, color: t.text }}>{titleText}</div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ position: 'relative', width: 280 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.textTertiary }}>
          <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input ref={searchRef} value={w.ui.searchQ} onChange={e => w.setSearch(e.target.value)}
          placeholder="제목, 태그, 날짜 검색  /"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px 7px 30px',
            fontSize: 12.5, fontFamily: W_FONT,
            border: `0.5px solid ${t.divider}`, borderRadius: 8,
            background: t.surface, color: t.text, outline: 'none',
          }}
        />
      </div>

      <button onClick={() => w.setPalette(true)} title="명령 (⌘K)" style={{ ...navBtn(t), width: 30 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h3v3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/></svg>
      </button>

      <button onClick={() => w.toggleToday()} title="Today 패널" style={{ ...navBtn(t), width: 30, color: w.ui.showToday ? t.accent : t.textSecondary }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12" stroke="currentColor" strokeWidth="1.3"/></svg>
      </button>

      <button onClick={() => w.openNew({ date: w.ui.selectedDate })} title="새 Task (N)" style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px 6px 10px', borderRadius: 8,
        background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 600, letterSpacing: -0.2,
      }}>
        <svg width="12" height="12" viewBox="0 0 13 13"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        새 Task
        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.18)', marginLeft: 2 }}>N</span>
      </button>

      {w.data.auth.signedIn && (
        <div style={{ width: 28, height: 28, borderRadius: 14, background: t.me.solid, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>지</div>
      )}
    </header>
  );
};

const navBtn = (t) => ({
  all: 'unset', cursor: 'pointer',
  width: 26, height: 26, borderRadius: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: t.textSecondary,
});

const IconCal = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 1v2.5M9.5 1v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconChart = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11V6M5 11V3M8 11V8M11 11V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M1 12.5h12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>;
const IconGear = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5v1.6M7 10.9v1.6M12.5 7h-1.6M3.1 7H1.5M11 3l-1.1 1.1M4.1 9.9L3 11M11 11l-1.1-1.1M4.1 4.1L3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;

Object.assign(window, { WSidebar, WHeader, navBtn, IconCal, IconChart, IconGear });
