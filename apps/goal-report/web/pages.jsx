// Goal & Report — Web full-page screens (Goal management, Monthly/Yearly Report, Free preview)
// Each page wraps inside a simplified app shell so it reads in context.

// App shell wrapper — sidebar (Settings highlighted) + content area
const WGRAppShell = ({ t, breadcrumb, children, dark }) => (
  <div style={{ display: 'flex', height: '100%', background: t.bg, fontFamily: W_FONT, color: t.text }}>
    <aside style={{ width: 220, background: t.bg2, borderRight: `0.5px solid ${t.divider}`, padding: '14px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 8px 16px', display: 'flex', alignItems: 'baseline', gap: 3, fontSize: 17, fontWeight: 800, letterSpacing: -0.7 }}>
        Just Do <span style={{ width: 4, height: 4, borderRadius: 2, background: t.accent, alignSelf: 'center' }} />
      </div>
      {[
        { id: 'calendar', l: '캘린더' },
        { id: 'stats', l: '통계' },
        { id: 'settings', l: '설정', active: true },
      ].map(it => (
        <div key={it.id} style={{
          padding: '7px 10px', borderRadius: 7, fontSize: 13, fontWeight: it.active ? 600 : 500,
          color: it.active ? t.text : t.textSecondary,
          background: it.active ? t.selected : 'transparent',
        }}>{it.l}</div>
      ))}
      {breadcrumb && (
        <div style={{ marginTop: 14, padding: '0 10px' }}>
          <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', padding: '6px 0' }}>설정</div>
          {[
            { l: '계정', a: false },
            { l: '목표', a: true },
            { l: '알림' },
            { l: '카테고리' },
            { l: '구독' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12, marginLeft: -10,
              color: s.a ? t.text : t.textSecondary, fontWeight: s.a ? 600 : 500,
              background: s.a ? t.selected : 'transparent',
            }}>{s.l}</div>
          ))}
        </div>
      )}
    </aside>
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <header style={{ padding: '14px 28px', borderBottom: `0.5px solid ${t.divider}`, background: t.glass, display: 'flex', alignItems: 'center', gap: 10 }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: t.textTertiary, fontSize: 12 }}>›</span>}
            <span style={{ fontSize: i === breadcrumb.length-1 ? 18 : 13, fontWeight: i === breadcrumb.length-1 ? 700 : 500, letterSpacing: i === breadcrumb.length-1 ? -0.5 : 0, color: i === breadcrumb.length-1 ? t.text : t.textSecondary }}>{b}</span>
          </React.Fragment>
        ))}
      </header>
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 32px' }}>{children}</div>
    </main>
  </div>
);

// Narrative paragraph block — picks a tone variant
const WGRNarrative = ({ paras, t, scale = 1 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 * scale }}>
    {paras.map((p, i) => (
      <p key={i} style={{
        margin: 0,
        fontSize: 14.5 * scale, lineHeight: 1.75, letterSpacing: -0.1,
        color: t.text,
      }}>{p}</p>
    ))}
  </div>
);

// ===== 5. Goal management page (settings sub) =====
const _renderGoalRow = (g, t, kind) => (
  <div key={g.id} style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderBottom: `0.5px solid ${t.divider}`,
  }}>
    <div style={{ flexShrink: 0 }}>
      {grRing(g.progress, 32, kind === 'year' ? t.me.solid : t.habit.solid, t.surfaceAlt, 3.5)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{g.title}</span>
        <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{g.done}/{g.related} task</span>
      </div>
      {g.note && <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 2 }}>{g.note}</div>}
    </div>
    <GRLockPill on={g.locked} t={t} />
    <span style={{ fontSize: 12, color: t.textTertiary, width: 36, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
  </div>
);

// A — list, two sections (yearly above, monthly below)
const WGRGoalPageA = ({ t, dark, plan = 'pro' }) => (
  <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표']}>
    <div style={{ maxWidth: 820, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5 }}>
            한 해와 한 달의 약속. 매월·매년 돌아보고 리포트로 정리해드려요.
          </div>
        </div>
        <GRPlan plan={plan} t={t} />
      </div>

      <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, overflow: 'hidden' }}>
        <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `0.5px solid ${t.divider}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>2026년 연간 목표</div>
          <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{GR_YEARLY.length}/5</span>
          <div style={{ flex: 1 }} />
          <button style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: t.textSecondary, padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${t.divider}` }}>+ 추가</button>
        </header>
        <div>{GR_YEARLY.map(g => _renderGoalRow(g, t, 'year'))}</div>
      </section>

      <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, overflow: 'hidden' }}>
        <header style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `0.5px solid ${t.divider}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>4월 월간 목표</div>
          <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{GR_MONTHLY.length}/5</span>
          <div style={{ flex: 1 }} />
          <button style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: t.textSecondary, padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${t.divider}` }}>+ 추가</button>
        </header>
        <div>{GR_MONTHLY.map(g => _renderGoalRow(g, t, 'month'))}</div>
      </section>
    </div>
  </WGRAppShell>
);

