// Root app — composes everything. Handles responsive layout.
const useViewport = () => {
  const [w, setW] = React.useState(() => window.innerWidth);
  React.useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return { w, isMobile: w < 720, isTablet: w >= 720 && w < 1100, isDesktop: w >= 1100 };
};

const WApp = () => {
  const w = useW(); const t = useT();
  const vp = useViewport();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);
  const sidebarCollapsed = collapsed || vp.isTablet;
  const showToday = !vp.isMobile && w.ui.showToday && w.ui.page === 'calendar';

  if (!w.data.auth.signedIn) {
    return (
      <div style={{ height: '100vh', background: t.bg, color: t.text, fontFamily: W_FONT, display: 'flex', flexDirection: 'column' }}>
        <WAuthScreen />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: t.bg, color: t.text, fontFamily: W_FONT, display: 'flex', overflow: 'hidden' }}>
      {!vp.isMobile && <WSidebar collapsed={sidebarCollapsed} onToggle={() => setCollapsed(c => !c)} />}
      {vp.isMobile && mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.4)' }}>
          <div onClick={e => e.stopPropagation()} style={{ height: '100%', width: 260, background: t.bg2 }}>
            <WSidebar collapsed={false} onToggle={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {vp.isMobile && <WMobileTopbar onMenu={() => setMobileNav(true)} />}
        {!vp.isMobile && <WHeader />}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {w.ui.page === 'calendar' && w.ui.view === 'month' && <WMonthGrid />}
            {w.ui.page === 'calendar' && w.ui.view === 'week' && <WWeekView />}
            {w.ui.page === 'calendar' && w.ui.view === 'list' && <WListView />}
            {w.ui.page === 'stats' && <WStatsPage />}
            {w.ui.page === 'settings' && <WSettingsPage />}
            {w.ui.page === 'search' && <WSearchPage />}
          </div>
          {showToday && <WTodayPanel />}
        </div>
      </main>

      <WTaskModal />
      <WNewTaskInline />
      <WCommandPalette />
      <WShortcuts />
      <WBulkActionBar />
      <WToast />
    </div>
  );
};

const WMobileTopbar = ({ onMenu }) => {
  const w = useW(); const t = useT();
  return (
    <header style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `0.5px solid ${t.divider}`, background: t.glass, backdropFilter: 'blur(14px)' }}>
      <button onClick={onMenu} style={{ all: 'unset', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text }}>
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      <div style={{ fontFamily: W_FONT, fontSize: 17, fontWeight: 700, letterSpacing: -0.4 }}>{w.ui.year}년 {w.ui.month}월</div>
      <div style={{ flex: 1 }} />
      <button onClick={() => w.openNew({ date: w.ui.selectedDate })} style={{ all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 7, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
    </header>
  );
};

const WBulkActionBar = () => {
  const w = useW(); const t = useT();
  if (!w.ui.selectedIds.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
      background: t.text, color: t.bg,
      padding: '8px 8px 8px 16px', borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
      fontSize: 12.5, fontWeight: 600,
    }}>
      <span>{w.ui.selectedIds.length}개 선택됨</span>
      <button onClick={() => { w.bulkDone(w.ui.selectedIds, true); w.clearSel(); w.showToast('완료 처리'); }} style={bulkBtn(t)}>완료</button>
      <button onClick={() => { w.deleteMany(w.ui.selectedIds); w.clearSel(); w.showToast('삭제됨'); }} style={bulkBtn(t)}>삭제</button>
      <button onClick={() => w.clearSel()} style={{ ...bulkBtn(t), background: 'transparent' }}>해제</button>
    </div>
  );
};
const bulkBtn = (t) => ({ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 600 });

const WToast = () => {
  const w = useW(); const t = useT();
  if (!w.ui.toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
      background: t.text, color: t.bg, padding: '8px 16px', borderRadius: 8,
      fontSize: 12.5, fontWeight: 600, boxShadow: '0 10px 28px rgba(0,0,0,0.24)',
    }}>{w.ui.toast}</div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <WStoreProvider><WApp /></WStoreProvider>
);
