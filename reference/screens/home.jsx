// Home — Calendar month view with task bars + bottom agenda
// April 2026, today = 21 (Tuesday)

const JDCalendarMonth = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const data = JD_DATA;
  // April 2026 starts on Wednesday
  // Week starts Sunday (iOS default). April 1 2026 is Wednesday = weekday 3.
  const firstDayOffset = 3; // Sun=0
  const daysInMonth = 30;
  // Build calendar grid: 5 weeks × 7 days
  const cells = [];
  // leading prev-month days
  for (let i = 0; i < firstDayOffset; i++) cells.push({ day: 29 + i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  // trailing next-month days
  let n = 1;
  while (cells.length % 7 !== 0) cells.push({ day: n++, muted: true });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const weekdays = ['일','월','화','수','목','금','토'];

  const cellH = 56; // base day cell height
  const barLaneH = 14;
  const maxLanes = 2;

  return (
    <div style={{ padding: '0 14px' }}>
      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {weekdays.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 500,
            color: i === 0 ? t.ext.solid : (i === 6 ? t.me.solid : t.textTertiary),
            letterSpacing: 0.2, paddingBottom: 6,
          }}>{w}</div>
        ))}
      </div>

      {weeks.map((week, wi) => {
        // compute bars that overlap this week
        const weekStart = week[0].muted && wi === 0 ? -firstDayOffset + 1 : week[0].day;
        const weekDays = week.map((c) => c.muted && wi === 0 ? null : (c.muted ? null : c.day));
        // find bars starting or continuing in this week
        const weekBars = data.bars.map(b => {
          // find which columns this bar covers within this week
          let startCol = -1, endCol = -1;
          for (let i = 0; i < 7; i++) {
            const d = weekDays[i];
            if (d != null && d >= b.start && d <= b.end) {
              if (startCol === -1) startCol = i;
              endCol = i;
            }
          }
          if (startCol === -1) return null;
          const continuesLeft = b.start < weekDays[startCol];
          const continuesRight = b.end > weekDays[endCol];
          return { ...b, startCol, endCol, continuesLeft, continuesRight };
        }).filter(Boolean);

        return (
          <div key={wi} style={{
            display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
            position: 'relative', minHeight: cellH + barLaneH * maxLanes + 4,
            borderTop: `0.5px solid ${t.divider}`,
          }}>
            {/* day numbers */}
            {week.map((c, ci) => {
              const isToday = !c.muted && c.day === data.today;
              const dots = !c.muted ? (data.dots[c.day] || []) : [];
              const isSat = ci === 6, isSun = ci === 0;
              const dayColor = c.muted ? t.textTertiary
                : isSun ? t.ext.solid
                : isSat ? t.me.solid
                : t.text;
              return (
                <div key={ci} style={{
                  padding: '6px 4px 0',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  position: 'relative',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: isToday ? t.accent : 'transparent',
                    color: isToday ? '#fff' : dayColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: isToday ? 600 : 500,
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: -0.2,
                  }}>{c.day}</div>
                  {/* dots under day */}
                  {dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 4 }}>
                      {dots.slice(0, 3).map((cat, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: 4, background: t[cat].solid }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* bars — overlaid using absolute, below day numbers */}
            <div style={{ position: 'absolute', top: 32, left: 0, right: 0, pointerEvents: 'none' }}>
              {weekBars.map((b, i) => {
                const left = `calc(${(b.startCol / 7) * 100}% + 2px)`;
                const width = `calc(${((b.endCol - b.startCol + 1) / 7) * 100}% - 4px)`;
                const top = b.lane * (barLaneH + 2);
                const cat = t[b.cat];
                return (
                  <div key={b.id + wi} style={{
                    position: 'absolute', left, width, top, height: barLaneH,
                    background: cat.soft, color: cat.ink,
                    borderTopLeftRadius: b.continuesLeft ? 0 : 4,
                    borderBottomLeftRadius: b.continuesLeft ? 0 : 4,
                    borderTopRightRadius: b.continuesRight ? 0 : 4,
                    borderBottomRightRadius: b.continuesRight ? 0 : 4,
                    fontSize: 10, fontWeight: 600, letterSpacing: -0.1,
                    display: 'flex', alignItems: 'center',
                    padding: '0 6px', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {!b.continuesLeft && b.title}
                    {b.continuesLeft && <span style={{ opacity: 0.5 }}>← {b.title}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const JDTaskRow = ({ task, cat, dark = false, last = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0', borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <JDCheckbox checked={task.done} cat={cat} dark={dark} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
          color: task.done ? t.textTertiary : t.text,
          textDecoration: task.done ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {task.title}
          {task.priority === 'high' && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: t.ext.ink,
              background: t.ext.soft, padding: '1px 4px', borderRadius: 3,
              letterSpacing: 0.3,
            }}>!</span>
          )}
        </div>
        {task.streak != null && (
          <div style={{ fontSize: 11, color: t[cat].ink, marginTop: 2, fontWeight: 500 }}>
            🔥 {task.streak}일째
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: t.textSecondary, fontFeatureSettings: '"tnum"', letterSpacing: -0.1 }}>
        {task.time || task.range || ''}
      </div>
    </div>
  );
};

const JDHomeScreen = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const data = JD_DATA;
  const cats = [
    { key: 'me', label: '나' },
    { key: 'ext', label: '외부' },
    { key: 'habit', label: 'Habit' },
  ];
  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />

      {/* Nav header — logo top · year/month + arrows · view switcher · add */}
      <div style={{ padding: '10px 20px 10px' }}>
        {/* Logo */}
        <div style={{
          fontFamily: JD_DISPLAY, fontSize: 17, fontWeight: 800,
          letterSpacing: -0.6, color: t.text, lineHeight: 1,
          display: 'flex', alignItems: 'baseline', gap: 2,
          marginBottom: 10,
        }}>
          Just Do
          <span style={{ width: 4, height: 4, borderRadius: 2, background: t.accent, marginLeft: 2, alignSelf: 'center' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, letterSpacing: 0.3 }}>{data.year}</div>
              <div style={{
                fontSize: 26, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1,
                fontFamily: JD_DISPLAY, marginTop: 2,
              }}>
                4<span style={{ fontSize: 17, fontWeight: 600, color: t.textSecondary, marginLeft: 2 }}>월</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
              <svg width="8" height="14" viewBox="0 0 8 14" style={{ opacity: 0.5 }}>
                <path d="M6 1L1 7l5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg width="8" height="14" viewBox="0 0 8 14">
                <path d="M2 1l5 6-5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '6px 10px', borderRadius: 8, background: t.surface,
              fontSize: 12, fontWeight: 600, color: t.text,
              display: 'flex', alignItems: 'center', gap: 4,
              border: `0.5px solid ${t.divider}`,
            }}>
              월간
              <svg width="9" height="5" viewBox="0 0 9 5"><path d="M1 1l3.5 3L8 1" stroke={t.textSecondary} strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 16,
              background: t.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 300, lineHeight: 1, paddingBottom: 2,
            }}>+</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <JDCalendarMonth dark={dark} />

      {/* Selected-day sheet */}
      <div style={{
        margin: '12px 14px 0', padding: '14px 16px 80px',
        background: t.surface, borderRadius: 20,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        position: 'relative',
        boxShadow: dark ? 'none' : '0 1px 0 rgba(0,0,0,0.02)',
        maxHeight: 340, overflow: 'auto',
      }}>
        {/* sheet handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: t.dividerStrong, margin: '0 auto 14px',
        }} />
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, fontFamily: JD_DISPLAY }}>
            4월 21일
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>화요일 · 오늘</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500 }}>8개 항목</div>
        </div>

        {cats.map((c) => {
          const tasks = data.selectedTasks[c.key];
          if (!tasks || !tasks.length) return null;
          return (
            <div key={c.key} style={{ marginTop: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 4, paddingBottom: 2,
              }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, background: t[c.key].solid }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
                  color: t[c.key].ink,
                }}>[{c.label}]</span>
                <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 2 }}>{tasks.length}</span>
              </div>
              {tasks.map((task, i) => (
                <JDTaskRow key={task.id} task={task} cat={c.key} dark={dark} last={i === tasks.length - 1} />
              ))}
            </div>
          );
        })}
      </div>

      <JDTabBar active="home" dark={dark} />
    </JDPhone>
  );
};

Object.assign(window, { JDHomeScreen, JDCalendarMonth, JDTaskRow });
