// Goal & Report — Web shared atoms.
// Pulls from W_TOKENS (loaded earlier). Exposes everything to window.

const grRing = (pct, size, color, bg, stroke = 6) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - c*pct}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
};

// Subtly textured illustration placeholder for emotional graphic element.
// Uses oklch tones for warmth, soft horizontal stripes, a sun/moon disc.
const GRIllustration = ({ w = 220, h = 140, tone = 'warm', dark = false }) => {
  const palette = dark
    ? { sky: 'oklch(0.28 0.04 60)',   land: 'oklch(0.32 0.05 50)', sun: 'oklch(0.78 0.13 70)', haze: 'oklch(0.36 0.03 50)' }
    : { sky: 'oklch(0.93 0.025 70)',  land: 'oklch(0.88 0.04 60)', sun: 'oklch(0.78 0.12 60)', haze: 'oklch(0.91 0.03 50)' };
  if (tone === 'cool') {
    Object.assign(palette, dark
      ? { sky: 'oklch(0.28 0.04 230)', land: 'oklch(0.31 0.04 220)', sun: 'oklch(0.78 0.12 230)', haze: 'oklch(0.36 0.03 230)' }
      : { sky: 'oklch(0.93 0.025 230)', land: 'oklch(0.89 0.035 220)', sun: 'oklch(0.78 0.1 230)', haze: 'oklch(0.91 0.03 230)' }
    );
  }
  return (
    <svg width={w} height={h} viewBox="0 0 220 140" style={{ display: 'block' }}>
      <rect x="0" y="0" width="220" height="140" fill={palette.sky} />
      <circle cx="155" cy="58" r="22" fill={palette.sun} opacity="0.85" />
      <rect x="0" y="78" width="220" height="62" fill={palette.land} />
      <rect x="0" y="78" width="220" height="1" fill={palette.haze} opacity="0.5" />
      <rect x="0" y="92" width="220" height="1" fill={palette.haze} opacity="0.5" />
      <rect x="0" y="108" width="220" height="1" fill={palette.haze} opacity="0.5" />
      <rect x="0" y="124" width="220" height="1" fill={palette.haze} opacity="0.5" />
      <path d="M0 88 Q 40 84 70 90 T 140 88 T 220 92 L 220 78 L 0 78 Z" fill={palette.haze} opacity="0.6" />
    </svg>
  );
};

// Tiny category dot.
const GRDot = ({ color, size = 6 }) => (
  <span style={{ display: 'inline-block', width: size, height: size, borderRadius: size, background: color, flexShrink: 0 }} />
);

// Lock toggle pill — used in goal item rows.
const GRLockPill = ({ on, onClick, t }) => (
  <button onClick={onClick} style={{
    all: 'unset', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px 3px 6px', borderRadius: 99,
    fontSize: 10.5, fontWeight: 600, letterSpacing: 0.1,
    background: on ? t.me.soft : 'transparent',
    color: on ? t.me.ink : t.textTertiary,
    border: on ? 'none' : `0.5px solid ${t.divider}`,
  }}>
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      {on
        ? <path d="M2 4.2V3a2.5 2.5 0 0 1 5 0v1.2M1.5 4.2h6V8h-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M2 4.2V3a2.5 2.5 0 0 1 4.7-1.1M1.5 4.2h6V8h-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
    {on ? '고정됨' : '자유'}
  </button>
);

// Slim progress bar — used in goal cards.
const GRBar = ({ pct, color, bg, height = 6 }) => (
  <div style={{ height, borderRadius: height/2, background: bg, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.round(pct*100)}%`, background: color, borderRadius: height/2, transition: 'width .3s' }} />
  </div>
);

// Plan badge (Free / Trial / Pro)
const GRPlan = ({ plan, t }) => {
  const cfg = {
    free:  { label: 'Free',  bg: t.surfaceAlt, fg: t.textSecondary },
    trial: { label: 'Trial', bg: t.me.softer,  fg: t.me.ink },
    pro:   { label: 'Pro',   bg: t.text,       fg: t.bg },
  }[plan];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4,
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4,
      background: cfg.bg, color: cfg.fg,
    }}>{cfg.label}</span>
  );
};

// Compact modal backdrop wrapper — for showing modals centered over a dimmed shell.
// 'shell' children render behind, modal child renders centered.
const GRModalFrame = ({ children, shell, t, dark, w = 1080, h = 720 }) => (
  <div style={{
    width: w, height: h, position: 'relative', overflow: 'hidden',
    fontFamily: W_FONT, color: t.text, background: t.bg,
  }}>
    {shell}
    <div style={{
      position: 'absolute', inset: 0,
      background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,12,8,0.42)',
      backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  </div>
);

// Simplified app-shell backdrop (sidebar silhouette + header) for modal artboards.
const GRShellBg = ({ t }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
    <div style={{ width: 220, background: t.bg2, borderRight: `0.5px solid ${t.divider}`, padding: 16 }}>
      <div style={{ height: 14, width: 80, background: t.dividerStrong, borderRadius: 4, opacity: 0.4 }} />
      <div style={{ height: 8, width: 60, background: t.divider, borderRadius: 4, marginTop: 16 }} />
      <div style={{ height: 8, width: 90, background: t.divider, borderRadius: 4, marginTop: 8 }} />
      <div style={{ height: 8, width: 70, background: t.divider, borderRadius: 4, marginTop: 8 }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ height: 50, borderBottom: `0.5px solid ${t.divider}`, padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ height: 14, width: 120, background: t.divider, borderRadius: 4 }} />
      </div>
      <div style={{ padding: 22 }}>
        <div style={{ height: 8, width: '50%', background: t.divider, borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 8, width: '40%', background: t.divider, borderRadius: 4 }} />
      </div>
    </div>
  </div>
);

// Heatmap (31 days)
const GRHeatmap = ({ data, color, bg, max, label, t }) => {
  const m = max || Math.max(1, ...data);
  return (
    <div>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(31, 1fr)', gap: 3 }}>
        {data.map((v, i) => {
          const a = v / m;
          return (
            <div key={i} style={{
              aspectRatio: '1 / 1',
              borderRadius: 3,
              background: a === 0 ? bg : color,
              opacity: a === 0 ? 1 : (0.25 + a * 0.75),
            }} title={`${i+1}일 · ${v}`} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>
        <span>1일</span><span>16일</span><span>31일</span>
      </div>
    </div>
  );
};

// Lock unlock icon (open lock)
const GRUnlockIcon = ({ size = 18, c }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M5 8V5a4 4 0 0 1 7.5-2" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="3.5" y="8" width="11" height="7.5" rx="1.8" stroke={c} strokeWidth="1.4"/>
    <circle cx="9" cy="11.5" r="1" fill={c}/>
  </svg>
);

Object.assign(window, {
  grRing, GRIllustration, GRDot, GRLockPill, GRBar, GRPlan, GRModalFrame, GRShellBg, GRHeatmap, GRUnlockIcon,
});
