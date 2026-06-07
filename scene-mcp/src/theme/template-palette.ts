import { readDetailJson } from "../detail-reader.js";
import { generatePalette, isDarkBackground } from "../color-math.js";
import { findBestPresetPalette } from "./presets.js";
import { getCachedPalette, setCachedPalette } from "./cache.js";

export interface ResolvedPalette {
  palette: string[];
  isDark: boolean;
  source: "template" | "preset" | "override";
}

export function resolvePalette(
  templateSlug: string,
  colorOverride?: string[],
): ResolvedPalette {
  // 1. color_override highest priority
  if (colorOverride && colorOverride.length >= 2) {
    const isDark = isDarkBackground(colorOverride);
    return {
      palette: colorOverride,
      isDark,
      source: "override",
    };
  }

  // 2. Extract from template detail.json
  const detail = readDetailJson(templateSlug);
  if (detail && detail.themeColors.length >= 2) {
    // Check cache
    const cached = getCachedPalette(detail.slug, detail.mtime);
    if (cached) {
      return {
        palette: cached.palette,
        isDark: cached.isDark,
        source: "template",
      };
    }

    const primary = detail.themeColors[0];
    const accent = detail.themeColors[1];
    const palette = generatePalette(primary, accent);
    const isDark = isDarkBackground(detail.themeColors);

    // Write to cache
    setCachedPalette(detail.slug, detail.mtime, { palette, isDark });

    return { palette, isDark, source: "template" };
  }

  // 3. Fallback: universal preset
  const fallbackPrimary = colorOverride?.[0] || "#485275";
  const palette = findBestPresetPalette(fallbackPrimary);
  const isDark = isDarkBackground(palette);
  return {
    palette,
    isDark,
    source: "preset",
  };
}
