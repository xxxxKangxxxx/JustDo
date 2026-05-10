// Auth / landing screen — wordmark + soft warm gradient + 4 social buttons.
const PAuthScreen = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const [loading, setLoading] = React.useState(null);

  const providers = [
    { id: 'apple', label: 'Apple로 계속하기', bg: dark ? '#fff' : '#000', fg: dark ? '#000' : '#fff', icon: <AppleIcon dark={dark} /> },
    { id: 'google', label: 'Google로 계속하기', bg: dark ? '#1C1B18' : '#fff', fg: dark ? '#F3F0EA' : '#1C1A17', border: true, icon: <GoogleIcon /> },
    { id: 'kakao', label: 'Kakao로 계속하기', bg: '#FEE500', fg: '#191600', icon: <KakaoIcon /> },
    { id: 'email', label: '이메일로 계속하기', bg: 'transparent', fg: t.text, ghost: true, icon: <EmailIcon c={t.text} /> },
  ];

  const onLogin = (id) => {
    if (loading) return;
    setLoading(id);
    setTimeout(() => { s.signIn(id); }, 1000);
  };

  const bg = dark
    ? 'radial-gradient(ellipse 90% 60% at 50% 0%, #2a2419 0%, #1a1714 55%, #131210 100%)'
    : 'radial-gradient(ellipse 90% 60% at 50% 0%, #FBE9D2 0%, #F4ECDD 45%, #F6F4EF 100%)';

  return (
    <JDPhone dark={dark}>
      <div style={{ position: 'absolute', inset: 0, background: bg }} />
      <JDStatusBar dark={dark} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: '0 44px 96px',
      }}>
        {/* Logo zone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{
            fontFamily: JD_DISPLAY,
            fontSize: 56, fontWeight: 800, letterSpacing: -2.4,
            color: t.text, lineHeight: 1,
            display: 'flex', alignItems: 'baseline', gap: 4,
          }}>
            Just Do
            <span style={{ width: 11, height: 11, borderRadius: 6, background: t.accent, alignSelf: 'center', marginLeft: 2 }} />
          </div>
          <div style={{
            fontSize: 14, fontWeight: 500, color: t.textSecondary,
            letterSpacing: -0.2, fontFamily: JD_DISPLAY,
          }}>
            오늘, 지금 해야 할 일.
          </div>
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {providers.map(p => (
            <PAuthButton key={p.id} provider={p} loading={loading === p.id} disabled={!!loading} onClick={() => onLogin(p.id)} dark={dark} />
          ))}
        </div>

        {/* Footer links */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12,
          marginTop: 14, fontSize: 11, color: t.textTertiary, fontWeight: 500,
        }}>
          <span style={{ cursor: 'pointer' }}>이용약관</span>
          <span style={{ width: 1, background: t.dividerStrong }} />
          <span style={{ cursor: 'pointer' }}>개인정보처리방침</span>
        </div>
      </div>
    </JDPhone>
  );
};

Object.assign(window, { PAuthScreen });
