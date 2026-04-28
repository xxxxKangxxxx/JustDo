// Interactive Home — calendar with tap-to-select, month nav, task toggles
const PHomeScreen = () => {
  const s = useStore();
  const t = JD_TOKENS[s.state.view.dark ? 'dark' : 'light'];
  const dark = s.state.view.dark;
  const { year, month, selectedDate } = s.state.view;
  const tasks = s.state.tasks;
  const habits = s.state.habits;

  const offset = firstWeekday(year, month);
  const days = dim(year, month);
  const cells = [];
  const prevMonth = addMonths(year, month, -1);
  const prevDays = dim(prevMonth.y, prevMonth.m);
  for (let i = offset - 1; i >= 0; i--) cells.push({ iso: isoOf(prevMonth.y, prevMonth.m, prevDays - i), muted: true, day: prevDays - i });
  for (let d = 1; d <= days; d++) cells.push({ iso: isoOf(year, month, d), muted: false, day: d });
  const nextMonth = addMonths(year, month, 1);
  let n = 1;
  while (cells.length % 7) { cells.push({ iso: isoOf(nextMonth.y, nextMonth.m, n), muted: true, day: n }); n++; }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const weekdays = ['일','월','화','수','목','금','토'];
  const barLaneH = 14;

  // assign lanes per task within month for non-overlap
  const monthStart = isoOf(year, month, 1), monthEnd = isoOf(year, month, days);
  const monthBars = tasksInRange(tasks, monthStart, monthEnd).filter(tt => tt.start !== tt.end);
  const sorted = [...monthBars].sort((a, b) => a.start.localeCompare(b.start) || (b.end.localeCompare(a.end)));
  const lanes = [];
  const laneOf = {};
  for (const tk of sorted) {
    let placed = false;
    for (let li = 0; li < lanes.length; li++) {
      if (lanes[li].every(o => o.end < tk.start || o.start > tk.end)) {
        lanes[li].push(tk); laneOf[tk.id] = li; placed = true; break;
      }
    }
    if (!placed) { lanes.push([tk]); laneOf[tk.id] = lanes.length - 1; }
  }

  const selectedTasks = tasksOnDate(tasks, selectedDate);
  const selDate = parseISO(selectedDate);
  const selWd = weekdayOfISO(selectedDate);
  const isToday = selectedDate === TODAY_ISO;

  const grouped = {
    me: selectedTasks.filter(x => x.cat === 'me'),
    ext: selectedTasks.filter(x => x.cat === 'ext'),
  };
  const habitsForDay = habits.map(h => ({ ...h, doneToday: !!h.log[selectedDate] }));

  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />

      {/* Header with logo + month nav */}
      <div style={{ padding: '10px 20px 10px' }}>
        <div style={{
          fontFamily: JD_DISPLAY, fontSize: 17, fontWeight: 800,
          letterSpacing: -0.6, color: t.text, lineHeight: 1,
          display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 10,
        }}>
          Just Do
          <span style={{ width: 4, height: 4, borderRadius: 2, background: t.accent, marginLeft: 2, alignSelf: 'center' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, letterSpacing: 0.3 }}>{year}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1, fontFamily: JD_DISPLAY, marginTop: 2 }}>
                {month}<span style={{ fontSize: 17, fontWeight: 600, color: t.textSecondary, marginLeft: 2 }}>월</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
              <button onClick={() => { const n = addMonths(year, month, -1); s.setMonth(n.y, n.m); }}
                style={{ all: 'unset', cursor: 'pointer', padding: 6 }}>
                <svg width="8" height="14" viewBox="0 0 8 14" style={{ opacity: 0.6 }}>
                  <path d="M6 1L1 7l5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={() => { const n = addMonths(year, month, 1); s.setMonth(n.y, n.m); }}
                style={{ all: 'unset', cursor: 'pointer', padding: 6 }}>
                <svg width="8" height="14" viewBox="0 0 8 14">
                  <path d="M2 1l5 6-5 6" stroke={t.text} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => s.setDark(!dark)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 8, background: t.surface,
              fontSize: 12, fontWeight: 600, color: t.text,
              border: `0.5px solid ${t.divider}`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>{dark ? '☾' : '☼'}</button>
            <button onClick={() => s.openSheet('add', { date: selectedDate })} style={{
              all: 'unset', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 16, background: t.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 300, lineHeight: 1, paddingBottom: 2,
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ padding: '0 14px' }}>
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
          const weekStartISO = week[0].iso;
          const weekEndISO = week[6].iso;
          const wkBars = monthBars.map(b => {
            let startCol = -1, endCol = -1;
            for (let i = 0; i < 7; i++) {
              const iso = week[i].iso;
              if (iso >= b.start && iso <= b.end && !week[i].muted) {
                if (startCol === -1) startCol = i;
                endCol = i;
              }
            }
            if (startCol === -1) return null;
            return { ...b, startCol, endCol, lane: laneOf[b.id], continuesLeft: b.start < week[startCol].iso, continuesRight: b.end > week[endCol].iso };
          }).filter(Boolean);

          const maxLane = wkBars.reduce((m, b) => Math.max(m, b.lane), -1) + 1;
          return (
            <div key={wi} style={{
              display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
              position: 'relative', minHeight: 32 + Math.max(2, maxLane) * (barLaneH + 2) + 4,
              borderTop: `0.5px solid ${t.divider}`,
            }}>
              {week.map((c, ci) => {
                const today = c.iso === TODAY_ISO;
                const selected = c.iso === selectedDate;
                const isSat = ci === 6, isSun = ci === 0;
                const dayColor = c.muted ? t.textTertiary : isSun ? t.ext.solid : isSat ? t.me.solid : t.text;
                // habit dots for this day
                const habitDone = habits.some(h => h.log[c.iso]);
                const taskShort = !c.muted && tasksOnDate(tasks, c.iso).some(x => x.start === x.end);
                const dotsList = [];
                if (taskShort) {
                  const ts = tasksOnDate(tasks, c.iso).filter(x => x.start === x.end);
                  if (ts.some(x => x.cat === 'me')) dotsList.push('me');
                  if (ts.some(x => x.cat === 'ext')) dotsList.push('ext');
                }
                if (habitDone && !c.muted) dotsList.push('habit');
                return (
                  <button key={ci} onClick={() => !c.muted && s.selectDate(c.iso)} style={{
                    all: 'unset', cursor: c.muted ? 'default' : 'pointer',
                    padding: '6px 4px 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 12,
                      background: today ? t.accent : (selected ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent'),
                      border: selected && !today ? `1.5px solid ${t.accent}` : 'none',
                      color: today ? '#fff' : dayColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: today || selected ? 600 : 500,
                      fontFeatureSettings: '"tnum"', letterSpacing: -0.2,
                    }}>{c.day}</div>
                    {dotsList.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 4 }}>
                        {dotsList.slice(0,3).map((cat, i) => (
                          <div key={i} style={{ width: 4, height: 4, borderRadius: 4, background: t[cat].solid }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <div style={{ position: 'absolute', top: 32, left: 0, right: 0, pointerEvents: 'none' }}>
                {wkBars.map((b) => {
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
                      display: 'flex', alignItems: 'center', padding: '0 6px',
                      overflow: 'hidden', whiteSpace: 'nowrap',
                      opacity: b.done ? 0.5 : 1,
                      textDecoration: b.done ? 'line-through' : 'none',
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

      {/* Selected day list */}
      <div style={{
        margin: '12px 14px 0', padding: '14px 16px 100px',
        background: t.surface, borderRadius: 20,
        maxHeight: 360, overflow: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.dividerStrong, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, fontFamily: JD_DISPLAY }}>
            {selDate.m}월 {selDate.d}일
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>
            {weekdays[selWd]}요일{isToday ? ' · 오늘' : ''}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500 }}>{selectedTasks.length + habitsForDay.length}개</div>
        </div>

        {[
          { key: 'me', label: '나', items: grouped.me },
          { key: 'ext', label: '외부', items: grouped.ext },
        ].map(g => g.items.length > 0 && (
          <div key={g.key} style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: t[g.key].solid }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2, color: t[g.key].ink }}>[{g.label}]</span>
              <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 2 }}>{g.items.length}</span>
            </div>
            {g.items.map((task, i) => (
              <PTaskRow key={task.id} task={task} cat={g.key} dark={dark} last={i === g.items.length - 1}
                onToggle={() => s.toggleTask(task.id)}
                onTap={() => s.pushScreen('detail', { taskId: task.id })}
              />
            ))}
          </div>
        ))}

        {habitsForDay.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: t.habit.solid }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2, color: t.habit.ink }}>[Habit]</span>
              <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 2 }}>{habitsForDay.length}</span>
            </div>
            {habitsForDay.map((h, i) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0', borderBottom: i === habitsForDay.length - 1 ? 'none' : `0.5px solid ${t.divider}`,
              }}>
                <button onClick={() => s.toggleHabit(h.id, selectedDate)} style={{ all: 'unset', cursor: 'pointer' }}>
                  <JDCheckbox checked={h.doneToday} cat="habit" dark={dark} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
                    color: h.doneToday ? t.textTertiary : t.text,
                    textDecoration: h.doneToday ? 'line-through' : 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{h.emoji}</span> {h.title}
                  </div>
                  <div style={{ fontSize: 11, color: t.habit.ink, marginTop: 2, fontWeight: 500 }}>
                    🔥 {habitStreak(h, selectedDate)}일째
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTasks.length === 0 && habitsForDay.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: t.textTertiary, fontSize: 13 }}>
            이 날엔 할일이 없어요. ➕ 로 추가해보세요.
          </div>
        )}
      </div>

      <PTabBar />
      <PDetailScreen />
      <PAddSheet />
    </JDPhone>
  );
};

const PTaskRow = ({ task, cat, dark, last, onToggle, onTap }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const isRange = task.start !== task.end;
  const sd = parseISO(task.start), ed = parseISO(task.end);
  const detail = isRange ? `${sd.m}/${sd.d} – ${ed.m}/${ed.d}` : (task.time ? formatTime(task.time) : '');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0', borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer' }}>
        <JDCheckbox checked={task.done} cat={cat} dark={dark} />
      </button>
      <button onClick={onTap} style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
          color: task.done ? t.textTertiary : t.text,
          textDecoration: task.done ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {task.title}
          {task.priority === 'high' && (
            <span style={{ fontSize: 9, fontWeight: 700, color: t.ext.ink, background: t.ext.soft, padding: '1px 4px', borderRadius: 3, letterSpacing: 0.3 }}>!</span>
          )}
        </div>
      </button>
      <div style={{ fontSize: 12, color: t.textSecondary, fontFeatureSettings: '"tnum"', letterSpacing: -0.1 }}>{detail}</div>
    </div>
  );
};

const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? '오후' : '오전';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${ampm} ${h12}시` : `${ampm} ${h12}:${String(m).padStart(2,'0')}`;
};

Object.assign(window, { PHomeScreen, PTaskRow, formatTime });
