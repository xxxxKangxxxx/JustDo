// Goal & Report — Mobile DECIDED screens.
// Centered modals (yearly/monthly prompt, lock) + stepped report flows.
// Renders inside the JDPhone interior.

// ---- Centered modal frame (dimmed shell behind, card centered) ----
const MGRCenter = ({ t, dark, bgLabel, children }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <div style={{ position: 'absolute', inset: 0 }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 20px', fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>{bgLabel}</div>
    </div>
    <div style={{
      position: 'absolute', inset: 0,
      background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,12,8,0.42)',
      backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>{children}</div>
  </div>
);

const _mgrPrimaryBtn = (t) => ({
  width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
  padding: '13px 0', borderRadius: 12, background: t.accent, color: '#fff',
  fontSize: 15, fontWeight: 600, textAlign: 'center',
});
const _mgrGhostBtn = (t) => ({
  width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
  padding: '12px 0', fontSize: 13, color: t.textTertiary, textAlign: 'center', marginTop: 2,
});

// ===== 2. Yearly prompt — centered modal =====
const MGRYearlyPromptCenter = ({ t, dark }) => (
  <MGRCenter t={t} dark={dark} bgLabel="2026년 1월">
    <div style={{ width: 326, background: t.surface, borderRadius: 20, border: `0.5px solid ${t.divider}`, boxShadow: '0 28px 70px rgba(0,0,0,0.34)', overflow: 'hidden' }}>
      <div style={{ padding: '22px 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.me.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.me.soft, padding: '2px 7px', borderRadius: 4 }}>새해</span>
          <span style={{ fontSize: 11, color: t.textTertiary }}>2026년 1월 1일</span>
        </div>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>2026년 연간 목표를 적어볼까요?</div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
          올해 이루고 싶은 목표 4–5개를 정해요. 12월에 다시 만나 돌아볼 수 있어요.
        </div>
      </div>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: t.surfaceAlt }}>
          <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>예시</div>
          <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.55 }}>체력 만들기 · 글 50편 쓰기 · 새 직무 익히기</div>
        </div>
      </div>
      <div style={{ padding: '16px 20px 18px', display: 'flex', alignItems: 'center' }}>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary, fontWeight: 500 }}>나중에</button>
        <div style={{ flex: 1 }} />
        <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '12px 20px', borderRadius: 12, background: t.accent, color: '#fff', fontSize: 14.5, fontWeight: 600, textAlign: 'center' }}>목표 설정하기</button>
      </div>
    </div>
  </MGRCenter>
);

// ===== 3. Monthly prompt — centered modal =====
const MGRMonthlyPromptCenter = ({ t, dark }) => (
  <MGRCenter t={t} dark={dark} bgLabel="2026년 4월">
    <div style={{ width: 326, background: t.surface, borderRadius: 20, border: `0.5px solid ${t.divider}`, boxShadow: '0 28px 70px rgba(0,0,0,0.34)', overflow: 'hidden' }}>
      <div style={{ padding: '22px 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.habit.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.habit.soft, padding: '2px 7px', borderRadius: 4 }}>새 달</span>
          <span style={{ fontSize: 11, color: t.textTertiary }}>4월 1일</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>4월 월간 목표를 정해볼까요?</div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
          이번 달 이루고 싶은 목표 3–5개. 4월 30일에 함께 돌아봐요.
        </div>
      </div>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['삼성전자 면접 통과', '포트폴리오 v2 완성'].map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: t.surfaceAlt }}>
            <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{g}</span>
          </div>
        ))}
        <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 12px', borderRadius: 10, border: `0.5px dashed ${t.dividerStrong}`, color: t.textTertiary, fontSize: 12.5, textAlign: 'left' }}>+ 목표 적기</button>
      </div>
      <div style={{ padding: '16px 20px 18px', display: 'flex', alignItems: 'center' }}>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary, fontWeight: 500 }}>나중에</button>
        <div style={{ flex: 1 }} />
        <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '12px 20px', borderRadius: 12, background: t.accent, color: '#fff', fontSize: 14.5, fontWeight: 600, textAlign: 'center' }}>목표 설정하기</button>
      </div>
    </div>
  </MGRCenter>
);

