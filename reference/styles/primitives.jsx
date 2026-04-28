// Shared small components: category pill, checkbox, bottom tab bar, etc.
// All accept `dark` boolean and pull from JD_TOKENS.

const JDCheckbox = ({ checked, cat = 'me', dark = false, size = 20 }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const c = t[cat];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      border: `1.5px solid ${checked ? c.solid : t.dividerStrong}`,
      background: checked ? c.solid : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'all .15s',
    }}>
      {checked && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2L5 8.7L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
};

const JDCatDot = ({ cat, dark = false, size = 6 }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return <div style={{ width: size, height: size, borderRadius: size, background: t[cat].solid, flexShrink: 0 }} />;
};

const JDCatTag = ({ cat, dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const labels = { me: '나', ext: '외부', habit: 'Habit' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
      color: t[cat].ink, background: t[cat].soft,
      padding: '3px 8px', borderRadius: 5,
    }}>{labels[cat]}</span>
  );
};

const JDPriorityMark = ({ level, dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  if (level !== 'high') return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: t.ext.ink,
      letterSpacing: 0.4,
    }}>!</span>
  );
};

// Bottom tab bar — 3 tabs, iOS-native with fine glass feel
const JDTabBar = ({ active = 'home', dark = false }) => {
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
          <div key={tab.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '4px 12px', minWidth: 64,
          }}>
            {tab.icon(c)}
            <span style={{ fontSize: 10, color: c, fontWeight: 500, letterSpacing: 0.1 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// iOS-style status bar strip (compact, dark-aware)
const JDStatusBar = ({ dark = false, time = '9:41' }) => {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      height: 54, padding: '21px 30px 0', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      fontFamily: JD_DISPLAY, color: c,
      position: 'relative', zIndex: 20,
    }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>{time}</span>
      <div style={{ width: 100 }} /> {/* reserve for dynamic island */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx=".6" fill={c}/><rect x="4.5" y="5" width="3" height="6" rx=".6" fill={c}/><rect x="9" y="2.5" width="3" height="8.5" rx=".6" fill={c}/><rect x="13.5" y="0" width="3" height="11" rx=".6" fill={c}/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.8C9.5 2.8 11.4 3.6 12.7 4.9l1-1C12 2.3 9.9 1.3 7.5 1.3C5.1 1.3 3 2.3 1.3 3.9l1 1C3.6 3.6 5.5 2.8 7.5 2.8Z M7.5 6c1.2 0 2.3.4 3.1 1.2l1-1C10.5 5.1 9.1 4.5 7.5 4.5c-1.6 0-3 .6-4.1 1.7l1 1C5.2 6.4 6.3 6 7.5 6Z" fill={c}/><circle cx="7.5" cy="9.2" r="1.3" fill={c}/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity=".35" fill="none"/><rect x="2" y="2" width="18" height="8" rx="1.8" fill={c}/><rect x="22.5" y="4" width="1.5" height="4" rx=".5" fill={c} fillOpacity=".4"/></svg>
      </div>
    </div>
  );
};

// Dynamic Island
const JDDynamicIsland = () => (
  <div style={{
    position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
    width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
  }} />
);

// Home indicator
const JDHomeIndicator = ({ dark = false }) => (
  <div style={{
    position: 'absolute', bottom: 8, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none',
  }}>
    <div style={{ width: 139, height: 5, borderRadius: 99, background: dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.32)' }} />
  </div>
);

// Full iPhone 15 Pro frame wrapper
const JDPhone = ({ children, dark = false, width = 390, height = 844 }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      width, height, borderRadius: 47, overflow: 'hidden', position: 'relative',
      background: t.bg, fontFamily: JD_FONT,
      color: t.text,
      WebkitFontSmoothing: 'antialiased',
      boxShadow: dark
        ? 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.3)'
        : 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.1)',
    }}>
      <JDDynamicIsland />
      {children}
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

Object.assign(window, {
  JDCheckbox, JDCatDot, JDCatTag, JDPriorityMark,
  JDTabBar, JDStatusBar, JDDynamicIsland, JDHomeIndicator, JDPhone,
});