// B — card grid, larger cards w/ progress dial prominent
const WGRGoalPageB = ({ t, dark, plan = 'pro' }) => {
  const Card = ({ g, kind }) => {
    const c = kind === 'year' ? t.me : t.habit;
    return (
      <div style={{
        background: t.surface, border: `0.5px solid ${t.divider}`,
        borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
        minHeight: 150,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <GRDot color={c.solid} size={6} />
              <span style={{ fontSize: 10, fontWeight: 700, color: c.ink, letterSpacing: 0.4, textTransform: 'uppercase' }}>{kind === 'year' ? '연간' : '월간'}</span>
              {g.locked && <span style={{ fontSize: 10, color: t.textTertiary, marginLeft: 4 }}>● 고정</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.4, color: t.text, lineHeight: 1.25 }}>{g.title}</div>
            {g.note && <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{g.note}</div>}
          </div>
          {grRing(g.progress, 44, c.solid, t.surfaceAlt, 4)}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>
          <span><b style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>{Math.round(g.progress*100)}%</b> 진행</span>
          <span>{g.done}/{g.related} task</span>
          {g.slip > 0 && <span style={{ color: t.ext.ink }}>{g.slip}개 밀림</span>}
        </div>
      </div>
    );
  };
  return (
    <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표']}>
      <div style={{ maxWidth: 980, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: t.textSecondary }}>한 해와 한 달의 약속을 카드로 펼쳐봐요.</div>
          </div>
          <GRPlan plan={plan} t={t} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>2026년 연간</div>
            <div style={{ flex: 1, height: 0.5, background: t.divider }} />
            <span style={{ fontSize: 11, color: t.textTertiary }}>{GR_YEARLY.length}/5</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {GR_YEARLY.map(g => <Card key={g.id} g={g} kind="year" />)}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>4월 월간</div>
            <div style={{ flex: 1, height: 0.5, background: t.divider }} />
            <span style={{ fontSize: 11, color: t.textTertiary }}>{GR_MONTHLY.length}/5</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {GR_MONTHLY.slice(0, 4).map(g => <Card key={g.id} g={g} kind="month" />)}
          </div>
        </div>
      </div>
    </WGRAppShell>
  );
};

// ===== 7. Monthly Report =====
// A — data-forward layout: hero stats up top, then per-goal bars, then narrative
const WGRMonthlyReportA = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  return (
    <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '3월 리포트']}>
      <div style={{ maxWidth: 880, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>MARCH 2026 · 월간 리포트</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>3월, 어떻게 지나갔나요</div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 14 }}>
          <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            {grRing(0.66, 76, t.me.solid, t.surfaceAlt, 7)}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>전체 완료율</div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.4, marginTop: 4, fontFeatureSettings: '"tnum"' }}>66<span style={{ fontSize: 20 }}>%</span></div>
              <div style={{ fontSize: 11.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>22 / 33 task</div>
            </div>
          </div>
          <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 12 }}>3월 활동 히트맵</div>
            <GRHeatmap data={GR_HEATMAP} color={t.me.solid} bg={t.surfaceAlt} t={t} />
          </div>
        </div>

        <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>목표별 진행</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GR_MONTHLY.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{g.title}</span>
                  {g.locked && <span style={{ fontSize: 10, color: t.textTertiary }}>● 고정</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{g.done}/{g.related} · <b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b></span>
                </div>
                <GRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={5} />
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>한 달의 이야기</div>
          <WGRNarrative paras={paras} t={t} />
        </section>
      </div>
    </WGRAppShell>
  );
};

