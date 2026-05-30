// Goal & Report — Mobile modal screens.
// Each component renders the full 390×844 phone interior (status bar to home indicator).
// All take { t, dark } and any variant-specific props.

const _drftYear = [
  { title: '체력 만들기', note: '주 3회 운동 루틴', lock: true },
  { title: '직무 전환',   note: '디자인 → 프로덕트 매니저', lock: true },
  { title: '글 50편 쓰기', note: '한 주에 한 편', lock: false },
];
const _drftMonth = [
  { title: '삼성전자 면접 통과', note: '면접 준비 4단계', lock: true },
  { title: '포트폴리오 v2 완성',  note: '케이스 스터디 3건', lock: true },
  { title: '달리기 80km',        note: '주말마다 20km',     lock: false },
];

// ===== 1. First-time wizard — full screen =====
// A — steps shown as numbered header + scrolling form
const MGRFirstTimeA = ({ t, dark, step = 1 }) => {
  const drafts = step === 1 ? _drftYear : _drftMonth;
  const isYear = step === 1;
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '6px 20px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 22, height: 4, borderRadius: 2, background: step >= 1 ? t.accent : t.dividerStrong }} />
        <span style={{ width: 22, height: 4, borderRadius: 2, background: step >= 2 ? t.accent : t.dividerStrong }} />
        <span style={{ fontSize: 11, color: t.textTertiary, fontWeight: 600, marginLeft: 4 }}>{step}/2</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 20px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>{isYear ? 'STEP 1 · 연간 목표' : 'STEP 2 · 월간 목표'}</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.2, marginTop: 4 }}>
          {isYear ? '2026년 연간 목표' : '4월 월간 목표'}
        </div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
          {isYear ? '올해 이루고 싶은 목표를 4–5개 적어요.' : '이번 달 이루고 싶은 목표를 적어요.'}
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {drafts.map((g, i) => (
            <div key={i} style={{
              border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: '11px 12px',
              background: t.surface,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10.5, color: t.textTertiary, width: 12, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{g.title}</span>
                <MGRLock on={g.lock} t={t} />
              </div>
              {g.note && <div style={{ marginLeft: 20, fontSize: 11.5, color: t.textSecondary, marginTop: 3 }}>{g.note}</div>}
            </div>
          ))}
          <button style={{
            all: 'unset', cursor: 'pointer', padding: '10px 12px', borderRadius: 10,
            border: `0.5px dashed ${t.dividerStrong}`, color: t.textTertiary,
            fontSize: 12.5, fontWeight: 500, textAlign: 'center',
          }}>+ 목표 추가  <span style={{ opacity: 0.6 }}>(최대 5개)</span></button>
        </div>
      </div>

      <div style={{ padding: '12px 20px 26px', borderTop: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center' }}>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary, fontWeight: 500 }}>나중에 할게요</button>
        <div style={{ flex: 1 }} />
        <button style={{
          all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
          padding: '12px 24px', borderRadius: 12,
          background: t.accent, color: '#fff',
          fontSize: 15, fontWeight: 600, letterSpacing: -0.2, textAlign: 'center',
        }}>{isYear ? '다음 →' : '시작하기'}</button>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// B — cinematic, illustration top, calmer
const MGRFirstTimeB = ({ t, dark, step = 1 }) => {
  const drafts = step === 1 ? _drftYear : _drftMonth;
  const isYear = step === 1;
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: W_FONT, color: t.text }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: t.textTertiary, fontWeight: 600 }}>{step}/2</span>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary }}>건너뛰기</button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '6px 20px 12px' }}>
          <div style={{ borderRadius: 14, overflow: 'hidden' }}>
            <MGRIllust w={350} h={130} tone={isYear ? 'warm' : 'cool'} dark={dark} />
          </div>
        </div>

        <div style={{ padding: '4px 20px 0' }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, lineHeight: 1.15 }}>
            {isYear ? '한 해를\n그려볼까요.' : '한 달의\n작은 약속.'}
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 10, lineHeight: 1.6 }}>
            {isYear
              ? '먼 시점의 약속이라 흐릿해도 괜찮아요. 마음에 걸리는 단어 한두 개부터.'
              : '한 달의 흐름을 만들 약속. 연간 목표와 굳이 맞추지 않아도 돼요.'}
          </div>
        </div>

        <div style={{ flex: 1, marginTop: 18, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {drafts.slice(0, 3).map((g, i) => (
            <div key={i} style={{ borderBottom: `0.5px solid ${t.divider}`, padding: '9px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 11, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{g.title}</span>
                <MGRLock on={g.lock} t={t} />
              </div>
              {g.note && <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 2, marginLeft: 16 }}>{g.note}</div>}
            </div>
          ))}
          <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: t.textTertiary, padding: '6px 0' }}>+ 항목 추가</button>
        </div>
      </div>

      <div style={{ padding: '14px 20px 28px' }}>
        <button style={{
          width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
          padding: '14px 0', borderRadius: 12,
          background: t.text, color: t.bg,
          fontSize: 15, fontWeight: 600, letterSpacing: -0.2, textAlign: 'center',
        }}>{isYear ? '4월 약속으로 →' : '시작하기'}</button>
      </div>
      <JDHomeIndicator dark={dark} />
    </div>
  );
};

