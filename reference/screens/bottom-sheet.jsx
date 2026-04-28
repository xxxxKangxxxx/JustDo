// Task creation — Bottom Sheet (partial)

const JDBottomSheet = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  const [tab, setTab] = [0, null]; // static
  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />
      {/* dimmed backdrop showing home context */}
      <div style={{
        position: 'absolute', top: 54, left: 0, right: 0, bottom: 0,
        background: dark ? 'rgba(0,0,0,0.4)' : 'rgba(20,18,15,0.32)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
      }}>
        {/* faded calendar peek */}
        <div style={{ padding: '14px 20px 8px', opacity: 0.5 }}>
          <div style={{ fontSize: 11, color: t.textSecondary, letterSpacing: 0.3 }}>2026</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>4<span style={{ fontSize: 18, color: t.textSecondary, marginLeft: 2 }}>월</span></div>
        </div>
      </div>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '10px 20px 40px', zIndex: 30,
        boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
        maxHeight: '70%',
      }}>
        {/* handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.dividerStrong, margin: '0 auto 16px' }} />

        {/* Task / Habit toggle */}
        <div style={{
          display: 'flex', gap: 4, padding: 3,
          background: t.surfaceAlt, borderRadius: 10,
          marginBottom: 18,
        }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8,
            background: t.surface, fontSize: 13, fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            color: t.text,
          }}>Task</div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '7px 0',
            fontSize: 13, fontWeight: 500, color: t.textSecondary,
          }}>Habit</div>
        </div>

        {/* Title input */}
        <div style={{
          fontSize: 20, fontWeight: 600, letterSpacing: -0.4,
          color: t.text, fontFamily: JD_DISPLAY,
          paddingBottom: 14, borderBottom: `0.5px solid ${t.divider}`,
        }}>
          면접 준비 자료 정리
          <span style={{
            display: 'inline-block', width: 2, height: 22,
            background: t.accent, marginLeft: 2,
            verticalAlign: 'middle', animation: 'blink 1s infinite',
          }} />
        </div>

        {/* Date range */}
        <FieldRow label="기간" dark={dark}>
          <span style={{ color: t.text, fontWeight: 500 }}>4/21</span>
          <span style={{ color: t.textTertiary, margin: '0 6px' }}>→</span>
          <span style={{ color: t.text, fontWeight: 500 }}>4/25</span>
        </FieldRow>

        {/* Time fixed toggle + picker */}
        <FieldRow label="시간" dark={dark}>
          <span style={{ color: t.text, fontWeight: 500 }}>오후 7:00</span>
          <div style={{ marginLeft: 'auto' }}>
            <IOSToggle on={true} dark={dark} cat="me" />
          </div>
        </FieldRow>

        {/* Category */}
        <FieldRow label="카테고리" dark={dark}>
          <JDCatTag cat="me" dark={dark} />
          <span style={{ color: t.textTertiary, margin: '0 8px', fontSize: 12 }}>·</span>
          <div style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            color: t.textTertiary, border: `1px dashed ${t.divider}`,
          }}>외부</div>
        </FieldRow>

        {/* Tags */}
        <FieldRow label="태그" dark={dark}>
          <span style={{ fontSize: 13, color: t.me.ink, fontWeight: 500 }}>#취업</span>
          <span style={{ fontSize: 13, color: t.me.ink, fontWeight: 500, marginLeft: 8 }}>#면접</span>
          <span style={{ fontSize: 13, color: t.textTertiary, marginLeft: 8 }}>+ 태그</span>
        </FieldRow>

        {/* Priority */}
        <FieldRow label="우선순위" dark={dark} noBorder>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'high', label: '높음' },
              { k: 'mid', label: '중간', on: true },
              { k: 'low', label: '낮음' },
            ].map(p => (
              <div key={p.k} style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: p.on ? t.me.soft : 'transparent',
                color: p.on ? t.me.ink : t.textSecondary,
                border: p.on ? 'none' : `0.5px solid ${t.divider}`,
              }}>{p.label}</div>
            ))}
          </div>
        </FieldRow>

        {/* More + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, gap: 10 }}>
          <div style={{
            flex: 1, fontSize: 13, color: t.textSecondary, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            상세 설정 더 보기
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 6l3-3 3 3" stroke={t.textSecondary} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div style={{
            padding: '11px 22px', borderRadius: 12,
            background: t.accent, color: '#fff',
            fontSize: 14, fontWeight: 600, letterSpacing: -0.2,
          }}>추가하기</div>
        </div>
      </div>

      <JDHomeIndicator dark={dark} />
    </JDPhone>
  );
};

// Helper row used in bottom sheet
const FieldRow = ({ label, children, dark, noBorder }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '13px 0',
      borderBottom: noBorder ? 'none' : `0.5px solid ${t.divider}`,
    }}>
      <div style={{ width: 72, fontSize: 12, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.1 }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: 13 }}>
        {children}
      </div>
    </div>
  );
};

const IOSToggle = ({ on = false, dark = false, cat = 'me' }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      width: 42, height: 26, borderRadius: 14, padding: 2,
      background: on ? t[cat].solid : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
      display: 'flex', alignItems: 'center',
      justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'all .15s',
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </div>
  );
};

Object.assign(window, { JDBottomSheet, FieldRow, IOSToggle });
