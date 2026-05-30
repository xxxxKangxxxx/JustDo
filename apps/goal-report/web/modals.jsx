// Goal & Report — Web modal screens.
// Renders just the modal card. Pair with GRModalFrame for the full artboard.
// Exposes WGR* modal components to window.

// ===== 1. First-time wizard =====
// 2-step: yearly → monthly. Up to 5 each. title + optional note + per-goal lock.

const _wizYearlyDraft = [
  { title: '체력 만들기', note: '주 3회 운동 루틴 정착', lock: true },
  { title: '직무 전환',   note: '디자인 → 프로덕트 매니저', lock: true },
  { title: '글 50편 쓰기', note: '한 주에 한 편', lock: false },
  { title: '',            note: '',                 lock: false },
];
const _wizMonthlyDraft = [
  { title: '삼성전자 면접 통과', note: '면접 준비 4단계 마무리', lock: true },
  { title: '포트폴리오 v2 완성',  note: '케이스 스터디 3건 정리', lock: true },
  { title: '달리기 80km',        note: '주말마다 20km',          lock: false },
];

// A — stepped wizard with progress bar at top, compact
const WGRFirstTimeA = ({ t, dark, step = 1 }) => {
  const drafts = step === 1 ? _wizYearlyDraft : _wizMonthlyDraft;
  const isYear = step === 1;
  return (
    <div style={{
      width: 640, background: t.surface, borderRadius: 16,
      border: `0.5px solid ${t.divider}`,
      boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
      overflow: 'hidden', fontFamily: W_FONT, color: t.text,
    }}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>Step {step}/2</span>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: t.surfaceAlt, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: step === 1 ? '50%' : '100%', background: t.accent, transition: 'width .3s' }} />
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6 }}>{isYear ? '2026년의 큰 방향은?' : '4월의 약속은?'}</div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
          {isYear ? '한 해 동안 그려볼 4–5개의 큰 그림을 적어주세요.' : '4월 한 달의 작은 약속이에요. 연간 목표와 연결하지 않아도 괜찮아요.'}
        </div>
      </div>

      <div style={{ padding: '14px 22px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {drafts.map((g, i) => (
          <div key={i} style={{
            border: `0.5px solid ${t.divider}`, borderRadius: 10, padding: '10px 12px',
            background: t.bg2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: t.textTertiary, width: 14, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: g.title ? t.text : t.textTertiary }}>{g.title || (isYear ? '목표 적기' : '약속 적기')}</span>
              {g.title && <GRLockPill on={g.lock} t={t} />}
            </div>
            {g.note && <div style={{ marginTop: 4, marginLeft: 22, fontSize: 11.5, color: t.textSecondary }}>{g.note}</div>}
          </div>
        ))}
        <button style={{
          all: 'unset', cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
          border: `0.5px dashed ${t.dividerStrong}`, color: t.textTertiary,
          fontSize: 12, fontWeight: 500, textAlign: 'center',
        }}>+ {isYear ? '목표' : '약속'} 추가  <span style={{ opacity: 0.6, fontWeight: 400 }}>(최대 5개)</span></button>
      </div>

      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}`, marginTop: 8 }}>
        <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, fontWeight: 500 }}>나중에 할게요</button>
        <div style={{ flex: 1 }} />
        <button style={{ all: 'unset', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{isYear ? '다음 →' : '완료'}</button>
      </div>
    </div>
  );
};

// B — full-screen cinematic, large left intro / right form
const WGRFirstTimeB = ({ t, dark, step = 1 }) => {
  const drafts = step === 1 ? _wizYearlyDraft : _wizMonthlyDraft;
  const isYear = step === 1;
  return (
    <div style={{
      width: 920, height: 580, background: t.surface, borderRadius: 18,
      border: `0.5px solid ${t.divider}`,
      boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
      overflow: 'hidden', fontFamily: W_FONT, color: t.text,
      display: 'flex',
    }}>
      <div style={{
        width: 380, padding: '36px 32px', background: t.bg2,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: `0.5px solid ${t.divider}`,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: step >= 1 ? t.text : t.dividerStrong, color: t.bg, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span style={{ height: 1, flex: 1, background: step === 2 ? t.text : t.divider }} />
            <span style={{ width: 18, height: 18, borderRadius: 9, background: step >= 2 ? t.text : 'transparent', border: step >= 2 ? 'none' : `1px solid ${t.dividerStrong}`, color: step >= 2 ? t.bg : t.textTertiary, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
          </div>
          <div style={{ marginBottom: 18 }}>
            <GRIllustration w={160} h={100} tone={isYear ? 'warm' : 'cool'} dark={dark} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }}>
            {isYear ? '2026년,\n한 해를 그려볼까요.' : '4월,\n한 달의 약속.'}
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 12, lineHeight: 1.6 }}>
            {isYear
              ? '먼 시점의 약속이라 처음엔 흐릿해도 괜찮아요. 마음에 걸리는 단어 한두 개부터 적어보세요.'
              : '이번 달의 4–5개 작은 약속. 연간 목표와 굳이 맞추지 않아도 돼요.'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: t.textTertiary }}>{isYear ? 'Step 1 · 연간 목표' : 'Step 2 · 월간 목표'}</div>
      </div>

      <div style={{ flex: 1, padding: '32px 32px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 }}>
          {isYear ? '연간 목표' : '월간 목표'} · 최대 5개
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map((g, i) => (
            <div key={i} style={{ borderBottom: `0.5px solid ${t.divider}`, paddingBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 11, color: t.textTertiary, width: 12, fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{i+1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: g.title ? t.text : t.textTertiary, letterSpacing: -0.3 }}>{g.title || (isYear ? '목표 적기' : '약속 적기')}</div>
                  {g.note && <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>{g.note}</div>}
                </div>
                {g.title && <GRLockPill on={g.lock} t={t} />}
              </div>
            </div>
          ))}
          <button style={{
            all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, padding: '6px 0',
          }}>+ 항목 추가</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0', borderTop: `0.5px solid ${t.divider}`, marginTop: 16 }}>
          <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary }}>나중에 할게요</button>
          <div style={{ flex: 1 }} />
          {step === 2 && <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textSecondary, marginRight: 12 }}>← 이전</button>}
          <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 18px', borderRadius: 8, background: t.text, color: t.bg, fontSize: 12.5, fontWeight: 600 }}>{isYear ? '4월 약속으로 →' : '시작하기'}</button>
        </div>
      </div>
    </div>
  );
};

// ===== 2. Yearly prompt (Jan 1–7) =====
const WGRYearlyPromptA = ({ t, dark }) => (
  <div style={{
    width: 540, background: t.surface, borderRadius: 14,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ padding: '20px 22px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: t.me.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.me.soft, padding: '2px 8px', borderRadius: 4 }}>새해</span>
        <span style={{ fontSize: 11, color: t.textTertiary }}>2026년 1월 1일</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2 }}>
        새해의 약속을 적어볼까요?
      </div>
      <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
        한 해를 관통할 4–5개의 큰 방향. 12월에 다시 만나서 돌아볼 수 있어요.
      </div>
    </div>
    <div style={{ padding: '0 22px 16px' }}>
      <div style={{ padding: 14, borderRadius: 10, background: t.bg2, border: `0.5px solid ${t.divider}` }}>
        <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 6 }}>예시</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: t.textSecondary }}>
          체력 만들기 · 글 50편 쓰기 · 새 직무 익히기 · 가족과 자주 만나기
        </div>
      </div>
    </div>
    <div style={{ padding: '12px 22px', borderTop: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary, cursor: 'pointer' }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
        올해는 다시 보지 않기
      </label>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, marginRight: 12 }}>나중에</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>적어보기 →</button>
    </div>
  </div>
);

const WGRYearlyPromptB = ({ t, dark }) => (
  <div style={{
    width: 720, background: t.surface, borderRadius: 18,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ height: 200, background: t.bg2, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GRIllustration w={720} h={200} tone="warm" dark={dark} />
      </div>
      <div style={{ position: 'absolute', left: 28, bottom: 18, fontSize: 11, color: t.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 700, background: t.surface, padding: '3px 10px', borderRadius: 4 }}>
        2026 · 새해
      </div>
    </div>
    <div style={{ padding: '24px 32px 8px' }}>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }}>
        올해, 어디로 향할까요?
      </div>
      <div style={{ fontSize: 14, color: t.textSecondary, marginTop: 10, lineHeight: 1.65, maxWidth: 460 }}>
        한 해의 큰 방향을 적어두면, 매월 그 방향을 돌아볼 수 있어요. 12월의 당신이, 1월의 당신을 만나러 옵니다.
      </div>
    </div>
    <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}`, marginTop: 18 }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: t.textTertiary, cursor: 'pointer' }}>
        <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
        올해는 다시 보지 않기
      </label>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: t.textTertiary, marginRight: 18 }}>나중에 할게요</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '10px 22px', borderRadius: 10, background: t.text, color: t.bg, fontSize: 13, fontWeight: 600 }}>적어보기</button>
    </div>
  </div>
);

