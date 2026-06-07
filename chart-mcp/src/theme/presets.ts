export interface ThemePreset {
  name: string;
  palette: string[];
  echartsTheme: Record<string, unknown>;
}

export const UNIVERSAL_PALETTES: Record<string, string[]> = {
  "business-blue": ["#2C3E70", "#5B7DB5", "#8EACD8", "#B8C9E8", "#1A2744"],
  "warm-orange": ["#E07030", "#F09060", "#F4B898", "#F8D0B8", "#C05020"],
  "slate-gray": ["#485275", "#6B7D9E", "#8E9FBF", "#B1C1D8", "#44546A"],
  "dark-mode": ["#5B9BD5", "#7DB9E8", "#9EC8F0", "#C0D8F5", "#3A7BBF"],
  "red-gold": ["#A91F1F", "#C44B4B", "#D97878", "#E8A5A5", "#8B6914"],
};

export function findBestPresetPalette(_primaryHex: string): string[] {
  return UNIVERSAL_PALETTES["slate-gray"];
}

export function buildEchartsTheme(
  palette: string[],
  isDark: boolean,
): Record<string, unknown> {
  return {
    color: palette,
    backgroundColor: isDark ? "#1a1a2e" : "#FFFFFF",
    textStyle: { color: isDark ? "#e0e0e0" : palette[4] || "#333333" },
    title: {
      textStyle: { color: palette[0], fontSize: 18, fontWeight: "bold" },
      subtextStyle: { color: isDark ? "#a0a0a0" : palette[1] },
    },
    legend: {
      textStyle: { color: isDark ? "#c0c0c0" : palette[4] || "#555555" },
    },
    tooltip: {
      backgroundColor: isDark ? "rgba(40,40,60,0.95)" : "rgba(255,255,255,0.95)",
      borderColor: palette[1],
      textStyle: { color: isDark ? "#e0e0e0" : "#333333" },
    },
    grid: { borderColor: isDark ? "#333355" : "#E7E6E6" },
    categoryAxis: {
      axisLine: { lineStyle: { color: palette[2] } },
      axisTick: { lineStyle: { color: palette[2] } },
      axisLabel: { color: isDark ? "#a0a0a0" : palette[4] || "#666666" },
      splitLine: { lineStyle: { color: isDark ? "#2a2a4a" : "#F0F0F0", type: "dashed" } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: isDark ? "#a0a0a0" : palette[4] || "#666666" },
      splitLine: { lineStyle: { color: isDark ? "#2a2a4a" : "#F0F0F0", type: "dashed" } },
    },
  };
}
