// Tab bar (interactive)
const PTabBar = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const active = s.state.view.tab;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const tabs = [
    { id: 'home', label: '홈', icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="3" stroke={c} strokeWidth="1.7"/>
        <path d="M4 9h16" stroke={c} strokeWidth="1.7"/>
        <path d="M8 3v4M16 3v4" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'stats', label: '통계', icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 18V11M10 18V7M15 18v-5M20 18V4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'settings', label: '설정', icon: (c) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.7"/>
        <path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6"
          stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    )},
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 22, paddingTop: 8,
      background: dark ? 'rgba(19,18,16,0.72)' : 'rgba(246,244,239,0.78)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: `0.5px solid ${t.divider}`,
      display: 'flex', justifyContent: 'space-around', zIndex: 40,
    }}>
      {tabs.map(tab => {
        const on = tab.id === active;
        const c = on ? t.accent : t.textTertiary;
        return (
          <button key={tab.id} onClick={() => s.setTab(tab.id)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '4px 12px', minWidth: 64,
          }}>
            {tab.icon(c)}
            <span style={{ fontSize: 10, color: c, fontWeight: 500, letterSpacing: 0.1 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

Object.assign(window, { PTabBar });