// ===== 3. Monthly prompt (1st–3rd of month) =====
const WGRMonthlyPromptA = ({ t, dark }) => (
  <div style={{
    width: 520, background: t.surface, borderRadius: 14,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ padding: '20px 22px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: t.habit.ink, letterSpacing: 0.4, textTransform: 'uppercase', background: t.habit.soft, padding: '2px 8px', borderRadius: 4 }}>새 달</span>
        <span style={{ fontSize: 11, color: t.textTertiary }}>4월 1일</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25 }}>
        4월의 작은 약속, 정해볼까요?
      </div>
      <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
        한 달의 흐름을 잡아줄 3–5개의 약속. 4월 30일에 함께 돌아봐요.
      </div>
    </div>
    <div style={{ padding: '8px 22px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {['삼성전자 면접 통과', '포트폴리오 v2 완성'].map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: t.bg2 }}>
          <span style={{ fontSize: 10.5, color: t.textTertiary, fontFeatureSettings: '"tnum"' }}>{i+1}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{g}</span>
          <div style={{ flex: 1 }} />
        </div>
      ))}
      <button style={{
        all: 'unset', cursor: 'pointer', padding: '7px 10px', borderRadius: 8,
        border: `0.5px dashed ${t.dividerStrong}`, color: t.textTertiary,
        fontSize: 12, fontWeight: 500, textAlign: 'left',
      }}>+ 약속 적기</button>
    </div>
    <div style={{ padding: '12px 22px', borderTop: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textTertiary, cursor: 'pointer' }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
        4월엔 다시 보지 않기
      </label>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, marginRight: 12 }}>건너뛰기</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>저장</button>
    </div>
  </div>
);