// ===== 6. Lock unlock — centered modal =====
const MGRLockCenter = ({ t, dark }) => (
  <MGRCenter t={t} dark={dark} bgLabel="목표">
    <div style={{ width: 320, background: t.surface, borderRadius: 20, border: `0.5px solid ${t.divider}`, boxShadow: '0 28px 70px rgba(0,0,0,0.34)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 22px 8px' }}>
        <div style={{ marginBottom: 12 }}><MGRUnlock size={26} c={t.textSecondary} /></div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>이 목표, 정말 풀까요?</div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
          고정한 목표예요. 풀면 수정할 수 있어요.
        </div>
      </div>
      <div style={{ padding: '18px 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '11px 16px', borderRadius: 10, background: t.surfaceAlt, color: t.text, fontSize: 13.5, fontWeight: 500, textAlign: 'center' }}>그대로 두기</button>
        <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '11px 16px', borderRadius: 10, background: t.text, color: t.bg, fontSize: 13.5, fontWeight: 600, textAlign: 'center' }}>잠금 풀고 수정</button>
      </div>
    </div>
  </MGRCenter>
);

// ===== Stepped report shell =====
const MGRRStep = ({ t, dark, navTitle, kicker, step, total, last, children }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <MGRNav t={t} dark={dark} title={navTitle} back="목표" />
    <div style={{ padding: '12px 18px 0', display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? t.accent : t.surfaceAlt }} />
      ))}
    </div>
    <div style={{ flex: 1, overflow: 'hidden', padding: '18px 18px 0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>{kicker}</div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
    <div style={{ padding: '12px 18px 26px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}` }}>
      <span style={{ fontSize: 11.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{step + 1} / {total}</span>
      <div style={{ flex: 1 }} />
      {step > 0 && <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary, marginRight: 14 }}>이전</button>}
      <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '11px 22px', borderRadius: 12, background: last ? t.text : t.accent, color: last ? t.bg : '#fff', fontSize: 14.5, fontWeight: 600 }}>{last ? '완료' : '다음 →'}</button>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

// ===== 7. Monthly report — 4 steps (simple) =====
const MGRMonthlyReportStep = ({ t, dark, step = 0, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.monthly[tone];
  if (step === 0) return (
    <MGRRStep t={t} dark={dark} navTitle="3월 리포트" kicker="3월 · 완료율" step={0} total={4}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          {mgrRing(0.66, 150, t.me.solid, t.surfaceAlt, 11)}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1.5, fontFeatureSettings: '"tnum"', lineHeight: 1 }}>66<span style={{ fontSize: 20 }}>%</span></div>
            <div style={{ fontSize: 11.5, color: t.textTertiary, marginTop: 2 }}>완료율</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: t.text, marginTop: 24, fontWeight: 600 }}>22 / 33 task 완료</div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4 }}>지난 달보다 +8%p 올랐어요</div>
      </div>
    </MGRRStep>
  );
  if (step === 1) return (
    <MGRRStep t={t} dark={dark} navTitle="3월 리포트" kicker="3월 · 활동" step={1} total={4}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, marginBottom: 16 }}>이 달, 언제 활동했나요</div>
        <MGRHeatmap data={GR_HEATMAP} color={t.me.solid} bg={t.surfaceAlt} t={t} />
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 18, lineHeight: 1.6 }}>
          가장 활발했던 날은 <b style={{ color: t.text }}>3월 21일</b>. 주말마다 꾸준한 리듬이 보여요.
        </div>
      </div>
    </MGRRStep>
  );
  if (step === 2) return (
    <MGRRStep t={t} dark={dark} navTitle="3월 리포트" kicker="3월 · 목표별 진행" step={2} total={4}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
        {GR_MONTHLY.map(g => (
          <div key={g.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{g.title}</span>
              {g.locked && <span style={{ fontSize: 9.5, color: t.textTertiary }}>● 고정</span>}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{g.done}/{g.related} · <b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b></span>
            </div>
            <MGRBar pct={g.progress} color={t.habit.solid} bg={t.surfaceAlt} height={6} />
          </div>
        ))}
      </div>
    </MGRRStep>
  );
  return (
    <MGRRStep t={t} dark={dark} navTitle="3월 리포트" kicker="3월 · 이야기" step={3} total={4} last>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <MGRIllust w={322} h={104} tone="warm" dark={dark} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, letterSpacing: -0.05, color: t.text }}>{p}</p>
          ))}
        </div>
      </div>
    </MGRRStep>
  );
};

