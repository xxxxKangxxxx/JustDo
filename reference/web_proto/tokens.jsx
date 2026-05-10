// Web tokens — extends the mobile palette with web-specific surface tones
const W_TOKENS = {
  light: {
    bg: '#F6F4EF',
    bg2: '#FBF9F4',
    surface: '#FFFFFF',
    surfaceAlt: '#FBF9F4',
    glass: 'rgba(246,244,239,0.72)',
    glassBorder: 'rgba(30,25,20,0.06)',
    divider: 'rgba(30,25,20,0.07)',
    dividerStrong: 'rgba(30,25,20,0.13)',
    text: '#1C1A17',
    textSecondary: 'rgba(28,26,23,0.62)',
    textTertiary: 'rgba(28,26,23,0.40)',
    hover: 'rgba(28,26,23,0.04)',
    selected: 'rgba(28,26,23,0.06)',
    me: { solid: 'oklch(0.62 0.09 245)', soft: 'oklch(0.93 0.035 245)', softer: 'oklch(0.96 0.02 245)', ink: 'oklch(0.42 0.08 245)' },
    ext: { solid: 'oklch(0.66 0.1 30)', soft: 'oklch(0.93 0.04 30)', softer: 'oklch(0.96 0.022 30)', ink: 'oklch(0.46 0.09 30)' },
    habit: { solid: 'oklch(0.66 0.08 155)', soft: 'oklch(0.93 0.035 155)', softer: 'oklch(0.96 0.02 155)', ink: 'oklch(0.42 0.07 155)' },
    accent: 'oklch(0.62 0.09 245)',
    danger: 'oklch(0.6 0.12 25)',
  },
  dark: {
    bg: '#131210',
    bg2: '#19181631',
    surface: '#1C1B18',
    surfaceAlt: '#232220',
    glass: 'rgba(19,18,16,0.72)',
    glassBorder: 'rgba(255,248,235,0.06)',
    divider: 'rgba(255,248,235,0.08)',
    dividerStrong: 'rgba(255,248,235,0.14)',
    text: '#F3F0EA',
    textSecondary: 'rgba(243,240,234,0.62)',
    textTertiary: 'rgba(243,240,234,0.36)',
    hover: 'rgba(255,248,235,0.05)',
    selected: 'rgba(255,248,235,0.08)',
    me: { solid: 'oklch(0.72 0.1 245)', soft: 'oklch(0.35 0.06 245)', softer: 'oklch(0.28 0.04 245)', ink: 'oklch(0.85 0.08 245)' },
    ext: { solid: 'oklch(0.74 0.11 30)', soft: 'oklch(0.37 0.07 30)', softer: 'oklch(0.29 0.05 30)', ink: 'oklch(0.86 0.09 30)' },
    habit: { solid: 'oklch(0.74 0.09 155)', soft: 'oklch(0.34 0.06 155)', softer: 'oklch(0.27 0.04 155)', ink: 'oklch(0.85 0.08 155)' },
    accent: 'oklch(0.72 0.1 245)',
    danger: 'oklch(0.7 0.13 25)',
  },
};

const W_FONT = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "SF Pro Display", "Pretendard", "Noto Sans KR", system-ui, sans-serif`;
const WK_LABEL = ['일','월','화','수','목','금','토'];
const W_CATS = { me: '나', ext: '외부', habit: '습관' };

const useT = () => { const w = useW(); return W_TOKENS[w.ui.dark ? 'dark' : 'light']; };

const wFmtTime = (t) => { if (!t) return ''; const [h,m] = t.split(':').map(Number); const am = h < 12; const hh = h % 12 || 12; return `${am ? '오전' : '오후'} ${hh}:${String(m).padStart(2,'0')}`; };

Object.assign(window, { W_TOKENS, W_FONT, WK_LABEL, W_CATS, useT, wFmtTime });
