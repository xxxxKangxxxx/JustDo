// Interactive Add Bottom Sheet + Detail screen — always mounted, gated by transform.
const PAddSheet = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const sheet = s.state.view.sheet;
  const open = !!(sheet && sheet.kind === 'add');
  const initDate = (sheet && sheet.date) || s.state.view.selectedDate;
  const editTask = sheet && sheet.taskId ? s.state.tasks.find(x => x.id === sheet.taskId) : null;

  const [type, setType] = React.useState('task');
  const [title, setTitle] = React.useState('');
  const [start, setStart] = React.useState(initDate);
  const [end, setEnd] = React.useState(initDate);
  const [time, setTime] = React.useState('');
  const [cat, setCat] = React.useState('me');
  const [priority, setPriority] = React.useState('mid');
  const [emoji, setEmoji] = React.useState('🌱');

  React.useEffect(() => {
    if (open) {
      if (editTask) {
        setType('task');
        setTitle(editTask.title);
        setStart(editTask.start); setEnd(editTask.end);
        setTime(editTask.time || '');
        setCat(editTask.cat); setPriority(editTask.priority || 'mid');
      } else {
        setTitle(''); setStart(initDate); setEnd(initDate); setTime('');
        setCat('me'); setPriority('mid'); setType('task'); setEmoji('🌱');
      }
    }
  }, [open, sheet?.taskId]);

  const submit = () => {
    if (!title.trim()) return;
    if (type === 'task') {
      if (editTask) s.updateTask(editTask.id, { title, start, end, time: time || null, cat, priority });
      else s.addTask({ title, start, end, time: time || null, cat, priority });
    } else {
      s.addHabit({ title, emoji });
    }
    s.closeSheet();
  };

  return (
    <>
      <div onClick={() => s.closeSheet()} style={{
        position: 'absolute', inset: 0, zIndex: 70,
        background: 'rgba(15,12,8,0.45)', backdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '10px 20px 30px', zIndex: 71,
        boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
        maxHeight: '78%', overflow: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(105%)',
        pointerEvents: open ? 'auto' : 'none',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.dividerStrong, margin: '0 auto 16px' }} />

        {!editTask && (
          <div style={{ display: 'flex', gap: 4, padding: 3, background: t.surfaceAlt, borderRadius: 10, marginBottom: 18 }}>
            {[{k:'task',l:'Task'},{k:'habit',l:'Habit'}].map(o => (
              <button key={o.k} onClick={() => setType(o.k)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8,
                background: type === o.k ? t.surface : 'transparent',
                boxShadow: type === o.k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                fontSize: 13, fontWeight: type === o.k ? 600 : 500,
                color: type === o.k ? t.text : t.textSecondary,
              }}>{o.l}</button>
            ))}
          </div>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'task' ? '무엇을 할까요?' : '어떤 습관을?'}
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            fontSize: 20, fontWeight: 600, letterSpacing: -0.4, color: t.text,
            fontFamily: JD_DISPLAY, paddingBottom: 14, borderBottom: `0.5px solid ${t.divider}`,
            caretColor: t.accent,
          }} />

        {type === 'task' ? (
          <>
            <FieldRow label="시작" dark={dark}>
              <input type="date" value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}
                style={{ all: 'unset', cursor: 'pointer', color: t.text, fontWeight: 500, fontSize: 13 }} />
            </FieldRow>
            <FieldRow label="종료" dark={dark}>
              <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}
                style={{ all: 'unset', cursor: 'pointer', color: t.text, fontWeight: 500, fontSize: 13 }} />
            </FieldRow>
            <FieldRow label="시간" dark={dark}>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                style={{ all: 'unset', cursor: 'pointer', color: time ? t.text : t.textTertiary, fontWeight: 500, fontSize: 13 }} />
              {time && <button onClick={() => setTime('')} style={{ all: 'unset', cursor: 'pointer', marginLeft: 8, fontSize: 11, color: t.textTertiary }}>지우기</button>}
            </FieldRow>
            <FieldRow label="카테고리" dark={dark}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{k:'me',l:'나'},{k:'ext',l:'외부'}].map(o => (
                  <button key={o.k} onClick={() => setCat(o.k)} style={{
                    all: 'unset', cursor: 'pointer',
                    padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    color: cat === o.k ? t[o.k].ink : t.textSecondary,
                    background: cat === o.k ? t[o.k].soft : 'transparent',
                    border: cat === o.k ? 'none' : `1px dashed ${t.divider}`,
                  }}>{o.l}</button>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="우선순위" dark={dark} noBorder>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{k:'high',l:'높음'},{k:'mid',l:'중간'},{k:'low',l:'낮음'}].map(p => (
                  <button key={p.k} onClick={() => setPriority(p.k)} style={{
                    all: 'unset', cursor: 'pointer',
                    padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: priority === p.k ? t[cat].soft : 'transparent',
                    color: priority === p.k ? t[cat].ink : t.textSecondary,
                    border: priority === p.k ? 'none' : `0.5px solid ${t.divider}`,
                  }}>{p.l}</button>
                ))}
              </div>
            </FieldRow>
          </>
        ) : (
          <FieldRow label="이모지" dark={dark} noBorder>
            <div style={{ display: 'flex', gap: 6 }}>
              {['🌱','💧','🏃','📖','🧘','✏️'].map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{
                  all: 'unset', cursor: 'pointer',
                  width: 32, height: 32, borderRadius: 8, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: emoji === e ? t.habit.soft : 'transparent',
                  border: emoji === e ? 'none' : `0.5px solid ${t.divider}`,
                }}>{e}</button>
              ))}
            </div>
          </FieldRow>
        )}

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, gap: 10 }}>
          {editTask && (
            <button onClick={() => { s.deleteTask(editTask.id); s.closeSheet(); s.popScreen(); }}
              style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.ext.ink, fontWeight: 500 }}>삭제</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => s.closeSheet()} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textSecondary, fontWeight: 500, padding: '11px 14px' }}>취소</button>
          <button onClick={submit} style={{
            all: 'unset', cursor: 'pointer',
            padding: '11px 22px', borderRadius: 12,
            background: title.trim() ? t.accent : t.dividerStrong, color: '#fff',
            fontSize: 14, fontWeight: 600, letterSpacing: -0.2,
          }}>{editTask ? '저장' : '추가'}</button>
        </div>
      </div>
    </>
  );
};