// ===== 2. Yearly prompt =====
// A — bottom sheet
const MGRYearlyPromptA = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    {/* faint background showing calendar */}
    <div style={{ position: 'absolute', inset: 0, background: t.bg }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 20px', fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>2026년 1월</div>
    </div>
    <MGRBackdrop dark={dark}>
      <MGRSheet t={t} dark={dark}>
        <div style={{ padding: '4px 22px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.me.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.me.soft, padding: '2px 7px', borderRadius: 4 }}>새해</span>
            <span style={{ fontSize: 11, color: t.textTertiary }}>2026년 1월 1일</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>새해의 약속을 적어볼까요?</div>
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            한 해를 관통할 4–5개의 큰 방향. 12월에 다시 만나서 돌아볼 수 있어요.
          </div>
        </div>
        <div style={{ padding: '14px 22px 0' }}>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: t.surfaceAlt }}>
            <div style={{ fontSize: 10.5, color: t.textTertiary, marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>예시</div>
            <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.55 }}>
              체력 만들기 · 글 50편 쓰기 · 새 직무 익히기 · 가족과 자주 만나기
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px 4px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
            올해는 다시 보지 않기
          </label>
        </div>
        <div style={{ padding: '12px 22px 4px' }}>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '13px 0', borderRadius: 12, background: t.accent, color: '#fff', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>적어보기</button>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', padding: '12px 0', fontSize: 13, color: t.textTertiary, marginTop: 4, textAlign: 'center' }}>나중에</button>
        </div>
      </MGRSheet>
    </MGRBackdrop>
  </div>
);

// B — full-screen cinematic
const MGRYearlyPromptB = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <div style={{ padding: '4px 20px', display: 'flex', justifyContent: 'flex-end' }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 22, color: t.textTertiary, padding: '2px 8px' }}>×</button>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 220, overflow: 'hidden', position: 'relative', borderRadius: 0 }}>
        <MGRIllust w={390} h={220} tone="warm" dark={dark} />
        <div style={{ position: 'absolute', left: 20, bottom: 16, background: t.surface, padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: t.text }}>2026 · 새해</div>
      </div>
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }}>
          올해,<br/>어디로 향할까요?
        </div>
        <div style={{ fontSize: 14, color: t.textSecondary, marginTop: 14, lineHeight: 1.7 }}>
          한 해의 큰 방향을 적어두면, 매월 그 방향을 돌아볼 수 있어요. 12월의 당신이, 1월의 당신을 만나러 옵니다.
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary }}>
          <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
          올해는 다시 보지 않기
        </label>
      </div>
      <div style={{ padding: '12px 22px 28px' }}>
        <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '14px 0', borderRadius: 12, background: t.text, color: t.bg, fontSize: 15, fontWeight: 600, textAlign: 'center' }}>적어보기 →</button>
      </div>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

