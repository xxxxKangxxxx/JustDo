// Goal & Report — shared mock data + narrative templates.
// Mounts to window. Same data feeds web and mobile prototypes.

const GR_YEAR = 2026;
const GR_MONTH = 4; // showing reports for March 2026 (last completed month)
const GR_REPORT_MONTH = 3; // March report
const GR_REPORT_MONTH_LABEL = '3월';
const GR_REPORT_YEAR_LABEL = '2025';

// ---- Goal data ----
// progress = ratio of related-task completion (0–1)
const GR_YEARLY = [
  { id: 'y1', title: '체력 만들기',         note: '주 3회 운동 루틴 정착',     locked: true,  progress: 0.42, related: 24, done: 10, slip: 3 },
  { id: 'y2', title: '직무 전환',           note: '디자인 → 프로덕트 매니저', locked: true,  progress: 0.28, related: 18, done: 5,  slip: 6 },
  { id: 'y3', title: '글 50편 쓰기',         note: '한 주에 한 편',             locked: false, progress: 0.18, related: 50, done: 9,  slip: 4 },
  { id: 'y4', title: '독서 24권',           note: '월 2권 페이스',             locked: false, progress: 0.33, related: 24, done: 8,  slip: 1 },
];

const GR_MONTHLY = [
  { id: 'm1', title: '삼성전자 면접 통과',   note: '면접 준비 4단계 마무리',    locked: true,  progress: 0.75, related: 12, done: 9, slip: 1 },
  { id: 'm2', title: '포트폴리오 v2 완성',   note: '케이스 스터디 3건 정리',    locked: true,  progress: 0.66, related: 9,  done: 6, slip: 2 },
  { id: 'm3', title: '달리기 80km',         note: '주말마다 20km',             locked: false, progress: 0.55, related: 16, done: 9, slip: 0 },
  { id: 'm4', title: '주간 회고 4회',       note: '일요일 저녁 30분',          locked: false, progress: 1.0,  related: 4,  done: 4, slip: 0 },
];

// Daily activity counts (March 2026, 31 days). Used for heatmap.
const GR_HEATMAP = (() => {
  const seed = [
    0,2,3,1,4, 0,5,2,3,1, 4,5,0,2,3,
    4,2,1,0,3, 5,4,2,1,0, 3,5,4,2,3, 1
  ];
  return seed.slice(0, 31);
})();

// Highlight tasks
const GR_TOP_DONE = [
  { title: '면접 자기소개 정리', cat: 'me', goal: '삼성전자 면접 통과' },
  { title: '주간 회고 — 3월 4주차', cat: 'me', goal: '주간 회고 4회' },
  { title: '한강 12km 러닝', cat: 'me', goal: '달리기 80km' },
];
const GR_TOP_SLIP = [
  { title: '케이스 스터디 — Toss 리디자인', cat: 'me', days: 9, goal: '포트폴리오 v2 완성' },
  { title: '글 — 디자이너의 결정 노트',    cat: 'me', days: 7, goal: '글 50편 쓰기' },
];

// ---- Narrative templates ----
// tone ∈ 'essay' (default) | 'coach' | 'data'
const GR_NARRATIVE = {
  monthly: {
    essay: [
      '3월의 한 달은 면접 준비가 중심에 있었어요. 12개의 관련 task 중 9개를 마쳤고, 자기소개와 포트폴리오 자료가 차곡차곡 모였습니다. 주말마다 한강을 달린 9번의 기록도 빼놓을 수 없어요.',
      '다만 케이스 스터디 한 건은 9일째 자리를 지키고 있어요. 일요일 저녁의 회고만큼은 한 번도 거르지 않은 한 달이었습니다. 작은 약속을 지킨 시간들이 다음 달의 페이스를 만들어줄 거예요.',
    ],
    coach: [
      '잘했어요! 3월엔 22개의 task를 끝냈고, 면접 준비 9개를 마무리한 게 가장 큰 성과예요. 주간 회고는 4번 모두 성공 ✨',
      '딱 하나, 케이스 스터디가 9일째 밀려 있어요. 4월에는 이걸 첫 주에 끝내볼까요?',
    ],
    data: [
      '완료 22 · 진행 11 · 밀린 작업 3. 가장 활발한 카테고리는 "나", 가장 많은 task가 묶인 목표는 "삼성전자 면접 통과"였어요.',
      '연속 4주 회고를 채운 첫 달이기도 합니다.',
    ],
  },
  yearly: {
    essay: [
      '2025년은 옮겨가는 한 해였어요. 디자인에서 프로덕트로 무게중심이 천천히 기울었고, 그 변화에 맞춰 새로운 루틴을 하나씩 들였습니다.',
      '운동은 처음 세운 약속의 절반 즈음에 도착했고, 글쓰기는 생각만큼 빠르지 않았어요. 그래도 9편의 글이 쌓였고, 8권의 책이 책장에 더해졌습니다.',
      '한 해를 한 줄로 적는다면 — 다른 길로 한 걸음 옮긴 해.',
    ],
    coach: [
      '한 해 정말 고생했어요! 4개의 목표 중 "글 50편 쓰기"는 18%, "체력 만들기"는 42%까지 도착했어요.',
      '직무 전환은 아직 28%지만, 후반 3개월의 가속이 인상적이었어요. 2026년엔 이 흐름을 이어가볼까요?',
    ],
    data: [
      '연간 목표 4개 · 평균 진행률 30%. 가장 많이 진행된 목표는 "체력 만들기" (42%).',
      '월별 task 완료 평균 18.4, 가장 활발한 달은 11월이었어요.',
    ],
  },
};

// First-time wizard intro copy
const GR_WIZARD_INTRO = {
  title: '한 해를 그려볼까요?',
  sub: '먼저 1년의 큰 방향을 정하고, 그다음 이번 달의 작은 약속을 적어요.',
};

Object.assign(window, {
  GR_YEAR, GR_MONTH, GR_REPORT_MONTH, GR_REPORT_MONTH_LABEL, GR_REPORT_YEAR_LABEL,
  GR_YEARLY, GR_MONTHLY, GR_HEATMAP, GR_TOP_DONE, GR_TOP_SLIP, GR_NARRATIVE, GR_WIZARD_INTRO,
});