// 12-month task trend for yearly report
const GR_YEAR_TREND = [12, 15, 18, 14, 20, 22, 17, 19, 21, 16, 26, 23];
const GR_MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

// ===== 8. Yearly report — 4 steps (detailed) =====
const MGRYearlyReportStep = ({ t, dark, step = 0, tone = 'essay' }) => {
  const paras = GR_NARRATIVE.yearly[tone];
  if (step === 0) return (
    <MGRRStep t={t} dark={dark} navTitle="2025 리포트" kicker="2025 · 요약" step={0} total={4}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          {mgrRing(0.30, 134, t.me.solid, t.surfaceAlt, 10)}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.3, fontFeatureSettings: '"tnum"', lineHeight: 1 }}>30<span style={{ fontSize: 17 }}>%</span></div>
            <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>평균 진행률</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 26, width: '100%' }}>
          {[
            { l: '연간 목표', v: '4' },
            { l: '완료 task', v: '221' },
            { l: '활성 습관', v: '4' },
          ].map((x, i) => (
            <div key={i} style={{ background: t.surface, border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.7, fontFeatureSettings: '"tnum"' }}>{x.v}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: t.textTertiary, letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>
    </MGRRStep>
  );
  if (step === 1) {
    const max = Math.max(...GR_YEAR_TREND);
    return (
      <MGRRStep t={t} dark={dark} navTitle="2025 리포트" kicker="2025 · 월별 흐름" step={1} total={4}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, marginBottom: 18 }}>달마다 어떻게 움직였나요</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150 }}>
            {GR_YEAR_TREND.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: '100%', height: `${(v/max)*120}px`, borderRadius: 4, background: i === 10 ? t.me.solid : t.me.soft }} />
                <span style={{ fontSize: 8.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{GR_MONTH_LABELS[i]}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 18, lineHeight: 1.6 }}>
            가장 활발한 달은 <b style={{ color: t.text }}>11월</b> — 26개의 task를 마쳤어요. 하반기로 갈수록 페이스가 붙었습니다.
          </div>
        </div>
      </MGRRStep>
    );
  }
  if (step === 2) return (
    <MGRRStep t={t} dark={dark} navTitle="2025 리포트" kicker="2025 · 연간 목표" step={2} total={4}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 15 }}>
        {GR_YEARLY.map(g => (
          <div key={g.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{g.title}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}><b style={{ color: t.text }}>{Math.round(g.progress*100)}%</b> · {g.done}/{g.related}</span>
            </div>
            {g.note && <div style={{ fontSize: 10.5, color: t.textTertiary, marginBottom: 5 }}>{g.note}</div>}
            <MGRBar pct={g.progress} color={t.me.solid} bg={t.surfaceAlt} height={6} />
          </div>
        ))}
      </div>
    </MGRRStep>
  );
  return (
    <MGRRStep t={t} dark={dark} navTitle="2025 리포트" kicker="2025 · 이야기" step={3} total={4} last>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <MGRIllust w={322} h={96} tone="cool" dark={dark} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.72, letterSpacing: -0.05, color: t.text }}>{p}</p>
          ))}
        </div>
      </div>
    </MGRRStep>
  );
};

Object.assign(window, {
  MGRCenter, MGRYearlyPromptCenter, MGRMonthlyPromptCenter, MGRLockCenter,
  MGRRStep, MGRMonthlyReportStep, MGRYearlyReportStep,
  GR_YEAR_TREND, GR_MONTH_LABELS,
});