const FieldRow = ({ label, children, dark, noBorder }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '13px 0',
      borderBottom: noBorder ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <div style={{ width: 72, fontSize: 12, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: 13 }}>{children}</div>
    </div>
  );
};

// Detail — always mounted, gated by transform. Holds last task during exit.
const PDetailScreen = () => {
  const s = useStore();
  const dark = s.state.view.dark;
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const screen = s.state.view.screen;
  const open = !!(screen && screen.kind === 'detail');
  const liveTask = open ? s.state.tasks.find(x => x.id === screen.taskId) : null;
  const lastTaskRef = React.useRef(null);
  if (liveTask) lastTaskRef.current = liveTask;
  const task = liveTask || lastTaskRef.current;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: t.bg, zIndex: 80,
      transform: open ? 'translateX(0)' : 'translateX(105%)',
      pointerEvents: open ? 'auto' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      {task && <PDetailContent task={task} dark={dark} t={t} s={s} />}
    </div>
  );
};

const PDetailContent = ({ task, dark, t, s }) => {
  const sd = parseISO(task.start), ed = parseISO(task.end);
  const isRange = task.start !== task.end;
  return (
    <>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => s.popScreen()} style={{ all: 'unset', cursor: 'pointer', fontSize: 15, color: t.accent, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="9" height="14" viewBox="0 0 9 14"><path d="M7 1L1 7l6 6" stroke={t.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          홈
        </button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Task</div>
        <button onClick={() => s.openSheet('add', { taskId: task.id })} style={{ all: 'unset', cursor: 'pointer', fontSize: 15, color: t.accent, fontWeight: 600 }}>편집</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => s.toggleTask(task.id)} style={{ all: 'unset', cursor: 'pointer' }}>
            <JDCheckbox checked={task.done} cat={task.cat} dark={dark} size={28} />
          </button>
          <div style={{
            fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: t.text, fontFamily: JD_DISPLAY,
            textDecoration: task.done ? 'line-through' : 'none',
            opacity: task.done ? 0.5 : 1, flex: 1,
          }}>{task.title}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          <JDCatTag cat={task.cat} dark={dark} />
          <Chip dark={dark} icon="cal">{isRange ? `${sd.m}/${sd.d} – ${ed.m}/${ed.d}` : `${sd.m}/${sd.d}`}</Chip>
          {task.time && <Chip dark={dark} icon="clock">{formatTime(task.time)}</Chip>}
          {task.priority && <Chip dark={dark} cat={task.cat}>{task.priority === 'high' ? '높음' : task.priority === 'low' ? '낮음' : '중간'}</Chip>}
        </div>
        {task.tags?.length > 0 && (
          <Card title="태그" dark={dark}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
              {task.tags.map(tg => (
                <span key={tg} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: t[task.cat].ink, background: t[task.cat].soft }}>{tg}</span>
              ))}
            </div>
          </Card>
        )}
        <Card title="기간" dark={dark}>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
            {sd.y}년 {sd.m}월 {sd.d}일{isRange && ` – ${ed.m}월 ${ed.d}일`}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 3 }}>
            {isRange ? `${Math.round((new Date(ed.y, ed.m-1, ed.d) - new Date(sd.y, sd.m-1, sd.d)) / 86400000) + 1}일간` : '하루'}
          </div>
        </Card>
        <button onClick={() => { s.deleteTask(task.id); s.popScreen(); }}
          style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', marginTop: 14, padding: '14px', background: t.surface, borderRadius: 14, fontSize: 15, fontWeight: 500, color: t.ext.ink }}>
          Task 삭제
        </button>
      </div>
    </>
  );
};

const Card = ({ title, children, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{ background: t.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
};

const Chip = ({ children, icon, cat, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const c = cat ? t[cat] : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 6,
      background: c ? c.soft : t.surfaceAlt,
      color: c ? c.ink : t.textSecondary,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
      border: c ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      {icon === 'cal' && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 5h9" stroke="currentColor" strokeWidth="1.2"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
      {icon === 'clock' && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5V6l2 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
      {children}
    </span>
  );
};

Object.assign(window, { PAddSheet, PDetailScreen, PDetailContent, FieldRow, Card, Chip });
