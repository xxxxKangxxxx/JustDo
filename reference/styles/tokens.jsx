// Just Do — design tokens
// Muted/pastel palette per category, warm off-white light mode, soft charcoal dark mode.
// Built on oklch so light/dark variants stay harmonic.

const JD_TOKENS = {
  light: {
    bg: '#F6F4EF',             // warm off-white canvas
    surface: '#FFFFFF',        // cards / sheets
    surfaceAlt: '#FBF9F4',     // grouped bg behind cards
    divider: 'rgba(30,25,20,0.08)',
    dividerStrong: 'rgba(30,25,20,0.14)',
    text: '#1C1A17',           // near-black, warm
    textSecondary: 'rgba(28,26,23,0.58)',
    textTertiary: 'rgba(28,26,23,0.38)',
    // Category hues — muted pastels
    me: {
      solid: 'oklch(0.62 0.09 245)',
      soft: 'oklch(0.93 0.035 245)',
      softer: 'oklch(0.96 0.02 245)',
      ink: 'oklch(0.42 0.08 245)',
    },
    ext: {
      solid: 'oklch(0.66 0.1 30)',
      soft: 'oklch(0.93 0.04 30)',
      softer: 'oklch(0.96 0.022 30)',
      ink: 'oklch(0.46 0.09 30)',
    },
    habit: {
      solid: 'oklch(0.66 0.08 155)',
      soft: 'oklch(0.93 0.035 155)',
      softer: 'oklch(0.96 0.02 155)',
      ink: 'oklch(0.42 0.07 155)',
    },
    accent: 'oklch(0.62 0.09 245)',
  },
  dark: {
    bg: '#131210',
    surface: '#1C1B18',
    surfaceAlt: '#232220',
    divider: 'rgba(255,248,235,0.08)',
    dividerStrong: 'rgba(255,248,235,0.14)',
    text: '#F3F0EA',
    textSecondary: 'rgba(243,240,234,0.6)',
    textTertiary: 'rgba(243,240,234,0.36)',
    me: {
      solid: 'oklch(0.72 0.1 245)',
      soft: 'oklch(0.35 0.06 245)',
      softer: 'oklch(0.28 0.04 245)',
      ink: 'oklch(0.85 0.08 245)',
    },
    ext: {
      solid: 'oklch(0.74 0.11 30)',
      soft: 'oklch(0.37 0.07 30)',
      softer: 'oklch(0.29 0.05 30)',
      ink: 'oklch(0.86 0.09 30)',
    },
    habit: {
      solid: 'oklch(0.74 0.09 155)',
      soft: 'oklch(0.34 0.06 155)',
      softer: 'oklch(0.27 0.04 155)',
      ink: 'oklch(0.85 0.08 155)',
    },
    accent: 'oklch(0.72 0.1 245)',
  },
};

// Korean-first font stack matching Apple SD Gothic Neo feel.
const JD_FONT = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "SF Pro Text", "Pretendard", system-ui, sans-serif`;
const JD_DISPLAY = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "SF Pro Display", "Pretendard", system-ui, sans-serif`;

// sample data — April 2026. Days as 1-indexed numbers within month.
const JD_DATA = {
  year: 2026,
  month: 4, // April
  today: 21,
  // bars: multi-day tasks
  bars: [
    { id: 'samsung', cat: 'me', title: '삼성전자 지원', start: 1, end: 21, lane: 0 },
    { id: 'portfolio', cat: 'me', title: '포트폴리오 정리', start: 6, end: 12, lane: 1 },
    { id: 'proj', cat: 'ext', title: '프로젝트 A 런칭', start: 13, end: 24, lane: 1 },
    { id: 'trip', cat: 'ext', title: '부산 출장', start: 27, end: 29, lane: 0 },
  ],
  // dots: single-day marks (cat codes)
  dots: {
    2: ['me'], 3: ['habit'], 4: ['habit','ext'], 5: ['me'],
    7: ['habit'], 8: ['me','habit'], 10: ['ext'],
    14: ['me','habit'], 15: ['ext','habit'], 17: ['me'],
    18: ['habit'], 20: ['me','habit'], 21: ['me','ext','habit'],
    22: ['habit'], 24: ['ext'], 25: ['me'], 28: ['ext','habit'], 30: ['habit'],
  },
  // selected day's task list
  selectedTasks: {
    me: [
      { id: 't1', title: '삼성전자 지원', range: '4/1 – 4/21', done: false, priority: 'high' },
      { id: 't2', title: '독서 30분', time: null, done: true },
      { id: 't3', title: '포트폴리오 피드백 반영', time: '오후 9시', done: false },
    ],
    ext: [
      { id: 't4', title: '업체 미팅', time: '오후 2시', done: false, priority: 'high' },
      { id: 't5', title: '팀 보고서 제출', range: '~ 4/21', done: false },
    ],
    habit: [
      { id: 't6', title: '운동 30분', streak: 12, done: true },
      { id: 't7', title: '물 2L 마시기', streak: 28, done: true },
      { id: 't8', title: '아침 스트레칭', streak: 5, done: false },
    ],
  },
};

Object.assign(window, { JD_TOKENS, JD_FONT, JD_DISPLAY, JD_DATA });
