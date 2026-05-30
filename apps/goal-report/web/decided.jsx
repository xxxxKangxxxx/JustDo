// Goal & Report — Web DECIDED extras: stepped report MODAL (monthly/yearly).
// "리포트 보기" opens a centered modal that steps through
// 완료율 → 히트맵 → 목표별 → 에세이. Essay step shows a title + the narrative.

const WGR_YEAR_TREND = [12, 15, 18, 14, 20, 22, 17, 19, 21, 16, 26, 23];
const WGR_MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

// Shell: fixed-size centered modal card with step rail + footer
const WGRReportModal = ({ t, dark, navTitle, kicker, step, total, last, children }) => (
  <div style={{
    width: 620, height: 600, background: t.surface, borderRadius: 18,
    border: `0.5px solid ${t.divider}`, boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    fontFamily: W_FONT, color: t.text,
  }}>
    <div style={{ padding: '18px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2 }}>{navTitle}</div>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 20, color: t.textTertiary, lineHeight: 1 }}>×</button>
    </div>
    <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? t.accent : t.surfaceAlt }} />
      ))}
    </div>
    <div style={{ flex: 1, minHeight: 0, padding: '20px 24px 0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 16 }}>{kicker}</div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
    <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}` }}>
      <span style={{ fontSize: 12, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{step + 1} / {total}</span>
      <div style={{ flex: 1 }} />
      {step > 0 && <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: t.textSecondary, marginRight: 16 }}>← 이전</button>}
      <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 20px', borderRadius: 9, background: last ? t.text : t.accent, color: last ? t.bg : '#fff', fontSize: 13, fontWeight: 600 }}>{last ? '완료' : '다음 →'}</button>
    </div>
  </div>
);

// ===== 7. Monthly report modal — 4 steps =====
const WGRMonthlyReportModal = ({ t, dark, step = 0, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  let body;
  if (step === 0) body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative' }}>
        {grRing(0.66, 180, t.me.solid, t.surfaceAlt, 13)}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -2, fontFeatureSettings: '"tnum"', lineHeight: 1 }}>66<span style={{ fontSize: 24 }}>%</span></div>
          <div style={{ fontSize: 12, color: t.textTertiary, marginTop: 2 }}>완료율</div>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 28 }}>22 / 33 task 완료</div>
      <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 6 }}>지난 달보다 +8%p 올랐어요</div>
    </div>
  );
  else if (step === 1) body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, marginBottom: 22 }}>이 달, 언제 활동했나요</div>
      <GRHeatmap data={GR_HEATMAP} color={t.me.solid} bg={t.surfaceAlt} t={t} />
      <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 22, lineHeight: 1.65 }}>
        가장 활발했던 날은 <b style={{ color: t.text }}>3월 21일</b>. 주말마다 꾸준한 리듬이 보여요.
      </div>
    </div>
  );
  else if (step === 2) body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>목표별 진행</div>
      {GR_MONTHLY.map(g => (
        <div key={g.id}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{g.title}</span>
            {g.locked && <span style={{ fontSize: 10, color: t.textTertiary }}>● 고정</span>}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{g.done}/{g.related} · <b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b></span>
          </div>
          <GRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={7} />
        </div>
      ))}
    </div>
  );
  else body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', height: 120, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
        <GRIllustration w={572} h={120} tone="warm" dark={dark} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.7, lineHeight: 1.2, marginBottom: 14 }}>면접 준비가 중심에 있던 한 달.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {paras.map((p, i) => (
          <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.75, letterSpacing: -0.1, color: t.text }}>{p}</p>
        ))}
      </div>
    </div>
  );
  return (
    <WGRReportModal t={t} dark={dark} navTitle="3월 리포트" kicker={['3월 · 완료율','3월 · 활동','3월 · 목표별 진행','3월 · 이야기'][step]} step={step} total={4} last={step === 3}>
      {body}
    </WGRReportModal>
  );
};

// ===== 8. Yearly report modal — 4 steps (detailed) =====
const WGRYearlyReportModal = ({ t, dark, step = 0, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  let body;
  if (step === 0) body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        {grRing(0.30, 168, t.me.solid, t.surfaceAlt, 12)}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1.8, fontFeatureSettings: '"tnum"', lineHeight: 1 }}>30<span style={{ fontSize: 22 }}>%</span></div>
          <div style={{ fontSize: 11.5, color: t.textTertiary, marginTop: 2 }}>평균 진행률</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 30, width: '100%' }}>
        {[
          { l: '연간 목표', v: '4' },
          { l: '완료 task', v: '221' },
          { l: '활성 습관', v: '4' },
        ].map((x, i) => (
          <div key={i} style={{ background: t.bg2, border: `0.5px solid ${t.divider}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, fontFeatureSettings: '"tnum"' }}>{x.v}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 3 }}>{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
  else if (step === 1) {
    const max = Math.max(...WGR_YEAR_TREND);
    body = (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, marginBottom: 24 }}>달마다 어떻게 움직였나요</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }}>
          {WGR_YEAR_TREND.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ width: '100%', height: `${(v/max)*150}px`, borderRadius: 5, background: i === 10 ? t.me.solid : t.me.soft }} />
              <span style={{ fontSize: 10, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{WGR_MONTH_LABELS[i]}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 22, lineHeight: 1.65 }}>
          가장 활발한 달은 <b style={{ color: t.text }}>11월</b> — 26개의 task를 마쳤어요. 하반기로 갈수록 페이스가 붙었습니다.
        </div>
      </div>
    );
  }
  else if (step === 2) body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>연간 목표 — 한 해의 발자국</div>
      {GR_YEARLY.map(g => (
        <div key={g.id}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{g.title}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}><b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b> · {g.done}/{g.related}</span>
          </div>
          {g.note && <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 5 }}>{g.note}</div>}
          <GRBar pct={g.progress} color={t.me.solid} bg={t.surfaceAlt} height={7} />
        </div>
      ))}
    </div>
  );
  else body = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', height: 116, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <GRIllustration w={572} h={116} tone="cool" dark={dark} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.18, marginBottom: 14 }}>다른 길로 한 걸음 옮긴 해.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paras.map((p, i) => (
          <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.72, letterSpacing: -0.1, color: t.text }}>{p}</p>
        ))}
      </div>
    </div>
  );
  return (
    <WGRReportModal t={t} dark={dark} navTitle="2025 리포트" kicker={['2025 · 요약','2025 · 월별 흐름','2025 · 연간 목표','2025 · 이야기'][step]} step={step} total={4} last={step === 3}>
      {body}
    </WGRReportModal>
  );
};

Object.assign(window, {
  WGRReportModal, WGRMonthlyReportModal, WGRYearlyReportModal,
  WGR_YEAR_TREND, WGR_MONTH_LABELS,
});
