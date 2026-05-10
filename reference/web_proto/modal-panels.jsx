// Task modal (center) + Inline new-task creator + Today panel + Command palette + Stats + Settings + Auth + Search

// ===== Task modal =====
const WTaskModal = () => {
  const w = useW(); const t = useT();
  const id = w.ui.modalTaskId;
  const open = !!id;
  const live = open ? w.data.tasks.find(x => x.id === id) : null;
  const lastRef = React.useRef(null);
  if (live) lastRef.current = live;
  const task = live || lastRef.current;

  return (
    <div onClick={() => w.closeModal()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,12,8,0.42)',
      backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity .15s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 540, maxWidth: '92vw', maxHeight: '86vh',
        background: t.surface, borderRadius: 16,
        boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
        border: `0.5px solid ${t.divider}`,
        overflow: 'hidden',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.985)',
        transition: 'transform .18s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        {task && <WTaskModalBody task={task} t={t} w={w} />}
      </div>
    </div>
  );
};

const WTaskModalBody = ({ task, t, w }) => {
  const [title, setTitle] = React.useState(task.title);
  const [start, setStart] = React.useState(task.start);
  const [end, setEnd] = React.useState(task.end);
  const [time, setTime] = React.useState(task.time || '');
  const [cat, setCat] = React.useState(task.cat);
  const [priority, setPriority] = React.useState(task.priority || 'mid');
  React.useEffect(() => { setTitle(task.title); setStart(task.start); setEnd(task.end); setTime(task.time || ''); setCat(task.cat); setPriority(task.priority || 'mid'); }, [task.id]);

  const save = () => { w.updateTask(task.id, { title, start, end, time: time || null, cat, priority }); w.showToast('저장됨'); };
  const c = W_TOKENS[w.ui.dark ? 'dark' : 'light'][cat];

  return (
    <>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `0.5px solid ${t.divider}` }}>
        <button onClick={() => w.toggleTask(task.id)} style={{
          all: 'unset', cursor: 'pointer',
          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
          background: task.done ? c.solid : 'transparent',
          border: `1.5px solid ${task.done ? c.solid : c.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{task.done && <svg width="11" height="11" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7L8 1.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={save} style={{
          flex: 1, all: 'unset',
          fontFamily: W_FONT, fontSize: 19, fontWeight: 700, letterSpacing: -0.4, color: t.text,
          textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.55 : 1,
        }} />
        <button onClick={() => { w.deleteTask(task.id); w.closeModal(); w.showToast('삭제됨'); }} style={modalIconBtn(t)} title="삭제">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4h7M5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4l.5 7a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={() => w.closeModal()} style={modalIconBtn(t)} title="닫기 (Esc)">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ padding: '16px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ModalRow label="기간" t={t}>
          <input type="date" value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} onBlur={save} style={dateInput(t)} />
          <span style={{ color: t.textTertiary, fontSize: 12 }}>—</span>
          <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} onBlur={save} style={dateInput(t)} />
        </ModalRow>
        <ModalRow label="시간" t={t}>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} onBlur={save} style={dateInput(t)} />
          {time && <button onClick={() => { setTime(''); w.updateTask(task.id, { time: null }); }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: t.textTertiary }}>지우기</button>}
        </ModalRow>
        <ModalRow label="카테고리" t={t}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{k:'me',l:'나'},{k:'ext',l:'외부'}].map(o => {
              const oc = W_TOKENS[w.ui.dark ? 'dark' : 'light'][o.k];
              const active = cat === o.k;
              return (
                <button key={o.k} onClick={() => { setCat(o.k); w.updateTask(task.id, { cat: o.k }); }} style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: active ? oc.soft : 'transparent', color: active ? oc.ink : t.textSecondary,
                  border: active ? 'none' : `0.5px solid ${t.divider}`,
                }}>{o.l}</button>
              );
            })}
          </div>
        </ModalRow>
        <ModalRow label="우선순위" t={t}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{k:'high',l:'높음'},{k:'mid',l:'중간'},{k:'low',l:'낮음'}].map(p => (
              <button key={p.k} onClick={() => { setPriority(p.k); w.updateTask(task.id, { priority: p.k }); }} style={{
                all: 'unset', cursor: 'pointer',
                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: priority === p.k ? c.soft : 'transparent', color: priority === p.k ? c.ink : t.textSecondary,
                border: priority === p.k ? 'none' : `0.5px solid ${t.divider}`,
              }}>{p.l}</button>
            ))}
          </div>
        </ModalRow>
        {task.tags?.length > 0 && (
          <ModalRow label="태그" t={t}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {task.tags.map(tg => <span key={tg} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: c.soft, color: c.ink }}>{tg}</span>)}
            </div>
          </ModalRow>
        )}
      </div>

      <div style={{ padding: '10px 18px', borderTop: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: t.textTertiary }}>
        <span>드래그해서 다른 날짜로 이동</span>
        <span><Kbd t={t}>Esc</Kbd> 닫기</span>
      </div>
    </>
  );
};

const ModalRow = ({ label, children, t }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 72, fontSize: 11.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, fontSize: 12.5 }}>{children}</div>
  </div>
);
const dateInput = (t) => ({ all: 'unset', cursor: 'pointer', padding: '4px 8px', borderRadius: 5, border: `0.5px solid ${t.divider}`, color: t.text, fontSize: 12, fontFamily: W_FONT });
const modalIconBtn = (t) => ({ all: 'unset', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: t.textSecondary });
const Kbd = ({ children, t }) => <span style={{ padding: '1px 5px', borderRadius: 3, background: t.surfaceAlt, color: t.textSecondary, fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', border: `0.5px solid ${t.divider}` }}>{children}</span>;

// ===== New task creator (inline) =====
const WNewTaskInline = () => {
  const w = useW(); const t = useT();
  const nt = w.ui.newTask;
  const [title, setTitle] = React.useState('');
  const [cat, setCat] = React.useState('me');
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (nt) { setTitle(''); setCat('me'); requestAnimationFrame(() => inputRef.current?.focus()); } }, [nt]);
  if (!nt) return null;
  const submit = () => {
    if (!title.trim()) { w.closeNew(); return; }
    const start = nt.range ? nt.range[0] : nt.date;
    const end = nt.range ? nt.range[1] : nt.date;
    w.addTask({ title: title.trim(), start, end, time: nt.time || null, cat, priority: 'mid' });
    w.closeNew();
    w.showToast('Task 추가됨');
  };
  const c = W_TOKENS[w.ui.dark ? 'dark' : 'light'][cat];
  const dateLabel = nt.range && nt.range[0] !== nt.range[1]
    ? `${wParse(nt.range[0]).m}/${wParse(nt.range[0]).d} – ${wParse(nt.range[1]).m}/${wParse(nt.range[1]).d}`
    : `${wParse(nt.date).m}월 ${wParse(nt.date).d}일${nt.time ? ` · ${wFmtTime(nt.time)}` : ''}`;
  return (
    <div onClick={() => w.closeNew()} style={{
      position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(15,12,8,0.32)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 140,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: '92vw',
        background: t.surface, borderRadius: 14,
        border: `0.5px solid ${t.divider}`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        padding: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }}>새 Task · {dateLabel}</div>
        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') w.closeNew(); }}
          placeholder="무엇을 할까요?"
          style={{ width: '100%', boxSizing: 'border-box', all: 'unset', fontSize: 17, fontWeight: 600, fontFamily: W_FONT, color: t.text, letterSpacing: -0.3, padding: '4px 0', borderBottom: `0.5px solid ${t.divider}` }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{k:'me',l:'나'},{k:'ext',l:'외부'}].map(o => {
              const oc = W_TOKENS[w.ui.dark ? 'dark' : 'light'][o.k];
              const active = cat === o.k;
              return <button key={o.k} onClick={() => setCat(o.k)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: active ? oc.soft : 'transparent', color: active ? oc.ink : t.textSecondary, border: active ? 'none' : `0.5px solid ${t.divider}` }}>{o.l}</button>;
            })}
          </div>
          <div style={{ flex: 1 }} />
          <Kbd t={t}>Esc</Kbd>
          <button onClick={submit} style={{ all: 'unset', cursor: 'pointer', padding: '6px 14px', borderRadius: 7, background: title.trim() ? c.solid : t.dividerStrong, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>추가 ↵</button>
        </div>
      </div>
    </div>
  );
};

// ===== Today side panel =====
const WTodayPanel = () => {
  const w = useW(); const t = useT();
  if (!w.ui.showToday) return null;
  const tasks = wTasksOnDate(w.data.tasks, w.ui.selectedDate);
  const open = tasks.filter(x => !x.done);
  const done = tasks.filter(x => x.done);
  const habits = w.data.habits;
  const sd = wParse(w.ui.selectedDate);
  const isToday = w.ui.selectedDate === W_TODAY;
  return (
    <aside style={{ width: 280, borderLeft: `0.5px solid ${t.divider}`, background: t.bg2, display: 'flex', flexDirection: 'column', overflow: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `0.5px solid ${t.divider}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{isToday ? '오늘' : '선택 날짜'}</div>
        <div style={{ fontFamily: W_FONT, fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: t.text, marginTop: 2 }}>
          {sd.m}월 {sd.d}일 <span style={{ fontSize: 13, fontWeight: 500, color: t.textTertiary, marginLeft: 4 }}>{WK_LABEL[wWday(w.ui.selectedDate)]}요일</span>
        </div>
        <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: t.surfaceAlt, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${tasks.length ? Math.round((done.length / tasks.length) * 100) : 0}%`, background: t.me.solid, transition: 'width .25s' }} />
        </div>
        <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 4, fontFeatureSettings: '"tnum"' }}>{done.length}/{tasks.length} 완료</div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }}>할일 {open.length}</div>
        {open.length === 0 ? <div style={{ fontSize: 12, color: t.textTertiary, padding: '8px 4px' }}>모두 완료했어요 ☑</div> :
          open.map(tk => <TodayCard key={tk.id} task={tk} />)
        }
      </div>

      {done.length > 0 && (
        <div style={{ padding: '8px 14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }}>완료 {done.length}</div>
          {done.map(tk => <TodayCard key={tk.id} task={tk} />)}
        </div>
      )}

      <div style={{ padding: '4px 14px 20px', borderTop: `0.5px solid ${t.divider}`, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', margin: '12px 0 8px' }}>습관</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {habits.map(h => {
            const ck = !!h.log[w.ui.selectedDate];
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: t.habit.softer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{h.emoji}</div>
                <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: t.text }}>{h.title}</div>
                <button onClick={() => w.toggleHabit(h.id, w.ui.selectedDate)}
                  style={{ all: 'unset', cursor: 'pointer', width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${ck ? t.habit.solid : t.habit.ink}`, background: ck ? t.habit.solid : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ck && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7L8 1.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

const TodayCard = ({ task }) => {
  const w = useW(); const t = useT();
  const c = W_TOKENS[w.ui.dark ? 'dark' : 'light'][task.cat];
  return (
    <div onClick={() => w.openModal(task.id)} style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 7, cursor: 'pointer',
      background: 'transparent',
    }}>
      <button onClick={(e) => { e.stopPropagation(); w.toggleTask(task.id); }} style={{
        all: 'unset', cursor: 'pointer',
        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
        background: task.done ? c.solid : 'transparent',
        border: `1.5px solid ${task.done ? c.solid : c.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{task.done && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7L8 1.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: t.text, textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
        {task.time && <div style={{ fontSize: 10.5, color: t.textTertiary, marginTop: 1, fontFeatureSettings: '"tnum"' }}>{wFmtTime(task.time)}</div>}
      </div>
      <span style={{ width: 4, height: 18, borderRadius: 2, background: c.solid, flexShrink: 0 }} />
    </div>
  );
};

Object.assign(window, { WTaskModal, WNewTaskInline, WTodayPanel });
