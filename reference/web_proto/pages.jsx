// Stats dashboard + Settings + Auth + Search results

// ===== STATS =====
const WStatsPage = () => {
  const w = useW(); const t = useT();
  const tasks = w.data.tasks;
  const totalDone = tasks.filter(x => x.done).length;
  const totalOpen = tasks.filter(x => !x.done).length;
  const completion = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;
  const meDone = tasks.filter(x => x.cat === 'me' && x.done).length;
  const meTotal = tasks.filter(x => x.cat === 'me').length;
  const extDone = tasks.filter(x => x.cat === 'ext' && x.done).length;
  const extTotal = tasks.filter(x => x.cat === 'ext').length;

  const today = W_TODAY;
  const weekStart = wAdd(today, -6);
  const week = Array.from({length: 7}, (_, i) => wAdd(weekStart, i));
  const dayCounts = week.map(iso => {
    const day = wTasksOnDate(tasks, iso);
    return { iso, total: day.length, done: day.filter(x => x.done).length };
  });
  const maxDay = Math.max(1, ...dayCounts.map(d => d.total));

  // Habit streaks
  const habitRows = w.data.habits.map(h => {
    const dates = Object.keys(h.log).filter(k => h.log[k]).sort();
    let streak = 0; let cur = today;
    while (h.log[cur]) { streak++; cur = wAdd(cur, -1); }
    return { ...h, count: dates.length, streak };
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard t={t} label="완료율" value={`${completion}%`} hint={`${totalDone}/${tasks.length}`} accent={t.me.solid}>
            <RingProgress pct={completion} color={t.me.solid} bg={t.surfaceAlt} />
          </StatCard>
          <StatCard t={t} label="진행 중" value={totalOpen} hint="open tasks" accent={t.ext.solid} />
          <StatCard t={t} label="완료" value={totalDone} hint="this period" accent={t.habit.solid} />
          <StatCard t={t} label="활성 습관" value={w.data.habits.length} hint="streaks" accent={t.accent} />
        </div>

        <Section t={t} title="이번 주 활동" subtitle="최근 7일 task 완료 추이">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 160, padding: '12px 4px' }}>
            {dayCounts.map((d, i) => {
              const isToday = d.iso === today;
              const totalH = (d.total / maxDay) * 100;
              const doneH = (d.done / maxDay) * 100;
              return (
                <div key={d.iso} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, width: '100%', maxWidth: 50, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${totalH}%`, background: t.surfaceAlt, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${d.total ? (d.done / d.total) * 100 : 0}%`, background: t.me.solid, borderRadius: '0 0 4px 4px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: isToday ? t.accent : t.textTertiary, fontFeatureSettings: '"tnum"' }}>{wParse(d.iso).d}</div>
                  <div style={{ fontSize: 10, color: isToday ? t.accent : t.textTertiary, fontWeight: isToday ? 700 : 500 }}>{WK_LABEL[wWday(d.iso)]}</div>
                </div>
              );
            })}
          </div>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <Section t={t} title="카테고리별">
            <BarRow t={t} label="나" done={meDone} total={meTotal} color={t.me.solid} bg={t.me.softer} />
            <BarRow t={t} label="외부" done={extDone} total={extTotal} color={t.ext.solid} bg={t.ext.softer} />
          </Section>

          <Section t={t} title="습관">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habitRows.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: t.habit.softer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{h.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{h.title}</div>
                    <div style={{ fontSize: 10.5, color: t.textTertiary, marginTop: 1, fontFeatureSettings: '"tnum"' }}>{h.count}회 누적</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontFamily: W_FONT, fontSize: 18, fontWeight: 700, color: t.habit.ink, fontFeatureSettings: '"tnum"' }}>{h.streak}</span>
                    <span style={{ fontSize: 10, color: t.textTertiary, fontWeight: 600 }}>일 연속</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, hint, accent, children, t }) => (
  <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: W_FONT, fontSize: 30, fontWeight: 700, letterSpacing: -0.8, color: t.text, marginTop: 4, fontFeatureSettings: '"tnum"' }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  </div>
);

const RingProgress = ({ pct, color, bg }) => {
  const r = 18; const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} stroke={bg} strokeWidth="4" fill="none" />
      <circle cx="24" cy="24" r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 24 24)" />
    </svg>
  );
};

const Section = ({ title, subtitle, children, t }) => (
  <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18 }}>
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: W_FONT, fontSize: 14.5, fontWeight: 700, letterSpacing: -0.3, color: t.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11.5, color: t.textTertiary, marginTop: 2 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

const BarRow = ({ label, done, total, color, bg, t }) => {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: t.textSecondary, fontWeight: 600 }}>{label}</span>
        <span style={{ color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{done}/{total} · {Math.round(pct)}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: bg, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  );
};

