// Goal & Report — Mobile full-screen pages
// All render inside the JDPhone interior. 390 wide × 844 tall.

// ===== 5. Goal page (Settings > 목표) =====
// A — list, two sections
const MGRGoalPageA = ({ t, dark, plan = 'pro' }) => {
  const Row = ({ g, kind }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `0.5px solid ${t.divider}` }}>
      <div style={{ flexShrink: 0 }}>{mgrRing(g.progress, 28, kind === 'year' ? t.me.solid : t.habit.solid, t.surfaceAlt, 3)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{g.title}</span>
          <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{g.done}/{g.related}</span>
        </div>
        {g.note && <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.note}</div>}
      </div>
      <MGRLock on={g.locked} t={t} />
      <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
    </div>
  );
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="목표" back="설정" right={<MGRPlan plan={plan} t={t} />} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>연간 · 2026</div>
            <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{GR_YEARLY.length}/5</span>
            <div style={{ flex: 1 }} />
            <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.accent }}>+ 추가</button>
          </div>
        </div>
        <div style={{ background: t.surface, marginBottom: 16 }}>
          {GR_YEARLY.map(g => <Row key={g.id} g={g} kind="year" />)}
        </div>

        <div style={{ padding: '4px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>월간 · 4월</div>
            <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{GR_MONTHLY.length}/5</span>
            <div style={{ flex: 1 }} />
            <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.accent }}>+ 추가</button>
          </div>
        </div>
        <div style={{ background: t.surface }}>
          {GR_MONTHLY.map(g => <Row key={g.id} g={g} kind="month" />)}
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// B — card stack
const MGRGoalPageB = ({ t, dark, plan = 'pro' }) => {
  const Card = ({ g, kind }) => {
    const c = kind === 'year' ? t.me : t.habit;
    return (
      <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <GRDot color={c.solid} size={5} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: c.ink, letterSpacing: 0.4, textTransform: 'uppercase' }}>{kind === 'year' ? '연간' : '월간'}</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.3, color: t.text }}>{g.title}</div>
            {g.note && <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>{g.note}</div>}
          </div>
          {mgrRing(g.progress, 36, c.solid, t.surfaceAlt, 3.5)}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"', marginTop: 10 }}>
          <span><b style={{ color: t.text, fontSize: 12 }}>{Math.round(g.progress*100)}%</b></span>
          <span>{g.done}/{g.related}</span>
          {g.slip > 0 && <span style={{ color: t.ext.ink }}>{g.slip} 밀림</span>}
          <div style={{ flex: 1 }} />
          <MGRLock on={g.locked} t={t} />
        </div>
      </div>
    );
  };
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="목표" back="설정" right={<MGRPlan plan={plan} t={t} />} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 8px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>연간 · 2026</div>
          <div style={{ flex: 1, height: 0.5, background: t.divider }} />
          <span style={{ fontSize: 10.5, color: t.textTertiary }}>{GR_YEARLY.length}/5</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GR_YEARLY.slice(0, 2).map(g => <Card key={g.id} g={g} kind="year" />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '16px 0 8px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>월간 · 4월</div>
          <div style={{ flex: 1, height: 0.5, background: t.divider }} />
          <span style={{ fontSize: 10.5, color: t.textTertiary }}>{GR_MONTHLY.length}/5</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GR_MONTHLY.slice(0, 2).map(g => <Card key={g.id} g={g} kind="month" />)}
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// Narrative
const MGRNarrative = ({ paras, t, scale = 1 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 * scale }}>
    {paras.map((p, i) => (
      <p key={i} style={{
        margin: 0, fontSize: 13.5 * scale, lineHeight: 1.75, letterSpacing: -0.05, color: t.text,
      }}>{p}</p>
    ))}
  </div>
);

// ===== 7. Monthly report =====
// A — data-forward
const MGRMonthlyReportA = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="3월 리포트" back="목표" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 16px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>MARCH 2026</div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.7, lineHeight: 1.15, marginTop: 2 }}>3월, 어떻게 지나갔나요</div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            {mgrRing(0.66, 44, t.me.solid, t.surfaceAlt, 5)}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>완료율</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 1, fontFeatureSettings: '"tnum"' }}>66%</div>
              <div style={{ fontSize: 10, color: t.textTertiary }}>22 / 33</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>활동 히트맵</div>
          <MGRHeatmap data={GR_HEATMAP} color={t.me.solid} bg={t.surfaceAlt} t={t} />
        </div>

        <div style={{ marginTop: 10, background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: -0.2, marginBottom: 8 }}>목표별 진행</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GR_MONTHLY.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: t.text }}>{g.title}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
                </div>
                <MGRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={4} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10, background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>한 달의 이야기</div>
          <MGRNarrative paras={paras.slice(0, 1)} t={t} scale={0.95} />
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// B — essay-forward
const MGRMonthlyReportB = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="3월" back="목표" />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>3월 · 월간 리포트</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, lineHeight: 1.15, marginTop: 4 }}>
            면접 준비가<br/>중심에 있던 한 달.
          </div>
        </div>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <MGRIllust w={358} h={120} tone="warm" dark={dark} />
          </div>
        </div>
        <div style={{ padding: '16px 18px 0' }}>
          <MGRNarrative paras={paras} t={t} scale={1} />
        </div>
        <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { l: '완료', v: '22', s: '/33' },
            { l: '회고', v: '4', s: '주' },
            { l: '밀림', v: '3', s: '' },
          ].map((s, i) => (
            <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 9, padding: '8px 10px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, marginTop: 1, fontFeatureSettings: '"tnum"' }}>{s.v}<span style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500 }}>{s.s}</span></div>
            </div>
          ))}
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// ===== 8. Yearly report =====
const MGRYearlyReportA = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="2025 리포트" back="목표" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 0' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>2025 · 연간 리포트</div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginTop: 2 }}>2025, 어디까지 왔나요</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { l: '연간 목표', v: '4', s: '' },
            { l: '평균 진행', v: '30', s: '%' },
            { l: '완료 task', v: '221', s: '' },
            { l: '활성 습관', v: '4', s: '' },
          ].map((x, i) => (
            <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{x.l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6, marginTop: 2, fontFeatureSettings: '"tnum"' }}>{x.v}<span style={{ fontSize: 12, color: t.textTertiary, fontWeight: 500 }}>{x.s}</span></div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: -0.2, marginBottom: 8 }}>연간 목표 — 한 해의 발자국</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {GR_YEARLY.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: t.text }}>{g.title}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
                </div>
                <MGRBar pct={g.progress} color={t.me.solid} bg={t.surfaceAlt} height={4} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10, background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>한 해의 이야기</div>
          <MGRNarrative paras={paras.slice(0, 1)} t={t} scale={0.95} />
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

