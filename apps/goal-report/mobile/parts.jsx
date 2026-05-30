// Goal & Report — Mobile shared atoms.
// Reuses W_TOKENS (same shape as JD_TOKENS but with bg2/glass).
// Components below take a `t` prop and a `dark` prop. They render inside JDPhone.

// Sheet — bottom-sheet card with grabber handle
const MGRSheet = ({ t, dark, children, height = 'auto' }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 0,
    background: t.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    paddingBottom: 26,
    height,
  }}>
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
      <span style={{ width: 36, height: 4, borderRadius: 2, background: t.dividerStrong }} />
    </div>
    {children}
  </div>
);

// Backdrop for a modal/sheet
const MGRBackdrop = ({ children, dark, blur = 3 }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,12,8,0.42)',
    backdropFilter: `blur(${blur}px)`,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }}>{children}</div>
);

// iOS-style alert
const MGRAlert = ({ t, dark, title, body, actions }) => (
  <div style={{
    width: 280, background: dark ? 'rgba(40,38,34,0.9)' : 'rgba(252,250,246,0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: 14, overflow: 'hidden',
  }}>
    <div style={{ padding: '18px 16px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, color: t.text }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 6, lineHeight: 1.45 }}>{body}</div>}
    </div>
    <div style={{ display: 'flex', borderTop: `0.5px solid ${t.dividerStrong}` }}>
      {actions.map((a, i) => (
        <button key={i} style={{
          all: 'unset', cursor: 'pointer', flex: 1,
          padding: '11px 0', fontSize: 14, textAlign: 'center',
          color: a.danger ? t.danger : (a.primary ? t.accent : t.text),
          fontWeight: a.primary ? 600 : 400,
          borderLeft: i > 0 ? `0.5px solid ${t.dividerStrong}` : 'none',
        }}>{a.label}</button>
      ))}
    </div>
  </div>
);

// Screen wrapper inside phone — status bar + nav + content
const MGRScreen = ({ t, dark, nav, children, scrollHint = false }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    {nav}
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{children}</div>
  </div>
);

// Standard nav bar
const MGRNav = ({ t, dark, title, back = '뒤로', right, large = false }) => (
  <div style={{
    padding: large ? '8px 16px 8px' : '6px 16px 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: t.bg, borderBottom: large ? 'none' : `0.5px solid ${t.divider}`,
  }}>
    <button style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, color: t.accent, fontSize: 15, fontWeight: 400 }}>
      <svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M8 2L2 9l6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {back}
    </button>
    {!large && <div style={{ fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: -0.3 }}>{title}</div>}
    <div style={{ minWidth: 50, textAlign: 'right' }}>{right}</div>
  </div>
);

// Large title block (iOS pattern)
const MGRLargeTitle = ({ t, title, sub }) => (
  <div style={{ padding: '4px 20px 14px' }}>
    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, color: t.text }}>{title}</div>
    {sub && <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4 }}>{sub}</div>}
  </div>
);

// Lock pill (mobile)
const MGRLock = ({ on, t }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 7px 2px 5px', borderRadius: 99,
    fontSize: 10, fontWeight: 600,
    background: on ? t.me.soft : 'transparent',
    color: on ? t.me.ink : t.textTertiary,
    border: on ? 'none' : `0.5px solid ${t.divider}`,
  }}>
    <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
      <path d="M2 4.2V3a2.5 2.5 0 0 1 5 0v1.2M1.5 4.2h6V8h-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {on ? '고정' : '자유'}
  </span>
);

// Bar
const MGRBar = ({ pct, color, bg, height = 5 }) => (
  <div style={{ height, borderRadius: height/2, background: bg, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.round(pct*100)}%`, background: color, borderRadius: height/2 }} />
  </div>
);

// Plan badge
const MGRPlan = ({ plan, t }) => {
  const cfg = {
    free:  { label: 'Free',  bg: t.surfaceAlt, fg: t.textSecondary },
    trial: { label: 'Trial', bg: t.me.softer,  fg: t.me.ink },
    pro:   { label: 'Pro',   bg: t.text,       fg: t.bg },
  }[plan];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4,
      fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
      background: cfg.bg, color: cfg.fg,
    }}>{cfg.label}</span>
  );
};

// Mobile-tuned heatmap (smaller cells)
const MGRHeatmap = ({ data, color, bg, t }) => {
  const m = Math.max(1, ...data);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3 }}>
        {data.map((v, i) => {
          const a = v / m;
          return (
            <div key={i} style={{
              aspectRatio: '1 / 1', borderRadius: 2.5,
              background: a === 0 ? bg : color,
              opacity: a === 0 ? 1 : (0.22 + a * 0.78),
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>
        <span>3/1</span><span>3/16</span><span>3/31</span>
      </div>
    </div>
  );
};

// Mobile illustration
const MGRIllust = ({ w = 320, h = 130, tone = 'warm', dark }) =>
  <GRIllustration w={w} h={h} tone={tone} dark={dark} />;

// Lock open icon
const MGRUnlock = ({ size = 18, c }) => <GRUnlockIcon size={size} c={c} />;

// Ring
const mgrRing = (pct, size, color, bg, stroke = 5) => grRing(pct, size, color, bg, stroke);

Object.assign(window, {
  MGRSheet, MGRBackdrop, MGRAlert, MGRScreen, MGRNav, MGRLargeTitle,
  MGRLock, MGRBar, MGRPlan, MGRHeatmap, MGRIllust, MGRUnlock, mgrRing,
});