// ===== 3. Monthly prompt =====
const MGRMonthlyPromptA = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <div style={{ position: 'absolute', inset: 0 }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 20px', fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>2026년 4월</div>
    </div>
    <MGRBackdrop dark={dark}>
      <MGRSheet t={t} dark={dark}>
        <div style={{ padding: '4px 22px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.habit.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.habit.soft, padding: '2px 7px', borderRadius: 4 }}>새 달</span>
            <span style={{ fontSize: 11, color: t.textTertiary }}>4월 1일</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.25 }}>4월의 작은 약속, 정해볼까요?</div>
          <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            한 달의 흐름을 잡아줄 3–5개의 약속. 4월 30일에 함께 돌아봐요.
          </div>
        </div>
        <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['삼성전자 면접 통과', '포트폴리오 v2 완성'].map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: t.surfaceAlt }}>
              <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{g}</span>
            </div>
          ))}
          <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 12px', borderRadius: 9, border: `0.5px dashed ${t.dividerStrong}`, color: t.textTertiary, fontSize: 12.5, textAlign: 'left' }}>+ 약속 적기</button>
        </div>
        <div style={{ padding: '14px 22px 4px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
            4월엔 다시 보지 않기
          </label>
        </div>
        <div style={{ padding: '12px 22px 4px' }}>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '13px 0', borderRadius: 12, background: t.accent, color: '#fff', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>저장</button>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', padding: '12px 0', fontSize: 13, color: t.textTertiary, marginTop: 4, textAlign: 'center' }}>건너뛰기</button>
        </div>
      </MGRSheet>
    </MGRBackdrop>
  </div>
);

const MGRMonthlyPromptB = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <div style={{ padding: '4px 20px', display: 'flex', justifyContent: 'flex-end' }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 22, color: t.textTertiary, padding: '2px 8px' }}>×</button>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', padding: '18px 22px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>APRIL · 새 달의 약속</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15, marginTop: 6 }}>이번 달,<br/>한 가지만<br/>약속한다면.</div>
      <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 14, lineHeight: 1.65 }}>
        4월의 30일을 관통할 작은 약속. 너무 크지 않게, 너무 모호하지 않게.
      </div>
      <div style={{ marginTop: 26, padding: 16, borderRadius: 12, background: t.surfaceAlt }}>
        <div style={{ fontSize: 10.5, color: t.textTertiary, marginBottom: 6, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>지난 달 이어가기</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.55 }}>3월에 75%까지 도착했어요 — <b>삼성전자 면접 통과</b></div>
      </div>
    </div>
    <div style={{ padding: '0 22px 6px', display: 'flex', alignItems: 'center' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary }}>
        <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
        4월엔 다시 보지 않기
      </label>
    </div>
    <div style={{ padding: '10px 22px 28px' }}>
      <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '14px 0', borderRadius: 12, background: t.text, color: t.bg, fontSize: 15, fontWeight: 600, textAlign: 'center' }}>약속 적기 →</button>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

// ===== 4. Report ready =====
// A — small banner card at top
const MGRReportReadyA = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <div style={{ padding: '4px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>2026년 4월</div>
      <div style={{ fontSize: 12, color: t.textTertiary, marginTop: 2 }}>3월에서 4월로 넘어왔어요</div>
    </div>
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{
        background: t.surface, border: `0.5px solid ${t.divider}`,
        borderRadius: 14, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12,
        boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
      }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>{mgrRing(0.66, 38, t.me.solid, t.surfaceAlt, 4)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.me.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.me.soft, padding: '2px 7px', borderRadius: 4 }}>NEW</span>
            <span style={{ fontSize: 11, color: t.textTertiary }}>월간 리포트</span>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.3, marginTop: 6 }}>3월 리포트가 준비됐어요</div>
          <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 3, lineHeight: 1.5 }}>22개의 task를 마쳤고, 1개의 목표를 100% 달성했어요.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 7, background: t.text, color: t.bg, fontSize: 12, fontWeight: 600 }}>펼치기 →</button>
            <button style={{ all: 'unset', cursor: 'pointer', padding: '6px 8px', fontSize: 12, color: t.textTertiary }}>나중에</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// B — full-screen cover with illustration
