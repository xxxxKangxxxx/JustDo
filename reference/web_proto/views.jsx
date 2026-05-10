// Month grid + Week timeline + List view
const WMonthGrid = () => {
  const w = useW(); const t = useT();
  const { year, month } = w.ui;
  const first = wFirst(year, month);
  const days = wDim(year, month);
  const prevDays = wDim(...Object.values(wAddMonths(year, month, -1)).reverse().reverse());
  const totalCells = Math.ceil((first + days) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayN = i - first + 1;
    if (dayN < 1) {
      const prev = wAddMonths(year, month, -1);
      const d = wDim(prev.y, prev.m) + dayN;
      cells.push({ iso: wIso(prev.y, prev.m, d), d, muted: true });
    } else if (dayN > days) {
      const next = wAddMonths(year, month, 1);
      cells.push({ iso: wIso(next.y, next.m, dayN - days), d: dayN - days, muted: true });
    } else {
      cells.push({ iso: wIso(year, month, dayN), d: dayN, muted: false });
    }
  }

  // assign tracks for multi-day tasks
  const tasks = wFilterTasks(w.data.tasks, w.ui.filters, '');
  const weeks = [];
  for (let r = 0; r < cells.length / 7; r++) {
    const weekCells = cells.slice(r*7, r*7+7);
    const wkStart = weekCells[0].iso, wkEnd = weekCells[6].iso;
    const items = tasks.filter(tk => !(tk.end < wkStart || tk.start > wkEnd))
      .sort((a, b) => (b.end > b.start ? 1 : 0) - (a.end > a.start ? 1 : 0) || a.start.localeCompare(b.start));
    const tracks = [];
    items.forEach(tk => {
      const startCol = Math.max(0, weekCells.findIndex(c => c.iso >= tk.start));
      const startISO = tk.start < wkStart ? wkStart : tk.start;
      const endISO = tk.end > wkEnd ? wkEnd : tk.end;
      const colA = weekCells.findIndex(c => c.iso === startISO);
      const colB = weekCells.findIndex(c => c.iso === endISO);
      let trackIdx = 0;
      while (tracks[trackIdx] && tracks[trackIdx].some(s => !(s.colB < colA || s.colA > colB))) trackIdx++;
      tracks[trackIdx] = tracks[trackIdx] || [];
      tracks[trackIdx].push({ task: tk, colA, colB });
    });
    weeks.push({ cells: weekCells, tracks });
  }

  const [drag, setDrag] = React.useState(null); // { startISO, endISO } for new
  const [dragTask, setDragTask] = React.useState(null); // moving existing
  const todayDate = W_TODAY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `0.5px solid ${t.divider}`, background: t.bg }}>
        {WK_LABEL.map((d, i) => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: i === 0 ? t.ext.ink : i === 6 ? t.me.ink : t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateRows: `repeat(${weeks.length}, 1fr)`, minHeight: 0 }}>
        {weeks.map((wk, wi) => (
          <div key={wi} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi === weeks.length - 1 ? 'none' : `0.5px solid ${t.divider}` }}>
            {wk.cells.map((c, ci) => {
              const isToday = c.iso === todayDate;
              const isSel = c.iso === w.ui.selectedDate;
              const inDrag = drag && c.iso >= drag.startISO && c.iso <= drag.endISO;
              return (
                <div key={c.iso} onClick={() => w.selectDate(c.iso)}
                  onDoubleClick={() => w.openNew({ date: c.iso })}
                  onMouseDown={(e) => { if (e.button !== 0) return; setDrag({ anchor: c.iso, startISO: c.iso, endISO: c.iso }); }}
                  onMouseEnter={() => { if (drag) { const a = drag.anchor; setDrag({ anchor: a, startISO: a < c.iso ? a : c.iso, endISO: a > c.iso ? a : c.iso }); } }}
                  onMouseUp={() => { if (drag) { w.openNew({ date: drag.startISO, range: [drag.startISO, drag.endISO] }); setDrag(null); } }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const id = e.dataTransfer.getData('text/task'); if (id) w.moveTaskTo(id, c.iso); }}
                  style={{
                    position: 'relative',
                    borderRight: ci === 6 ? 'none' : `0.5px solid ${t.divider}`,
                    background: inDrag ? t.me.softer : (isSel ? t.selected : 'transparent'),
                    padding: '6px 8px 6px',
                    minHeight: 0,
                    display: 'flex', flexDirection: 'column', gap: 2,
                    cursor: 'pointer',
                    opacity: c.muted ? 0.45 : 1,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: isToday ? 700 : 500,
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11,
                      background: isToday ? t.accent : 'transparent',
                      color: isToday ? '#fff' : (ci === 0 ? t.ext.ink : ci === 6 ? t.me.ink : t.text),
                      fontFeatureSettings: '"tnum"',
                    }}>{c.d}</span>
                  </div>
                  {/* spacer for tracks */}
                  <div style={{ flex: 1 }} />
                </div>
              );
            })}
            {/* track overlays */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30, bottom: 4, display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
              {wk.tracks.slice(0, 4).map((tk, ti) => (
                <div key={ti} style={{ position: 'relative', height: 20 }}>
                  {tk.map(({ task, colA, colB }) => {
                    const cat = W_TOKENS[w.ui.dark ? 'dark' : 'light'][task.cat];
                    return (
                      <div key={task.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/task', task.id); setDragTask(task.id); }}
                        onDragEnd={() => setDragTask(null)}
                        onClick={(e) => { e.stopPropagation(); w.openModal(task.id); }}
                        style={{
                          position: 'absolute',
                          left: `calc(${(colA / 7) * 100}% + 4px)`,
                          width: `calc(${((colB - colA + 1) / 7) * 100}% - 8px)`,
                          height: 18, lineHeight: '18px',
                          background: cat.soft, color: cat.ink,
                          fontSize: 11, fontWeight: 600, letterSpacing: -0.1,
                          padding: '0 7px', borderRadius: 4,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          textDecoration: task.done ? 'line-through' : 'none',
                          opacity: task.done ? 0.55 : 1,
                          cursor: 'pointer', pointerEvents: 'auto',
                          borderLeft: `2px solid ${cat.solid}`,
                        }}
                        title={task.title}
                      >
                        {task.time && <span style={{ fontWeight: 500, opacity: 0.7, marginRight: 4 }}>{task.time}</span>}
                        {task.title}
                      </div>
                    );
                  })}
                </div>
              ))}
              {wk.tracks.length > 4 && (
                <div style={{ position: 'absolute', right: 6, bottom: -2, fontSize: 10, color: t.textTertiary, fontWeight: 500 }}>+{wk.tracks.length - 4}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Week timeline — 7 columns × 24 hours
const WWeekView = () => {
  const w = useW(); const t = useT();
  const start = w.ui.weekStart;
  const days = Array.from({length: 7}, (_, i) => wAdd(start, i));
  const tasks = wFilterTasks(w.data.tasks, w.ui.filters, '');
  const HOUR_H = 36;
  const ALL_DAY_H = 28;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: `0.5px solid ${t.divider}`, background: t.bg }}>
        <div />
        {days.map((iso, i) => {
          const {d} = wParse(iso);
          const isToday = iso === W_TODAY;
          return (
            <div key={iso} onClick={() => w.selectDate(iso)} style={{ padding: '8px 10px', cursor: 'pointer', borderLeft: `0.5px solid ${t.divider}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: i === 0 ? t.ext.ink : i === 6 ? t.me.ink : t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{WK_LABEL[i]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{
                  fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"',
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 13,
                  background: isToday ? t.accent : 'transparent', color: isToday ? '#fff' : t.text,
                }}>{d}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* All-day row */}
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: `0.5px solid ${t.divider}`, background: t.bg2, minHeight: ALL_DAY_H * 1.2, padding: '4px 0' }}>
        <div style={{ fontSize: 10, color: t.textTertiary, padding: '4px 8px', textAlign: 'right' }}>종일</div>
        {days.map((iso, i) => {
          const dayTasks = tasks.filter(tk => tk.start <= iso && iso <= tk.end && !tk.time);
          return (
            <div key={iso} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('text/task'); if (id) w.moveTaskTo(id, iso); }}
              style={{ borderLeft: `0.5px solid ${t.divider}`, padding: '2px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {dayTasks.slice(0, 2).map(tk => {
                const cat = W_TOKENS[w.ui.dark ? 'dark' : 'light'][tk.cat];
                return (
                  <div key={tk.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task', tk.id)} onClick={() => w.openModal(tk.id)} style={{ background: cat.soft, color: cat.ink, fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 3, cursor: 'pointer', borderLeft: `2px solid ${cat.solid}`, textDecoration: tk.done ? 'line-through' : 'none', opacity: tk.done ? 0.55 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tk.title}</div>
                );
              })}
              {dayTasks.length > 2 && <div style={{ fontSize: 9, color: t.textTertiary }}>+{dayTasks.length - 2}</div>}
            </div>
          );
        })}
      </div>
      {/* Hour grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', position: 'relative' }}>
          <div>
            {Array.from({length: 24}, (_, h) => (
              <div key={h} style={{ height: HOUR_H, fontSize: 10, color: t.textTertiary, padding: '0 8px', textAlign: 'right', borderTop: h === 0 ? 'none' : `0.5px solid ${t.divider}`, transform: 'translateY(-6px)' }}>{h === 0 ? '' : `${h}시`}</div>
            ))}
          </div>
          {days.map((iso, di) => {
            const dayTimed = tasks.filter(tk => tk.start <= iso && iso <= tk.end && tk.time);
            return (
              <div key={iso} style={{ position: 'relative', borderLeft: `0.5px solid ${t.divider}` }}>
                {Array.from({length: 24}, (_, h) => (
                  <div key={h} onClick={() => w.openNew({ date: iso, time: `${String(h).padStart(2,'0')}:00` })} style={{ height: HOUR_H, borderTop: h === 0 ? 'none' : `0.5px solid ${t.divider}`, cursor: 'pointer' }} />
                ))}
                {dayTimed.map(tk => {
                  const [h, m] = tk.time.split(':').map(Number);
                  const top = h * HOUR_H + (m / 60) * HOUR_H;
                  const cat = W_TOKENS[w.ui.dark ? 'dark' : 'light'][tk.cat];
                  return (
                    <div key={tk.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task', tk.id)} onClick={(e) => { e.stopPropagation(); w.openModal(tk.id); }} style={{
                      position: 'absolute', top, left: 4, right: 4, minHeight: 32,
                      background: cat.soft, color: cat.ink,
                      borderLeft: `3px solid ${cat.solid}`, borderRadius: 4,
                      padding: '4px 7px', cursor: 'pointer',
                      opacity: tk.done ? 0.55 : 1,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{wFmtTime(tk.time)}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, textDecoration: tk.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tk.title}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// List view — sectioned (Today / Upcoming / Later / Done)
const WListView = () => {
  const w = useW(); const t = useT();
  const tasks = wFilterTasks(w.data.tasks, w.ui.filters, '');
  const today = W_TODAY;
  const upcomingEnd = wAdd(today, 7);
  const sections = [
    { id: 'today', title: '오늘', items: tasks.filter(x => !x.done && x.start <= today && today <= x.end) },
    { id: 'upcoming', title: '다가오는 7일', items: tasks.filter(x => !x.done && x.start > today && x.start <= upcomingEnd) },
    { id: 'later', title: '이후', items: tasks.filter(x => !x.done && x.start > upcomingEnd) },
    { id: 'done', title: '완료', items: tasks.filter(x => x.done) },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {sections.map(sec => (
          <div key={sec.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontFamily: W_FONT, fontSize: 16, fontWeight: 700, letterSpacing: -0.4, color: t.text }}>{sec.title}</h2>
              <span style={{ fontSize: 12, color: t.textTertiary, fontWeight: 600 }}>{sec.items.length}</span>
            </div>
            {sec.items.length === 0 ? (
              <div style={{ padding: '14px 16px', borderRadius: 10, background: t.surfaceAlt, fontSize: 12.5, color: t.textTertiary }}>없음</div>
            ) : (
              <div style={{ background: t.surface, borderRadius: 10, border: `0.5px solid ${t.divider}` }}>
                {sec.items.map((tk, i) => <WListRow key={tk.id} task={tk} last={i === sec.items.length - 1} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const WListRow = ({ task, last }) => {
  const w = useW(); const t = useT();
  const cat = W_TOKENS[w.ui.dark ? 'dark' : 'light'][task.cat];
  const sel = w.ui.selectedIds.includes(task.id);
  return (
    <div onClick={(e) => { if (e.metaKey || e.ctrlKey) w.toggleSel(task.id); else w.openModal(task.id); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', cursor: 'pointer',
        borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
        background: sel ? t.selected : 'transparent',
      }}>
      <button onClick={(e) => { e.stopPropagation(); w.toggleTask(task.id); }} style={{
        all: 'unset', cursor: 'pointer',
        width: 17, height: 17, borderRadius: 5, flexShrink: 0,
        background: task.done ? cat.solid : 'transparent',
        border: `1.5px solid ${task.done ? cat.solid : cat.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{task.done && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7L8 1.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: t.text, textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: cat.soft, color: cat.ink }}>{W_CATS[task.cat]}</span>
          <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>
            {task.start === task.end ? `${wParse(task.start).m}/${wParse(task.start).d}` : `${wParse(task.start).m}/${wParse(task.start).d} – ${wParse(task.end).m}/${wParse(task.end).d}`}
            {task.time && ` · ${wFmtTime(task.time)}`}
          </span>
          {task.tags?.map(tg => <span key={tg} style={{ fontSize: 10.5, color: t.textTertiary, fontWeight: 500 }}>{tg}</span>)}
        </div>
      </div>
      {task.priority && task.priority !== 'mid' && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: task.priority === 'high' ? t.danger : t.textTertiary }}>{task.priority === 'high' ? '높음' : '낮음'}</span>
      )}
    </div>
  );
};

Object.assign(window, { WMonthGrid, WWeekView, WListView, WListRow });
