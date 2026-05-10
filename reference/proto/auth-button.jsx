// Auth button + provider icons
const PAuthButton = ({ provider, loading, disabled, onClick, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      all: 'unset', cursor: disabled ? 'default' : 'pointer',
      height: 44, borderRadius: 11,
      background: provider.bg,
      color: provider.fg,
      border: provider.border ? `0.5px solid ${t.dividerStrong}` : (provider.ghost ? `0.5px solid ${t.dividerStrong}` : 'none'),
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2,
      fontFamily: JD_DISPLAY,
      opacity: disabled && !loading ? 0.5 : 1,
      position: 'relative',
    }}>
      {loading ? <Spinner c={provider.fg} /> : (
        <>
          {provider.icon}
          <span>{provider.label}</span>
        </>
      )}
    </button>
  );
};

const Spinner = ({ c = '#000' }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: 'jdSpin 0.8s linear infinite' }}>
    <circle cx="10" cy="10" r="7.5" stroke={c} strokeOpacity="0.2" strokeWidth="2" fill="none" />
    <path d="M10 2.5 A 7.5 7.5 0 0 1 17.5 10" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const AppleIcon = ({ dark }) => {
  const c = dark ? '#000' : '#fff';
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill={c}>
      <path d="M13.05 9.55c-.02-2.2 1.79-3.26 1.87-3.31-1.02-1.49-2.6-1.69-3.17-1.71-1.35-.14-2.64.79-3.32.79-.69 0-1.74-.77-2.87-.75-1.47.02-2.84.86-3.6 2.18-1.55 2.69-.4 6.66 1.1 8.84.74 1.06 1.61 2.26 2.74 2.21 1.1-.04 1.52-.71 2.85-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.43 1.2-2.49-.03-.01-2.3-.88-2.32-3.5zM10.86 3.16c.61-.74 1.02-1.76.91-2.78-.88.04-1.95.59-2.58 1.32-.56.65-1.06 1.69-.93 2.69.99.08 1.99-.5 2.6-1.23z"/>
    </svg>
  );
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.61z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.07l2.99-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58z"/>
  </svg>
);

const KakaoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#191600">
    <path d="M8 1.6C4.13 1.6 1 4 1 6.96c0 1.92 1.32 3.6 3.32 4.55-.14.5-.52 1.93-.6 2.24-.1.39.14.39.3.28.12-.08 1.92-1.3 2.7-1.83.42.06.85.1 1.28.1 3.87 0 7-2.4 7-5.36S11.87 1.6 8 1.6z"/>
  </svg>
);

const EmailIcon = ({ c }) => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
    <rect x="1" y="1" width="16" height="12" rx="2" stroke={c} strokeWidth="1.5"/>
    <path d="M2 3l7 5 7-5" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

Object.assign(window, { PAuthButton, Spinner, AppleIcon, GoogleIcon, KakaoIcon, EmailIcon });