// B — essay-forward: large illustration + narrative as the hero, data tucked below
const WGRMonthlyReportB = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  return (
    <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '3월 리포트']}>
      <div style={{ maxWidth: 820, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <header style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>3월 · 월간 리포트</div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2, marginTop: 6, lineHeight: 1.15 }}>면접 준비가<br/>중심에 있던 한 달.</div>
          </div>
          <div style={{ width: 200, height: 130, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <GRIllustration w={200} h={130} tone="warm" dark={dark} />
          </div>
        </header>

        <article style={{ borderTop: `0.5px solid ${t.divider}`, paddingTop: 18 }}>
          <WGRNarrative paras={paras} t={t} scale={1.05} />
        </article>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '완료 task', v: '22', s: '/ 33' },
            { l: '연속 회고', v: '4', s: '주' },
            { l: '밀린 작업', v: '3', s: '' },
          ].map((s, i) => (
            <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.8, marginTop: 2, fontFeatureSettings: '"tnum"' }}>{s.v} <span style={{ fontSize: 12, color: t.textTertiary, fontWeight: 500 }}>{s.s}</span></div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: t.habit.ink, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>가장 많이 완료</div>
            {GR_TOP_DONE.map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: i === GR_TOP_DONE.length-1 ? 'none' : `0.5px solid ${t.divider}` }}>
                <span style={{ fontSize: 12, color: t.text, flex: 1 }}>{x.title}</span>
                <span style={{ fontSize: 10, color: t.textTertiary }}>{x.goal}</span>
              </div>
            ))}
          </section>
          <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: t.ext.ink, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>가장 많이 밀림</div>
            {GR_TOP_SLIP.map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: i === GR_TOP_SLIP.length-1 ? 'none' : `0.5px solid ${t.divider}` }}>
                <span style={{ fontSize: 12, color: t.text, flex: 1 }}>{x.title}</span>
                <span style={{ fontSize: 10, color: t.ext.ink, fontFeatureSettings: '"tnum"' }}>{x.days}일</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </WGRAppShell>
  );
};

// ===== 8. Yearly Report =====
const WGRYearlyReportA = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  return (
    <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '2025 리포트']}>
      <div style={{ maxWidth: 880, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>2025 · 연간 리포트</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>2025, 어디까지 왔나요</div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '연간 목표', v: '4', s: '개' },
            { l: '평균 진행률', v: '30', s: '%' },
            { l: '완료 task', v: '221', s: '' },
            { l: '활성 습관', v: '4', s: '개' },
          ].map((x, i) => (
            <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{x.l}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, marginTop: 4, fontFeatureSettings: '"tnum"' }}>{x.v}<span style={{ fontSize: 14, color: t.textTertiary, fontWeight: 500 }}>{x.s}</span></div>
            </div>
          ))}
        </div>

        <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>연간 목표 — 한 해의 발자국</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {GR_YEARLY.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{g.title}</span>
                  {g.note && <span style={{ fontSize: 11, color: t.textTertiary }}>{g.note}</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}><b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b> · {g.done}/{g.related}</span>
                </div>
                <GRBar pct={g.progress} color={t.me.solid} bg={t.surfaceAlt} height={6} />
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>한 해의 이야기</div>
          <WGRNarrative paras={paras} t={t} />
        </section>
      </div>
    </WGRAppShell>
  );
};

const WGRYearlyReportB = ({ t, dark, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  return (
    <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '2025 리포트']}>
      <div style={{ maxWidth: 820, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>2025 · 연간 리포트</div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.4, marginTop: 8, lineHeight: 1.1 }}>다른 길로<br/>한 걸음 옮긴 해.</div>
          </div>
          <div style={{ width: 220, height: 140, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <GRIllustration w={220} h={140} tone="cool" dark={dark} />
          </div>
        </header>

        <article style={{ borderTop: `0.5px solid ${t.divider}`, paddingTop: 20 }}>
          <WGRNarrative paras={paras} t={t} scale={1.1} />
        </article>

        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 }}>한 해의 약속들</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {GR_YEARLY.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: `0.5px solid ${t.divider}` }}>
                {grRing(g.progress, 36, t.me.solid, t.surfaceAlt, 4)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{g.title}</div>
                  {g.note && <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 1 }}>{g.note}</div>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: -0.5, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WGRAppShell>
  );
};