// ===== SETTINGS =====
const WSettingsPage = () => {
  const w = useW(); const t = useT();
  const s = w.data.settings;
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Section t={t} title="알림">
          <SetRow t={t} label="일일 알림" hint="매일 정해진 시간에 오늘 할 일 알림을 받습니다.">
            <Switch on={s.notify} onChange={() => w.updateSetting('notify', !s.notify)} t={t} />
          </SetRow>
          <SetRow t={t} label="알림 시간">
            <input type="time" value={s.notifyTime} onChange={e => w.updateSetting('notifyTime', e.target.value)} style={dateInput(t)} />
          </SetRow>
        </Section>

        <Section t={t} title="화면">
          <SetRow t={t} label="다크 모드">
            <Switch on={w.ui.dark} onChange={() => w.toggleDark()} t={t} />
          </SetRow>
          <SetRow t={t} label="주 시작" hint="캘린더에서 주가 시작하는 요일">
            <select value={s.weekStart} onChange={e => w.updateSetting('weekStart', Number(e.target.value))} style={dateInput(t)}>
              <option value={0}>일요일</option>
              <option value={1}>월요일</option>
            </select>
          </SetRow>
        </Section>

        <Section t={t} title="계정">
          {w.data.auth.signedIn ? (
            <>
              <SetRow t={t} label="로그인됨">
                <span style={{ fontSize: 12.5, color: t.text }}>{w.data.auth.provider}</span>
              </SetRow>
              <SetRow t={t} label="플랜">
                <span style={{ fontSize: 12.5, color: t.text, padding: '2px 8px', borderRadius: 4, background: t.me.softer, fontWeight: 600 }}>{s.plan === 'free' ? '무료' : 'Pro'}</span>
              </SetRow>
              <SetRow t={t} label="">
                <button onClick={() => w.signOut()} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.danger, padding: '5px 12px', borderRadius: 6, border: `0.5px solid ${t.divider}` }}>로그아웃</button>
              </SetRow>
            </>
          ) : (
            <SetRow t={t} label="로그인되지 않음">
              <button onClick={() => w.signOut()} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.text }}>로그인 →</button>
            </SetRow>
          )}
        </Section>

        <Section t={t} title="데이터">
          <SetRow t={t} label="모든 데이터 초기화" hint="task, 습관, 설정이 모두 초기 상태로 되돌아갑니다.">
            <button onClick={() => { if (confirm('정말 초기화할까요?')) w.reset(); }} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.danger, padding: '5px 12px', borderRadius: 6, border: `0.5px solid ${t.divider}` }}>초기화</button>
          </SetRow>
        </Section>

        <div style={{ fontSize: 11, color: t.textTertiary, textAlign: 'center', padding: '12px 0' }}>Just Do v1.0 · made with care</div>
      </div>
    </div>
  );
};

const SetRow = ({ label, hint, children, t }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `0.5px solid ${t.divider}` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 1 }}>{hint}</div>}
    </div>
    {children}
  </div>
);

const Switch = ({ on, onChange, t }) => (
  <button onClick={onChange} style={{
    all: 'unset', cursor: 'pointer', width: 36, height: 20, borderRadius: 10,
    background: on ? t.me.solid : t.dividerStrong, position: 'relative', transition: 'background .2s',
  }}>
    <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
  </button>
);

// ===== SEARCH RESULTS =====
const WSearchPage = () => {
  const w = useW(); const t = useT();
  const q = w.ui.searchQ;
  const results = wFilterTasks(w.data.tasks, w.ui.filters, q);
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, fontSize: 12.5, color: t.textTertiary }}>
          <strong style={{ color: t.text, fontSize: 13 }}>"{q}"</strong> 결과 {results.length}개
        </div>
        {results.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.textTertiary, fontSize: 13 }}>일치하는 task가 없어요</div>
        ) : (
          <div style={{ background: t.surface, borderRadius: 10, border: `0.5px solid ${t.divider}` }}>
            {results.map((tk, i) => <WListRow key={tk.id} task={tk} last={i === results.length - 1} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== AUTH =====
const WAuthScreen = () => {
  const w = useW(); const t = useT();
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, padding: 24 }}>
      <div style={{ width: 380, maxWidth: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: W_FONT, fontSize: 44, fontWeight: 800, letterSpacing: -1.6, color: t.text, display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          Just Do
          <span style={{ width: 9, height: 9, borderRadius: 5, background: t.accent, alignSelf: 'center' }} />
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 10, lineHeight: 1.5 }}>
          오늘 할 일을, 그냥 한다.<br/>
          캘린더 위에서 시간을 디자인하세요.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 36 }}>
          {[
            { id: 'apple', label: 'Apple로 계속하기', bg: '#000', fg: '#fff', icon: '' },
            { id: 'google', label: 'Google로 계속하기', bg: t.surface, fg: t.text, border: true, icon: 'G' },
            { id: 'kakao', label: '카카오로 계속하기', bg: '#FEE500', fg: '#191919', icon: '' },
            { id: 'email', label: '이메일로 계속하기', bg: 'transparent', fg: t.text, border: true, icon: '✉' },
          ].map(p => (
            <button key={p.id} onClick={() => w.signIn(p.id)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '12px 16px', borderRadius: 10,
              background: p.bg, color: p.fg,
              border: p.border ? `0.5px solid ${t.dividerStrong}` : 'none',
              fontFamily: W_FONT, fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {p.icon && <span style={{ fontWeight: 700 }}>{p.icon}</span>}
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 26, lineHeight: 1.5 }}>
          계속 진행하면 <u>이용약관</u>과 <u>개인정보처리방침</u>에<br/>동의하는 것으로 간주됩니다.
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WStatsPage, WSettingsPage, WSearchPage, WAuthScreen });