const WGRMonthlyPromptB = ({ t, dark }) => (
  <div style={{
    width: 560, background: t.surface, borderRadius: 16,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ padding: '32px 30px 14px', textAlign: 'left' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>
        APRIL · 새 달의 약속
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, lineHeight: 1.15 }}>
        이번 달, 한 가지만<br/>약속한다면.
      </div>
      <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 14, lineHeight: 1.65 }}>
        4월의 30일을 관통할 작은 약속. 너무 크지 않게, 너무 모호하지 않게.
      </div>
    </div>
    <div style={{ padding: '18px 30px 8px' }}>
      <div style={{ padding: '14px 16px', borderRadius: 10, background: t.bg2 }}>
        <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 6, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>지난 달 이어가기</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.55 }}>
          3월에 75%까지 도착했어요 — <b>삼성전자 면접 통과</b>
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 30px', borderTop: `0.5px solid ${t.divider}`, marginTop: 18, display: 'flex', alignItems: 'center' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: t.textTertiary, cursor: 'pointer' }}>
        <span style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${t.dividerStrong}` }} />
        4월엔 다시 보지 않기
      </label>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, marginRight: 14 }}>건너뛰기</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 18px', borderRadius: 9, background: t.text, color: t.bg, fontSize: 12.5, fontWeight: 600 }}>약속 적기 →</button>
    </div>
  </div>
);

// ===== 4. Report ready — entry modal =====
const WGRReportReadyA = ({ t, dark }) => (
  <div style={{
    width: 500, background: t.surface, borderRadius: 14,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ padding: '22px 22px 6px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: t.me.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {grRing(0.66, 30, t.me.solid, t.me.softer, 4)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>3월 리포트가 준비됐어요</div>
        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4, lineHeight: 1.55 }}>
          한 달 동안 22개의 task를 마쳤고, 4개의 목표 중 1개는 100%에 도착했어요.
        </div>
      </div>
    </div>
    <div style={{ padding: '14px 22px 18px', display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: t.textTertiary, marginRight: 14 }}>닫기</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: t.accent, color: '#fff', fontSize: 12.5, fontWeight: 600 }}>리포트 보기 →</button>
    </div>
  </div>
);

const WGRReportReadyB = ({ t, dark }) => (
  <div style={{
    width: 640, background: t.surface, borderRadius: 18,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ height: 180, background: t.bg2, position: 'relative', overflow: 'hidden' }}>
      <GRIllustration w={640} h={180} tone="warm" dark={dark} />
      <div style={{ position: 'absolute', left: 28, top: 22, fontSize: 11, fontWeight: 700, color: t.text, letterSpacing: 0.4, textTransform: 'uppercase', background: t.surface, padding: '3px 10px', borderRadius: 4 }}>
        MARCH · REPORT
      </div>
    </div>
    <div style={{ padding: '24px 32px 8px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.9, lineHeight: 1.2 }}>
        3월의 한 달이<br/>리포트로 정리됐어요.
      </div>
      <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 12, lineHeight: 1.65 }}>
        4개의 목표 · 22개의 완료 task · 1개의 100% 달성. 차분히 펼쳐볼 시간이에요.
      </div>
    </div>
    <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}`, marginTop: 24 }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: t.textTertiary }}>다음에 보기</button>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', padding: '10px 22px', borderRadius: 10, background: t.text, color: t.bg, fontSize: 13, fontWeight: 600 }}>3월 리포트 펼치기 →</button>
    </div>
  </div>
);

