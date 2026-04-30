import type { Category } from "@/types/domain";

export type ThemeMode = "light" | "dark";

export const tokens = {
  light: {
    bg: "#F6F4EF",
    surface: "#FFFFFF",
    surfaceAlt: "#FBF9F4",
    divider: "rgba(30,25,20,0.08)",
    dividerStrong: "rgba(30,25,20,0.14)",
    text: "#1C1A17",
    textSecondary: "rgba(28,26,23,0.58)",
    textTertiary: "rgba(28,26,23,0.38)",
    accent: "oklch(0.62 0.09 245)",
    me: {
      solid: "oklch(0.62 0.09 245)",
      soft: "oklch(0.93 0.035 245)",
      ink: "oklch(0.42 0.08 245)",
    },
    ext: {
      solid: "oklch(0.66 0.1 30)",
      soft: "oklch(0.93 0.04 30)",
      ink: "oklch(0.46 0.09 30)",
    },
    habit: {
      solid: "oklch(0.66 0.08 155)",
      soft: "oklch(0.93 0.035 155)",
      ink: "oklch(0.42 0.07 155)",
    },
  },
  dark: {
    bg: "#131210",
    surface: "#1C1B18",
    surfaceAlt: "#232220",
    divider: "rgba(255,248,235,0.08)",
    dividerStrong: "rgba(255,248,235,0.14)",
    text: "#F3F0EA",
    textSecondary: "rgba(243,240,234,0.6)",
    textTertiary: "rgba(243,240,234,0.36)",
    accent: "oklch(0.72 0.1 245)",
    me: {
      solid: "oklch(0.72 0.1 245)",
      soft: "oklch(0.35 0.06 245)",
      ink: "oklch(0.85 0.08 245)",
    },
    ext: {
      solid: "oklch(0.74 0.11 30)",
      soft: "oklch(0.37 0.07 30)",
      ink: "oklch(0.86 0.09 30)",
    },
    habit: {
      solid: "oklch(0.74 0.09 155)",
      soft: "oklch(0.34 0.06 155)",
      ink: "oklch(0.85 0.08 155)",
    },
  },
} as const;

export const defaultCategories: Category[] = [
  { id: "cat_me", name: "나", color: "#4F6FD8", isDefault: true, position: 0 },
  { id: "cat_ext", name: "외부", color: "#D36A3A", isDefault: true, position: 1 },
];

const normalizeHex = (value: string): string => {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#4F6FD8";
};

const hexToHsl = (hex: string) => {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0 };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === r
      ? 60 * (((g - b) / delta) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4);
  return { hue: Math.round((hue + 360) % 360), saturation: Math.round(saturation * 100) };
};

export const categoryStyle = (
  category: Pick<Category, "color"> | null | undefined,
  mode: ThemeMode,
) => {
  const hex = normalizeHex(category?.color ?? defaultCategories[0].color);
  const { hue, saturation } = hexToHsl(hex);
  const softSaturation = Math.max(24, Math.min(saturation, 62));
  return {
    solid: hex,
    soft:
      mode === "dark"
        ? `hsl(${hue} ${softSaturation}% 25%)`
        : `hsl(${hue} ${softSaturation}% 94%)`,
    ink:
      mode === "dark"
        ? `hsl(${hue} ${Math.max(32, saturation)}% 84%)`
        : `hsl(${hue} ${Math.max(34, saturation)}% 34%)`,
  };
};

export const sortedCategories = (categories: Category[]) =>
  [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
