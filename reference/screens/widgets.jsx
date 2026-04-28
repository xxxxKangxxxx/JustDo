// iOS widgets — Small, Medium, Large — rendered on a homescreen-style background
// Widgets use their own miniature tokens but share palette.

const JDWidget = ({ size = 'small', dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const bg = dark ? 'rgba(28,27,24,0.82)' : 'rgba(255,255,255,0.75)';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const dim = { small: 158, medium: 338, large: 338 }[size];
  const h = { small: 158, medium: 158, large: 338 }[size];
  return (
    <div style={{
      width: dim, height: h, borderRadius: 22,
      background: bg,
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
      border: `0.5px solid ${border}`,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      padding: 14, overflow: 'hidden', position: 'relative',
      fontFamily: JD_FONT, color: t.text,
      display: 'flex', flexDirection: 'column',
    }}>
      {size === 'small' && <WidgetSmall dark={dark} />}
      {size === 'medium' && <WidgetMedium dark={dark} />}
      {size === 'large' && <WidgetLarge dark={dark} />}
    </div>
  );
};

const WidgetHeader = ({ dark, right }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.5 }}>JUST DO</div>
      <span style={{ flex: 1 }} />
      <div style={{ fontSize: 10, color: t.textSecondary, fontWeight: 600 }}>{right || '오늘'}</div>
    </div>
  );
};

const WidgetTaskLine = ({ task, cat, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '4px 0',
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: 6,
        border: `1.3px solid ${task.done ? t[cat].solid : t.dividerStrong}`,
        background: task.done ? t[cat].solid : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {task.done && <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 500, color: task.done ? t.textTertiary : t.text,
        textDecoration: task.done ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>{task.title}</div>
    </div>
  );
};

const WidgetSmall = ({ dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const tasks = [
    { title: '삼성전자 지원', done: false, cat: 'me' },
    { title: '업체 미팅', done: false, cat: 'ext' },
    { title: '운동 30분', done: true, cat: 'habit' },
  ];
  return (
    <>
      <WidgetHeader dark={dark} right="4월 21일" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: -0.6,
          fontFamily: JD_DISPLAY, fontFeatureSettings: '"tnum"',
        }}>3</div>
        <div style={{ fontSize: 11, color: t.textSecondary, fontWeight: 500 }}>/ 8 남음</div>
      </div>
      <div style={{ height: 0.5, background: t.divider, marginBottom: 4 }} />
      {tasks.map((tt, i) => <WidgetTaskLine key={i} task={tt} cat={tt.cat} dark={dark} />)}
    </>
  );
};

