/**
 * Mineral theme definitions — single source of truth
 *
 * Used by: event-theme-wrapper, create event page, gradient-background
 * These map to the Five African Minerals brand palette.
 */

export interface MineralTheme {
  name: string;
  gradient: string;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceHover: string;
}

export const mineralThemes: Record<string, MineralTheme> = {
  malachite: {
    name: "Malachite",
    gradient: "linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)",
    primary: "#64FFDA",
    secondary: "#00796B",
    accent: "#004D40",
    surface: "rgba(0, 77, 64, 0.15)",
    surfaceHover: "rgba(0, 77, 64, 0.25)",
  },
  tanzanite: {
    name: "Tanzanite",
    gradient: "linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)",
    primary: "#B388FF",
    secondary: "#4B0082",
    accent: "#1A0A2E",
    surface: "rgba(75, 0, 130, 0.15)",
    surfaceHover: "rgba(75, 0, 130, 0.25)",
  },
  gold: {
    name: "Gold",
    gradient: "linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)",
    primary: "#FFD740",
    secondary: "#8B5A00",
    accent: "#5D4037",
    surface: "rgba(139, 90, 0, 0.15)",
    surfaceHover: "rgba(139, 90, 0, 0.25)",
  },
  "tigers-eye": {
    name: "Tiger's Eye",
    gradient: "linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)",
    primary: "#D4A574",
    secondary: "#8B4513",
    accent: "#4A2C00",
    surface: "rgba(139, 69, 19, 0.15)",
    surfaceHover: "rgba(139, 69, 19, 0.25)",
  },
  obsidian: {
    name: "Obsidian",
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)",
    primary: "#9CA3AF",
    secondary: "#3A3A3A",
    accent: "#1E1E1E",
    surface: "rgba(58, 58, 58, 0.15)",
    surfaceHover: "rgba(58, 58, 58, 0.25)",
  },
};

/** Theme IDs for iteration */
export const mineralThemeIds = Object.keys(mineralThemes) as (keyof typeof mineralThemes)[];

/** Extract [accent, secondary, primary] color tuple from a theme */
export function getThemeColors(themeId: string): [string, string, string] {
  const theme = mineralThemes[themeId] || mineralThemes.malachite;
  return [theme.accent, theme.secondary, theme.primary];
}

/** Brand colors for background animations */
export const brandColors = {
  light: {
    primary: "#00574B",
    secondary: "#004D40",
    background: "#FAFAF8",
  },
  dark: {
    primary: "#64FFDA",
    secondary: "#00BFA5",
    background: "#0A0A0A",
  },
};
