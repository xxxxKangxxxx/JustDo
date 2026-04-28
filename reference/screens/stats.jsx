// Stats tab

const JDStatsScreen = ({ dark = false }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <JDPhone dark={dark}>
      <JDStatusBar dark={dark} />

      <div style={{ padding: '12px 20px 100px', overflow: 'auto', height: 'calc(100% - 54px)' }}>
        {/* Title */}
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, fontFamily: JD_DISPLAY, marginBottom: 14 }}>
          통계
        </div>

        {/* Period tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: 3,
          background: t.surfaceAlt, borderRadius: 10, marginBottom: 16,
        }}>
          {['주간','월간','전체'].map((p, i) => (
            <div key={p} style={{
              flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8,
              background: i === 1 ? t.surface : 'transparent',
              boxShadow: i === 1 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              fontSize: 13, fontWeight: i === 1 ? 600 : 500,
              color: i === 1 ? t.text : t.textSecondary,
            }}>{p}</div>
          ))}
        </div>

        {/* Monthly report banner */}
        <div style={{
          background: `linear-gradient(135deg, ${t.me.soft} 0%, ${t.habit.soft} 100%)`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: t.me.ink, fontWeight: 600, letterSpacing: 0.3, marginBottom: 3 }}>2026년 4월 리포트</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>이번 달 월간 리포트 보기</div>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: 14, background: t.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l5 3-5 3" stroke={t.text} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* Task section */}
        <SectionHeader label="TASK" dark={dark} />
        <div style={{
          background: t.surface, borderRadius: 16, padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <div style={{
              fontSize: 40, fontWeight: 700, letterSpacing: -1,
              fontFamily: JD_DISPLAY, fontFeatureSettings: '"tnum"',
            }}>47</div>
            <div style={{ fontSize: 13, color: t.textSecondary, fontWeight: 500 }}>/ 62개 완료</div>
          </div>
          <div style={{ fontSize: 12, color: t.habit.ink, fontWeight: 500, marginBottom: 14 }}>
            지난달 대비 +8개 ↑
          </div>

          {/* Category bars */}
          {[
            { cat: 'me', label: '나', done: 23, total: 28 },
            { cat: 'ext', label: '외부', done: 16, total: 22 },
            { cat: 'habit', label: 'Habit', done: 8, total: 12 },
          ].map((r) => (
            <div key={r.cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5, fontSize: 12 }}>
                <JDCatDot cat={r.cat} dark={dark} size={7} />
                <span style={{ marginLeft: 6, fontWeight: 600, color: t.text }}>[{r.label}]</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: t.textSecondary, fontFeatureSettings: '"tnum"' }}>{r.done} / {r.total}</span>
                <span style={{
                  marginLeft: 10, fontWeight: 700, color: t[r.cat].ink, minWidth: 32, textAlign: 'right',
                  fontFeatureSettings: '"tnum"',
                }}>{Math.round(r.done / r.total * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: t.surfaceAlt, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${r.done / r.total * 100}%`,
                  background: t[r.cat].solid, borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Habit section */}
        <SectionHeader label="HABIT" dark={dark} />

        {/* Streaks row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
          {[
            { emoji: '💧', title: '물 2L', streak: 28 },
            { emoji: '🏃', title: '운동', streak: 12 },
            { emoji: '📖', title: '독서', streak: 7 },
          ].map((h) => (
            <div key={h.title} style={{
              background: t.surface, borderRadius: 12, padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{h.emoji}</div>
              <div style={{ fontSize: 11, color: t.textSecondary, fontWeight: 500, marginBottom: 2 }}>{h.title}</div>
              <div style={{
                fontSize: 20, fontWeight: 700, letterSpacing: -0.4,
                color: t.habit.ink, fontFeatureSettings: '"tnum"', fontFamily: JD_DISPLAY,
              }}>{h.streak}<span style={{ fontSize: 10, fontWeight: 500, color: t.textTertiary, marginLeft: 1 }}>일</span></div>
            </div>
          ))}
        </div>

        {/* Weekly habit grid */}
        <div style={{
          background: t.surface, borderRadius: 16, padding: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>이번 주 습관</div>
            <div style={{ fontSize: 11, color: t.textTertiary }}>월 ~ 일</div>
          </div>
          {[
            { label: '물 2L', dots: [1,1,1,1,1,1,0] },
            { label: '운동', dots: [1,1,0,1,1,1,0] },
            { label: '독서', dots: [1,0,1,1,1,0,0] },
            { label: '스트레칭', dots: [1,1,1,0,0,1,0] },
          ].map((h) => (
            <div key={h.label} style={{
              display: 'flex', alignItems: 'center', marginBottom: 8,
            }}>
              <div style={{ width: 72, fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>{h.label}</div>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {h.dots.map((d, i) => (
                  <div key={i} style={{
                    flex: 1, height: 20, borderRadius: 4,
                    background: d ? t.habit.solid : t.surfaceAlt,
                    opacity: d ? 1 : 1,
                  }} />
                ))}
              </div>
              <div style={{
                marginLeft: 10, fontSize: 11, fontWeight: 700, color: t.habit.ink,
                minWidth: 28, textAlign: 'right', fontFeatureSettings: '"tnum"',
              }}>{Math.round(h.dots.filter(Boolean).length / 7 * 100)}%</div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>전체 달성률</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.habit.ink, fontFamily: JD_DISPLAY, fontFeatureSettings: '"tnum"', letterSpacing: -0.3 }}>71%</div>
          </div>
        </div>
      </div>

      <JDTabBar active="stats" dark={dark} />
    </JDPhone>
  );
};

const SectionHeader = ({ label, dark }) => {
  const t = JD_TOKENS[dark ? 'dark' : 'light'];
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: t.textTertiary,
      letterSpacing: 0.6, marginBottom: 8, marginTop: 4,
    }}>{label}</div>
  );
};

Object.assign(window, { JDStatsScreen, SectionHeader });