const MGRYearlyReportB = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <MGRNav t={t} dark={dark} title="2025" back="목표" />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>2025 · 연간 리포트</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1.1, lineHeight: 1.1, marginTop: 6 }}>
            다른 길로<br/>한 걸음<br/>옮긴 해.
          </div>
        </div>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <MGRIllust w={358} h={120} tone="cool" dark={dark} />
          </div>
        </div>
        <div style={{ padding: '16px 18px 0' }}>
          <MGRNarrative paras={paras.slice(0, 2)} t={t} scale={1} />
        </div>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GR_YEARLY.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `0.5px solid ${t.divider}` }}>
                {mgrRing(g.progress, 26, t.me.solid, t.surfaceAlt, 3)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{g.title}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: -0.3, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// ===== 9. Free preview =====
const MGRFreePreviewA = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <MGRNav t={t} dark={dark} title="3월 리포트" back="목표" right={<MGRPlan plan="free" t={t} />} />
    <div style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 0', position: 'relative' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>3월 · 월간</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.7, marginTop: 2 }}>3월의 한 달 요약</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        {[
          { l: '목표', v: '4' },
          { l: '진행', v: '4' },
          { l: '달성', v: '1' },
        ].map((x, i) => (
          <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 9, padding: '10px 10px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{x.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6, marginTop: 2, fontFeatureSettings: '"tnum"' }}>{x.v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, position: 'relative', flex: 1, minHeight: 240 }}>
        <div style={{ filter: 'blur(5px)', opacity: 0.45, pointerEvents: 'none' }}>
          <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>목표별 진행</div>
            {GR_MONTHLY.slice(0, 3).map((g, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{g.title}</div>
                <MGRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={4} />
              </div>
            ))}
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: t.surface, borderRadius: 12, padding: '18px 18px 16px', border: `0.5px solid ${t.divider}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', width: 280, textAlign: 'center' }}>
            <MGRUnlock size={20} c={t.textSecondary} />
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.3, marginTop: 8 }}>Pro에서 펼쳐져요</div>
            <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
              목표별 완료율, 히트맵, 한 달의 이야기까지.
            </div>
            <button style={{ all: 'unset', cursor: 'pointer', marginTop: 12, padding: '9px 16px', borderRadius: 9, background: t.text, color: t.bg, fontSize: 12.5, fontWeight: 600 }}>Pro로 펼치기 →</button>
          </div>
        </div>
      </div>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

const MGRFreePreviewB = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <MGRNav t={t} dark={dark} title="3월 리포트" back="목표" />
    <div style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 0' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        3월 · Free 미리보기
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, marginTop: 4 }}>3월, 4개의 약속</div>

      <div style={{ marginTop: 12, background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        {mgrRing(0.66, 42, t.me.solid, t.surfaceAlt, 5)}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>요약</div>
          <div style={{ fontSize: 12.5, color: t.text, marginTop: 3, lineHeight: 1.5 }}>4개 · 평균 <b>66%</b> · 1개 달성</div>
        </div>
      </div>

      <div style={{ marginTop: 10, position: 'relative', background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>목표별 진행</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GR_MONTHLY.map((g, i) => (
              <div key={g.id} style={{ filter: i >= 1 ? 'blur(3px)' : 'none', opacity: i >= 1 ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{g.title}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
                </div>
                <MGRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={4} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `0.5px solid ${t.divider}`, background: t.bg }}>
      <MGRUnlock size={16} c={t.textSecondary} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>나머지는 Pro에서</div>
        <div style={{ fontSize: 10.5, color: t.textTertiary, marginTop: 1 }}>7일 무료 체험</div>
      </div>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 8, background: t.text, color: t.bg, fontSize: 12, fontWeight: 600 }}>Pro →</button>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

Object.assign(window, {
  MGRGoalPageA, MGRGoalPageB,
  MGRMonthlyReportA, MGRMonthlyReportB,
  MGRYearlyReportA, MGRYearlyReportB,
  MGRFreePreviewA, MGRFreePreviewB,
});