const MGRReportReadyB = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: W_FONT, color: t.text }}>
    <JDStatusBar dark={dark} />
    <div style={{ padding: '4px 20px', display: 'flex', justifyContent: 'flex-end' }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary }}>다음에</button>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
        <MGRIllust w={390} h={220} tone="warm" dark={dark} />
        <div style={{ position: 'absolute', left: 20, top: 18, background: t.surface, padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: t.text }}>MARCH · REPORT</div>
      </div>
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, lineHeight: 1.2 }}>
          3월의 한 달이<br/>리포트로 정리됐어요.
        </div>
        <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 14, lineHeight: 1.7 }}>
          4개의 목표 · 22개의 완료 task · 1개의 100% 달성. 차분히 펼쳐볼 시간이에요.
        </div>
      </div>
    </div>
    <div style={{ padding: '14px 22px 28px', display: 'flex', alignItems: 'center' }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: t.textTertiary }}>다음에 보기</button>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '13px 22px', borderRadius: 12, background: t.text, color: t.bg, fontSize: 15, fontWeight: 600, textAlign: 'center' }}>3월 리포트 펼치기 →</button>
    </div>
    <JDHomeIndicator dark={dark} />
  </div>
);

// ===== 6. Lock unlock confirm =====
const MGRLockA = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <div style={{ position: 'absolute', inset: 0, padding: '50px 20px 0' }}>
      <JDStatusBar dark={dark} />
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, marginTop: -40 }}>목표</div>
    </div>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.32)' }}>
      <MGRAlert t={t} dark={dark}
        title="고정한 목표를 수정할까요?"
        body="처음 세운 약속과 달라질 수 있어요."
        actions={[
          { label: '유지하기' },
          { label: '수정하기', primary: true },
        ]} />
    </div>
  </div>
);

// B — action sheet from bottom
const MGRLockB = ({ t, dark }) => (
  <div style={{ height: '100%', background: t.bg, position: 'relative', overflow: 'hidden', fontFamily: W_FONT, color: t.text }}>
    <div style={{ position: 'absolute', inset: 0 }}>
      <JDStatusBar dark={dark} />
      <div style={{ padding: '4px 20px', fontSize: 26, fontWeight: 700, letterSpacing: -0.8 }}>목표</div>
    </div>
    <MGRBackdrop dark={dark}>
      <MGRSheet t={t} dark={dark}>
        <div style={{ padding: '8px 24px 4px' }}>
          <div style={{ marginBottom: 12 }}><MGRUnlock size={26} c={t.textSecondary} /></div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>이 약속, 정말 풀까요?</div>
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
            "삼성전자 면접 통과" — 4월 1일에 고정한 약속이에요. 풀고 수정하면, 처음 마음과 달라질 수 있어요.
          </div>
        </div>
        <div style={{ padding: '20px 22px 4px' }}>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '13px 0', borderRadius: 12, background: t.text, color: t.bg, fontSize: 14.5, fontWeight: 600, textAlign: 'center' }}>잠금 풀고 수정</button>
          <button style={{ width: '100%', all: 'unset', cursor: 'pointer', boxSizing: 'border-box', padding: '13px 0', borderRadius: 12, marginTop: 6, background: t.surfaceAlt, color: t.text, fontSize: 14.5, fontWeight: 500, textAlign: 'center' }}>그대로 두기</button>
        </div>
      </MGRSheet>
    </MGRBackdrop>
  </div>
);

Object.assign(window, {
  MGRFirstTimeA, MGRFirstTimeB,
  MGRYearlyPromptA, MGRYearlyPromptB,
  MGRMonthlyPromptA, MGRMonthlyPromptB,
  MGRReportReadyA, MGRReportReadyB,
  MGRLockA, MGRLockB,
});
