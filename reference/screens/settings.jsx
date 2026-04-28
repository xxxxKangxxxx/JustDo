// Settings tab

const JDSettingsScreen = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];

  const sections = [
    {
      label: '계정',
      rows: [
        { title: '프로필', detail: '지민', avatar: true },
        { title: '로그아웃', muted: true },
        { title: '회원탈퇴', danger: true, last: true },
      ],
    },
    {
      label: '알림',
      rows: [
        { title: '알림', toggle: true, on: true },
        { title: '알림 시간', detail: '오전 9:00', chevron: true, last: true },
      ],
    },
    {
      label: '카테고리 · 태그',
      rows: [
        { title: '카테고리 색상', detail: '3개', chevron: true, cats: true },
        { title: '태그 관리', detail: '12개', chevron: true, last: true },
      ],
    },
    {
      label: '디스플레이',
      rows: [
        { title: '다크모드', detail: dark ? '켜짐' : '시스템', chevron: true },
        { title: '캘린더 시작 요일', detail: '일요일', chevron: true, last: true },
      ],
    },
    {
      label: '구독',
      rows: [
        { title: '현재 플랜', detail: 'Free', chevron: true },
        { title: 'Pro로 업그레이드', pro: true, last: true },
      ],
    },
    {
      label: '데이터',
      rows: [
        { title: '데이터 내보내기', chevron: true },
        { title: '캐시 삭제', detail: '3.2 MB', chevron: true, last: true },
      ],
    },
    {
      label: '앱 정보',
      rows: [
        { title: '버전', detail: '1.0.2' },
        { title: '이용약관', chevron: true },
        { title: '개인정보처리방침', chevron: true, last: true },
      ],
    },
  ];

  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />

      <div style={{ padding: '4px 0 100px', overflow: 'auto', height: 'calc(100% - 54px)' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, fontFamily: JD_DISPLAY, padding: '12px 20px 18px' }}>
          설정
        </div>

        {sections.map((s) => (
          <div key={s.label} style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: t.textTertiary,
              letterSpacing: 0.4, padding: '0 20px 8px',
            }}>{s.label}</div>
            <div style={{
              background: t.surface, margin: '0 14px', borderRadius: 14,
              overflow: 'hidden',
            }}>
              {s.rows.map((r, i) => (
                <SettingsRow key={i} row={r} dark={dark} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <JDTabBar active="settings" dark={dark} />
    </JDPhone>
  );
};

const SettingsRow = ({ row, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 14px', minHeight: 44,
      borderBottom: row.last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      {row.avatar && (
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: `linear-gradient(135deg, ${t.me.solid}, ${t.habit.solid})`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>지</div>
      )}
      {row.cats && (
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: t.me.solid }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: t.ext.solid }} />
          <div style={{ width: 10, height: 10, borderRadius: 5, background: t.habit.solid }} />
        </div>
      )}
      <div style={{
        flex: 1, fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
        color: row.danger ? t.ext.ink : (row.pro ? t.me.ink : t.text),
      }}>
        {row.title}
        {row.pro && (
          <span style={{
            marginLeft: 8, padding: '2px 6px', borderRadius: 4,
            fontSize: 10, fontWeight: 700, background: t.me.soft, color: t.me.ink, letterSpacing: 0.3,
          }}>PRO</span>
        )}
      </div>
      {row.detail && (
        <div style={{ fontSize: 14, color: t.textSecondary, fontWeight: 500 }}>{row.detail}</div>
      )}
      {row.toggle && <IOSToggle on={row.on} dark={dark} cat="me" />}
      {row.chevron && (
        <svg width="6" height="10" viewBox="0 0 6 10"><path d="M1 1l3.5 4L1 9" stroke={t.textTertiary} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
    </div>
  );
};

Object.assign(window, { JDSettingsScreen, SettingsRow });
