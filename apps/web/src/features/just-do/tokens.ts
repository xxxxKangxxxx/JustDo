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

export const categoryLabel: Record<Category, string> = {
  me: "나",
  ext: "외부",
  habit: "Habit",
};