const WidgetMedium = ({ dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const tasks = [
    { title: '삼성전자 지원', done: false, cat: 'me' },
    { title: '업체 미팅 · 오후 2시', done: false, cat: 'ext' },
    { title: '운동 30분', done: true, cat: 'habit' },
    { title: '팀 보고서 제출', done: false, cat: 'ext' },
  ];
  const weekdays = ['일','월','화','수','목','금','토'];
  const days = [19,20,21,22,23,24,25];
  const today = 21;
  return (
    <>
      <WidgetHeader dark={dark} right="이번 주" />
      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left: mini week */}
        <div style={{ width: 120, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {weekdays.map((w, i) => (
              <div key={w} style={{
                textAlign: 'center', fontSize: 8, fontWeight: 600,
                color: i === 0 ? t.ext.solid : (i === 6 ? t.me.solid : t.textTertiary),
              }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
            {days.map((d, i) => {
              const isToday = d === today;
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '3px 0',
                  borderRadius: 6,
                  background: isToday ? t.accent : 'transparent',
                  color: isToday ? '#fff' : t.text,
                  fontSize: 11, fontWeight: isToday ? 600 : 500,
                  fontFeatureSettings: '"tnum"',
                }}>{d}</div>
              );
            })}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 4, background: t.me.soft, borderRadius: 2, marginBottom: 2 }} />
            <div style={{ height: 4, background: t.ext.soft, borderRadius: 2, marginBottom: 2, width: '60%' }} />
            <div style={{ height: 4, background: t.habit.soft, borderRadius: 2, width: '80%', marginLeft: '20%' }} />
          </div>
          <div style={{ marginTop: 'auto', fontSize: 9, color: t.textTertiary, fontWeight: 500 }}>4월 21일 · 오늘</div>
        </div>
        {/* Right: tasks */}
        <div style={{ flex: 1, borderLeft: `0.5px solid ${t.divider}`, paddingLeft: 12 }}>
          {tasks.map((tt, i) => <WidgetTaskLine key={i} task={tt} cat={tt.cat} dark={dark} />)}
        </div>
      </div>
    </>
  );
};

const WidgetLarge = ({ dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const weekdays = ['일','월','화','수','목','금','토'];
  // April 2026: starts Wed (offset 3)
  const offset = 3;
  const daysInMonth = 30;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ m: true, d: 29 + i });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d });
  while (cells.length % 7) cells.push({ m: true, d: cells.length - offset - daysInMonth + 1 });
  const today = 21;
  const dots = JD_DATA.dots;
  const tasks = [
    { title: '삼성전자 지원 · 4/21 마감', done: false, cat: 'me' },
    { title: '업체 미팅 · 오후 2시', done: false, cat: 'ext' },
    { title: '팀 보고서 제출', done: false, cat: 'ext' },
    { title: '운동 30분', done: true, cat: 'habit' },
  ];
  return (
    <>
      <WidgetHeader dark={dark} right="2026년 4월" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
          {weekdays.map((w, i) => (
            <div key={w} style={{
              textAlign: 'center', fontSize: 8, fontWeight: 600,
              color: i === 0 ? t.ext.solid : (i === 6 ? t.me.solid : t.textTertiary),
            }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((c, i) => {
            const isToday = !c.m && c.d === today;
            const dotList = !c.m ? (dots[c.d] || []) : [];
            return (
              <div key={i} style={{
                padding: '3px 0 1px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: isToday ? t.accent : 'transparent',
                  color: isToday ? '#fff' : (c.m ? t.textTertiary : t.text),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: isToday ? 600 : 500,
                  fontFeatureSettings: '"tnum"',
                }}>{c.d}</div>
                <div style={{ display: 'flex', gap: 1, height: 2 }}>
                  {dotList.slice(0, 3).map((cat, j) => (
                    <div key={j} style={{ width: 2, height: 2, borderRadius: 1, background: t[cat].solid }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 0.5, background: t.divider, margin: '8px 0 6px' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, marginBottom: 4 }}>
          오늘 · 4개
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tasks.map((tt, i) => <WidgetTaskLine key={i} task={tt} cat={tt.cat} dark={dark} />)}
        </div>
      </div>
    </>
  );
};

// Homescreen background mockup
const JDWidgetOnHome = ({ size, dark = false }) => {
  const w = size === 'small' ? 260 : 330;
  const h = size === 'small' ? 360 : (size === 'medium' ? 240 : 420);
  return (
    <div style={{
      width: w, height: h,
      background: dark
        ? 'linear-gradient(140deg, #1a2a3a 0%, #2a1a2e 50%, #0e1420 100%)'
        : 'linear-gradient(140deg, #f5d4c4 0%, #d4a5b8 50%, #6a7a9a 100%)',
      borderRadius: 32, padding: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* faint blur blobs to suggest wallpaper */}
      <div style={{
        position: 'absolute', width: 160, height: 160, borderRadius: 80,
        background: dark ? 'rgba(100,130,180,0.3)' : 'rgba(255,220,180,0.4)',
        top: -40, right: -30, filter: 'blur(30px)',
      }} />
      <div style={{
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        background: dark ? 'rgba(160,100,140,0.25)' : 'rgba(180,150,200,0.5)',
        bottom: -60, left: -40, filter: 'blur(30px)',
      }} />
      <JDWidget size={size} dark={dark} />
      {/* small time label like homescreen */}
      <div style={{
        position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center',
        fontSize: 10, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)',
        letterSpacing: 0.3, textShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}>9:41 · 4월 21일 화요일</div>
    </div>
  );
};

Object.assign(window, { JDWidget, JDWidgetOnHome });