// ===== 9. Free Preview Report =====
// A — top summary visible, locked cards with blur below
const WGRFreePreviewA = ({ t, dark }) => (
  <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '3월 리포트']}>
    <div style={{ maxWidth: 880, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>3월 · 월간 리포트</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, marginTop: 4 }}>3월의 한 달 요약</div>
        </div>
        <GRPlan plan="free" t={t} />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { l: '목표 개수', v: '4' },
          { l: '진행한 목표', v: '4' },
          { l: '달성한 목표', v: '1' },
        ].map((x, i) => (
          <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>{x.l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, marginTop: 4, fontFeatureSettings: '"tnum"' }}>{x.v}</div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 280 }}>
        <div style={{ filter: 'blur(6px)', opacity: 0.45, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18, height: 140 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>목표별 진행</div>
            {GR_MONTHLY.slice(0, 3).map((g, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
                <GRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={5} />
              </div>
            ))}
          </div>
          <div style={{ background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 20, height: 110 }}>
            <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 8 }}>한 달의 이야기</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>3월의 한 달은 면접 준비가 중심에 있었어요. 12개의 관련 task 중 9개를 마쳤고, 자기소개와 포트폴리오 자료가 차곡차곡 모였습니다.</p>
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 40,
        }}>
          <div style={{
            background: t.surface, borderRadius: 14, padding: '24px 28px',
            border: `0.5px solid ${t.divider}`, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            maxWidth: 460, textAlign: 'center',
          }}>
            <GRUnlockIcon size={22} c={t.textSecondary} />
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4, marginTop: 10 }}>이 아래는 Pro에서 펼쳐져요</div>
            <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
              목표별 완료율, 활동 히트맵, 가장 많이 완료/밀린 작업, 그리고 한 달의 이야기까지.
            </div>
            <button style={{ all: 'unset', cursor: 'pointer', marginTop: 16, padding: '9px 20px', borderRadius: 9, background: t.text, color: t.bg, fontSize: 13, fontWeight: 600 }}>Pro로 펼치기 →</button>
            <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 10 }}>7일 무료 체험 · 언제든 취소</div>
          </div>
        </div>
      </div>
    </div>
  </WGRAppShell>
);

// B — top summary + single half-visible card with bottom Pro CTA bar
const WGRFreePreviewB = ({ t, dark }) => (
  <WGRAppShell t={t} dark={dark} breadcrumb={['설정', '목표', '3월 리포트']}>
    <div style={{ maxWidth: 820, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>3월 · 월간 리포트 · <span style={{ color: t.textSecondary }}>Free 미리보기</span></div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1.1, marginTop: 6, lineHeight: 1.15 }}>3월, 4개의 약속</div>
      </header>

      <section style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {grRing(0.66, 56, t.me.solid, t.surfaceAlt, 6)}
          <div>
            <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>요약</div>
            <div style={{ fontSize: 14, color: t.text, marginTop: 4, lineHeight: 1.55 }}>
              4개의 목표 · 평균 진행 <b>66%</b> · 1개 달성
            </div>
          </div>
        </div>
      </section>

      <section style={{ position: 'relative', background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>목표별 진행</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GR_MONTHLY.map((g, i) => (
              <div key={g.id} style={{ filter: i >= 2 ? 'blur(4px)' : 'none', opacity: i >= 2 ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.title}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{Math.round(g.progress*100)}%</span>
                </div>
                <GRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={5} />
              </div>
            ))}
          </div>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px',
          background: `linear-gradient(180deg, transparent 0%, ${t.surface} 60%)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <GRUnlockIcon size={18} c={t.textSecondary} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>나머지 목표와 한 달의 이야기는 Pro에서</div>
            <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>7일 무료 체험 · 언제든 취소</div>
          </div>
          <button style={{ all: 'unset', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: t.text, color: t.bg, fontSize: 12, fontWeight: 600 }}>Pro로 보기 →</button>
        </div>
      </section>
    </div>
  </WGRAppShell>
);

Object.assign(window, {
  WGRAppShell, WGRNarrative,
  WGRGoalPageA, WGRGoalPageB,
  WGRMonthlyReportA, WGRMonthlyReportB,
  WGRYearlyReportA, WGRYearlyReportB,
  WGRFreePreviewA, WGRFreePreviewB,
});
