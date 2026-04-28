// Task creation — Full detail screen (sheet expanded)

const JDDetailScreen = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />

      {/* Top bar: cancel / title / save */}
      <div style={{
        padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 15, color: t.textSecondary, fontWeight: 500 }}>취소</div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>새 Task</div>
        <div style={{ fontSize: 15, color: t.accent, fontWeight: 600 }}>저장</div>
      </div>

      <div style={{ padding: '10px 20px 100px', overflow: 'auto', height: 'calc(100% - 54px - 48px)' }}>
        {/* Task/Habit toggle */}
        <div style={{
          display: 'flex', gap: 4, padding: 3,
          background: t.surfaceAlt, borderRadius: 10, marginBottom: 18,
        }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8,
            background: t.surface, fontSize: 13, fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)', color: t.text,
          }}>Task</div>
          <div style={{ flex: 1, textAlign: 'center', padding: '7px 0', fontSize: 13, fontWeight: 500, color: t.textSecondary }}>Habit</div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: -0.5,
          color: t.text, fontFamily: JD_DISPLAY,
          paddingBottom: 12, marginBottom: 4,
        }}>
          면접 준비 자료 정리
        </div>

        {/* Meta */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20,
        }}>
          <JDCatTag cat="me" dark={dark} />
          <Chip dark={dark} icon="cal">4/21 – 4/25</Chip>
          <Chip dark={dark} icon="clock">오후 7:00</Chip>
          <Chip dark={dark} cat="me">중간</Chip>
        </div>

        {/* Subtasks */}
        <SectionCard title="서브태스크" count="2/4" dark={dark}>
          <SubRow text="자소서 다시 읽기" done={true} dark={dark} />
          <SubRow text="예상 질문 리스트 작성" done={true} dark={dark} />
          <SubRow text="포트폴리오 정리" done={false} dark={dark} />
          <SubRow text="복장 준비" done={false} dark={dark} last />
          <div style={{ padding: '10px 0 2px', fontSize: 13, color: t.accent, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> 서브태스크 추가
          </div>
        </SectionCard>

        {/* Tags */}
        <SectionCard title="태그" dark={dark}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 0 2px' }}>
            {['#취업','#면접','#삼성'].map(tg => (
              <span key={tg} style={{
                padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                color: t.me.ink, background: t.me.soft,
              }}>{tg}</span>
            ))}
            <span style={{
              padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              color: t.textTertiary, border: `1px dashed ${t.divider}`,
            }}>+</span>
          </div>
        </SectionCard>

        {/* Memo */}
        <SectionCard title="메모" dark={dark}>
          <div style={{
            fontSize: 13, lineHeight: 1.6, color: t.textSecondary,
            padding: '2px 0',
          }}>
            1차 인터뷰 질문 공유받은 거 정리.<br/>
            복장은 정장 + 단색 셔츠로.
          </div>
        </SectionCard>

        {/* Notification */}
        <SectionCard title="알림" dark={dark}>
          <DetailRow label="시작 10분 전" dark={dark} />
          <DetailRow label="당일 오전 9시" dark={dark} last />
          <div style={{ padding: '10px 0 2px', fontSize: 13, color: t.accent, fontWeight: 500 }}>+ 알림 추가</div>
        </SectionCard>

        {/* Linked tasks */}
        <SectionCard title="연결된 Task" dark={dark}>
          <LinkRow arrow="←" text="자소서 제출" cat="me" dark={dark} />
          <LinkRow arrow="→" text="최종 발표" cat="ext" dark={dark} last />
        </SectionCard>
      </div>

      <JDHomeIndicator dark={dark} />
    </JDPhone>
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
      {icon === 'cal' && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 5h9" stroke="currentColor" strokeWidth="1.2"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      )}
      {icon === 'clock' && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5V6l2 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      )}
      {children}
    </span>
  );
};

const SectionCard = ({ title, count, children, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      background: t.surface, borderRadius: 14, padding: '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</div>
        {count && <div style={{ fontSize: 11, color: t.textSecondary, fontWeight: 500 }}>{count}</div>}
      </div>
      {children}
    </div>
  );
};

const SubRow = ({ text, done, dark, last }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 0', borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <JDCheckbox checked={done} cat="me" dark={dark} size={18} />
      <div style={{
        fontSize: 14, color: done ? t.textTertiary : t.text,
        textDecoration: done ? 'line-through' : 'none',
        fontWeight: 500,
      }}>{text}</div>
    </div>
  );
};

const DetailRow = ({ label, dark, last }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '9px 0',
      borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <div style={{ fontSize: 14, flex: 1, fontWeight: 500 }}>{label}</div>
      <svg width="6" height="10" viewBox="0 0 6 10"><path d="M1 1l3.5 4L1 9" stroke={t.textTertiary} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
};

const LinkRow = ({ arrow, text, cat, dark, last }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 0', borderBottom: last ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: t.textTertiary, width: 16,
      }}>{arrow}</div>
      <JDCatDot cat={cat} dark={dark} size={8} />
      <div style={{ fontSize: 14, flex: 1, fontWeight: 500 }}>{text}</div>
      <svg width="6" height="10" viewBox="0 0 6 10"><path d="M1 1l3.5 4L1 9" stroke={t.textTertiary} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
};

Object.assign(window, { JDDetailScreen, Chip, SectionCard, SubRow, DetailRow, LinkRow });
