// Command palette (⌘K) + global keyboard shortcuts
const WCommandPalette = () => {
  const w = useW(); const t = useT();
  const open = w.ui.paletteOpen;
  const [q, setQ] = React.useState('');
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (open) { setQ(''); setIdx(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);

  const actions = [
    { id: 'new', label: '새 Task 추가', hint: 'N', kind: 'cmd', run: () => { w.openNew({ date: w.ui.selectedDate }); w.setPalette(false); } },
    { id: 'today', label: '오늘로 이동', hint: 'T', kind: 'cmd', run: () => { w.setMonth(2026, 4); w.selectDate(W_TODAY); w.setPalette(false); } },
    { id: 'view-month', label: '월간 뷰', kind: 'view', run: () => { w.setView('month'); w.setPage('calendar'); w.setPalette(false); } },
    { id: 'view-week', label: '주간 뷰', kind: 'view', run: () => { w.setView('week'); w.setPage('calendar'); w.setPalette(false); } },
    { id: 'view-list', label: '리스트 뷰', kind: 'view', run: () => { w.setView('list'); w.setPage('calendar'); w.setPalette(false); } },
    { id: 'page-stats', label: '통계로 이동', kind: 'nav', run: () => { w.setPage('stats'); w.setPalette(false); } },
    { id: 'page-settings', label: '설정으로 이동', kind: 'nav', run: () => { w.setPage('settings'); w.setPalette(false); } },
    { id: 'theme', label: w.ui.dark ? '라이트 모드' : '다크 모드', kind: 'cmd', run: () => { w.toggleDark(); w.setPalette(false); } },
  ];
  const taskItems = w.data.tasks.map(tk => ({ id: 'task-' + tk.id, label: tk.title, hint: `${wParse(tk.start).m}/${wParse(tk.start).d}`, kind: 'task', task: tk, run: () => { w.openModal(tk.id); w.setPalette(false); } }));

  const ql = q.toLowerCase().trim();
  const filtered = !ql ? actions :
    [...actions, ...taskItems].filter(a => a.label.toLowerCase().includes(ql));
  React.useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;
  return (
    <div onClick={() => w.setPalette(false)} style={{
      position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(15,12,8,0.42)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxWidth: '92vw', maxHeight: 480,
        background: t.surface, borderRadius: 12, border: `0.5px solid ${t.divider}`,
        boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: t.textTertiary }}>
            <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); filtered[idx]?.run(); }
              else if (e.key === 'Escape') w.setPalette(false);
            }}
            placeholder="명령, task, 페이지 검색..."
            style={{ all: 'unset', flex: 1, fontSize: 14.5, fontFamily: W_FONT, color: t.text }}
          />
          <Kbd t={t}>Esc</Kbd>
        </div>
        <div style={{ overflow: 'auto', padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: '20px 14px', fontSize: 12.5, color: t.textTertiary, textAlign: 'center' }}>결과 없음</div>}
          {filtered.map((a, i) => (
            <div key={a.id} onMouseEnter={() => setIdx(i)} onClick={() => a.run()} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
              background: i === idx ? t.selected : 'transparent',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: t.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textSecondary, fontSize: 11, fontWeight: 600 }}>
                {a.kind === 'task' ? '✓' : a.kind === 'view' ? '⊞' : a.kind === 'nav' ? '↗' : '⌘'}
              </div>
              <span style={{ fontSize: 13, color: t.text, fontWeight: 500, flex: 1 }}>{a.label}</span>
              {a.hint && <Kbd t={t}>{a.hint}</Kbd>}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 14px', borderTop: `0.5px solid ${t.divider}`, display: 'flex', gap: 14, fontSize: 10.5, color: t.textTertiary }}>
          <span><Kbd t={t}>↑↓</Kbd> 탐색</span>
          <span><Kbd t={t}>↵</Kbd> 선택</span>
          <span><Kbd t={t}>Esc</Kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
};

// Global shortcut listener
const WShortcuts = () => {
  const w = useW();
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';
      // Cmd/Ctrl+K — palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); w.setPalette(!w.ui.paletteOpen); return; }
      if (isInput) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === 'Escape') {
        if (w.ui.modalTaskId) w.closeModal();
        else if (w.ui.newTask) w.closeNew();
        else if (w.ui.paletteOpen) w.setPalette(false);
        else if (w.ui.selectedIds.length) w.clearSel();
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); document.querySelector('header input')?.focus(); return; }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); w.openNew({ date: w.ui.selectedDate }); return; }
      if (e.key.toLowerCase() === 't') { w.setMonth(2026, 4); w.selectDate(W_TODAY); return; }
      if (e.key.toLowerCase() === 'j') { w.selectDate(wAdd(w.ui.selectedDate, 1)); return; }
      if (e.key.toLowerCase() === 'k') { w.selectDate(wAdd(w.ui.selectedDate, -1)); return; }
      if (e.key === '1') { w.setView('month'); w.setPage('calendar'); }
      if (e.key === '2') { w.setView('week'); w.setPage('calendar'); }
      if (e.key === '3') { w.setView('list'); w.setPage('calendar'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [w.ui]);
  return null;
};

Object.assign(window, { WCommandPalette, WShortcuts });
