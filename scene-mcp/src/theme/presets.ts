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