// ===== 6. Lock unlock confirm =====
const WGRLockA = ({ t, dark }) => (
  <div style={{
    width: 380, background: t.surface, borderRadius: 14,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
    padding: '20px 22px 16px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <GRUnlockIcon size={18} c={t.text} />
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>고정한 목표를 수정할까요?</div>
    </div>
    <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.55 }}>
      처음 세운 약속과 달라질 수 있어요. 이번 한 번만 풀고, 수정 후 다시 잠글 수 있어요.
    </div>
    <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, border: `0.5px solid ${t.divider}`, fontSize: 12, fontWeight: 600, color: t.text }}>유지하기</button>
      <button style={{ all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, background: t.text, color: t.bg, fontSize: 12, fontWeight: 600 }}>수정하기</button>
    </div>
  </div>
);

const WGRLockB = ({ t, dark }) => (
  <div style={{
    width: 460, background: t.surface, borderRadius: 16,
    border: `0.5px solid ${t.divider}`,
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    fontFamily: W_FONT, color: t.text, overflow: 'hidden',
  }}>
    <div style={{ padding: '28px 28px 8px', textAlign: 'left' }}>
      <div style={{ marginBottom: 16 }}>
        <GRUnlockIcon size={28} c={t.textSecondary} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.25 }}>
        이 약속, 정말 풀까요?
      </div>
      <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 10, lineHeight: 1.65 }}>
        "삼성전자 면접 통과" — 4월 1일에 고정한 약속이에요. 풀고 수정하면, 처음 마음과 달라질 수 있어요.
      </div>
    </div>
    <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', borderTop: `0.5px solid ${t.divider}`, marginTop: 20 }}>
      <button style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, color: t.textTertiary }}>그대로 두기</button>
      <div style={{ flex: 1 }} />
      <button style={{ all: 'unset', cursor: 'pointer', padding: '9px 18px', borderRadius: 9, background: t.text, color: t.bg, fontSize: 12.5, fontWeight: 600 }}>잠금 풀고 수정</button>
    </div>
  </div>
);

Object.assign(window, {
  WGRFirstTimeA, WGRFirstTimeB,
  WGRYearlyPromptA, WGRYearlyPromptB,
  WGRMonthlyPromptA, WGRMonthlyPromptB,
  WGRReportReadyA, WGRReportReadyB,
  WGRLockA, WGRLockB,
});
