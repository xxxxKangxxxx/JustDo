// Stats + Settings screens (interactive)
const PStatsScreen = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const tasks = s.state.tasks;
  const habits = s.state.habits;
  const { year, month } = s.state.view;

  const monthStart = isoOf(year, month, 1);
  const monthEnd = isoOf(year, month, dim(year, month));
  const monthTasks = tasksInRange(tasks, monthStart, monthEnd);
  const byCat = (c) => monthTasks.filter(x => x.cat === c);
  const stats = ['me','ext'].map(c => {
    const items = byCat(c);
    const done = items.filter(x => x.done).length;
    return { cat: c, label: c === 'me' ? '나' : '외부', done, total: items.length || 1 };
  });
  const totalDone = monthTasks.filter(x => x.done).length;

  // last 7 days for habit grid
  const days7 = Array.from({length: 7}, (_, i) => addDays(TODAY_ISO, i - 6));
  const wd = ['일','월','화','수','목','금','토'];

  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '12px 20px 100px', overflow: 'auto', height: 'calc(100% - 54px)' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, fontFamily: JD_DISPLAY, marginBottom: 14 }}>통계</div>

        <div style={{
          background: `linear-gradient(135deg, ${t.me.soft} 0%, ${t.habit.soft} 100%)`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, color: t.me.ink, fontWeight: 600, letterSpacing: 0.3, marginBottom: 3 }}>{year}년 {month}월</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, fontFamily: JD_DISPLAY, fontFeatureSettings: '"tnum"', color: t.text }}>{totalDone}</div>
            <div style={{ fontSize: 13, color: t.textSecondary, fontWeight: 500 }}>/ {monthTasks.length}개 완료</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.6, marginBottom: 8 }}>TASK</div>
        <div style={{ background: t.surface, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          {stats.map(r => (
            <div key={r.cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5, fontSize: 12 }}>
                <JDCatDot cat={r.cat} dark={dark} size={7} />
                <span style={{ marginLeft: 6, fontWeight: 600, color: t.text }}>[{r.label}]</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: t.textSecondary, fontFeatureSettings: '"tnum"' }}>{r.done} / {r.total}</span>
                <span style={{ marginLeft: 10, fontWeight: 700, color: t[r.cat].ink, minWidth: 32, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{Math.round(r.done / r.total * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: t.surfaceAlt, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.done / r.total * 100}%`, background: t[r.cat].solid, borderRadius: 3, transition: 'width .4s' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.6, marginBottom: 8 }}>HABIT</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(habits.length,3)},1fr)`, gap: 8, marginBottom: 10 }}>
          {habits.slice(0,3).map(h => (
            <div key={h.id} style={{ background: t.surface, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{h.emoji}</div>
              <div style={{ fontSize: 11, color: t.textSecondary, fontWeight: 500, marginBottom: 2 }}>{h.title}</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: t.habit.ink, fontFeatureSettings: '"tnum"', fontFamily: JD_DISPLAY }}>
                {habitStreak(h)}<span style={{ fontSize: 10, fontWeight: 500, color: t.textTertiary, marginLeft: 1 }}>일</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: t.surface, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>최근 7일 습관</div>
            <div style={{ fontSize: 11, color: t.textTertiary }}>{wd[weekdayOfISO(days7[0])]}~{wd[weekdayOfISO(days7[6])]}</div>
          </div>
          {habits.map(h => {
            const dots = days7.map(d => h.log[d] ? 1 : 0);
            const rate = Math.round(dots.filter(Boolean).length / 7 * 100);
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 88, fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>{h.emoji} {h.title}</div>
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {dots.map((d, i) => (
                    <button key={i} onClick={() => s.toggleHabit(h.id, days7[i])} style={{
                      all: 'unset', cursor: 'pointer',
                      flex: 1, height: 20, borderRadius: 4,
                      background: d ? t.habit.solid : t.surfaceAlt,
                    }} />
                  ))}
                </div>
                <div style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: t.habit.ink, minWidth: 28, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{rate}%</div>
              </div>
            );
          })}
        </div>
      </div>
      <PTabBar />
      <PDetailScreen />
      <PAddSheet />
    </JDPhone>
  );
};

const PSettingsScreen = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const settings = s.state.settings;

  const Toggle = ({ on, onChange, cat = 'me' }) => (
    <button onClick={() => onChange(!on)} style={{
      all: 'unset', cursor: 'pointer',
      width: 42, height: 26, borderRadius: 14, padding: 2,
      background: on ? t[cat].solid : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
      display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </button>
  );

  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 0 100px', overflow: 'auto', height: 'calc(100% - 54px)' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, fontFamily: JD_DISPLAY, padding: '12px 20px 18px' }}>설정</div>

        <SettingGroup label="계정" dark={dark}>
          <SettingRow dark={dark} avatar title="지민" detail="프로필 편집" chevron last />
        </SettingGroup>

        <SettingGroup label="알림" dark={dark}>
          <SettingRow dark={dark} title="알림" right={<Toggle on={settings.notify} onChange={v => s.updateSetting('notify', v)} />} />
          <SettingRow dark={dark} title="알림 시간" detail={settings.notifyTime}
            input={<input type="time" value={settings.notifyTime} onChange={e => s.updateSetting('notifyTime', e.target.value)}
              style={{ all: 'unset', cursor: 'pointer', color: t.textSecondary, fontSize: 14, fontWeight: 500 }} />} last />
        </SettingGroup>

        <SettingGroup label="디스플레이" dark={dark}>
          <SettingRow dark={dark} title="다크모드" right={<Toggle on={dark} onChange={v => s.setDark(v)} />} />
          <SettingRow dark={dark} title="캘린더 시작 요일" detail={settings.weekStart === 0 ? '일요일' : '월요일'}
            onClick={() => s.updateSetting('weekStart', settings.weekStart === 0 ? 1 : 0)} chevron last />
        </SettingGroup>

        <SettingGroup label="구독" dark={dark}>
          <SettingRow dark={dark} title="현재 플랜" detail={settings.plan === 'pro' ? 'Pro' : 'Free'} chevron />
          <SettingRow dark={dark} title="Pro로 업그레이드" pro chevron last />
        </SettingGroup>

        <SettingGroup label="데이터" dark={dark}>
          <SettingRow dark={dark} title="데이터 내보내기" chevron />
          <SettingRow dark={dark} title="모든 데이터 초기화" danger
            onClick={() => { if (confirm('모든 Task와 습관을 초기화할까요?')) s.reset(); }} last />
        </SettingGroup>

        <SettingGroup label="앱 정보" dark={dark}>
          <SettingRow dark={dark} title="버전" detail="1.0.2" />
          <SettingRow dark={dark} title="이용약관" chevron />
          <SettingRow dark={dark} title="개인정보처리방침" chevron last />
        </SettingGroup>
      </div>
      <PTabBar />
      <PDetailScreen />
      <PAddSheet />
    </JDPhone>
  );
};

const SettingGroup = ({ label, children, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.4, padding: '0 20px 8px' }}>{label}</div>
      <div style={{ background: t.surface, margin: '0 14px', borderRadius: 14, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

const SettingRow = ({ title, detail, chevron, last, dark, danger, pro, avatar, right, input, onClick }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 14px', minHeight: 44, cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      {avatar && <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: `linear-gradient(135deg, ${t.me.solid}, ${t.habit.solid})`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>지</div>}
      <div style={{ flex: 1, fontSize: 15, fontWeight: 500, letterSpacing: -0.2, color: danger ? t.ext.ink : (pro ? t.me.ink : t.text) }}>
        {title}
        {pro && <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: t.me.soft, color: t.me.ink, letterSpacing: 0.3 }}>PRO</span>}
      </div>
      {input}
      {detail && !input && <div style={{ fontSize: 14, color: t.textSecondary, fontWeight: 500 }}>{detail}</div>}
      {right}
      {chevron && <svg width="6" height="10" viewBox="0 0 6 10"><path d="M1 1l3.5 4L1 9" stroke={t.textTertiary} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
};

Object.assign(window, { PStatsScreen, PSettingsScreen });
