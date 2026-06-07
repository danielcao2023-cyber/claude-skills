import { readDetailJson } from "../detail-reader.js";
import { generatePalette, isDarkBackground } from "../color-math.js";
import { buildEchartsTheme, findBestPresetPalette } from "./presets.js";
import { getCachedPalette, setCachedPalette } from "./cache.js";

export interface ResolvedPalette {
  palette: string[];
  echartsTheme: Record<string, unknown>;
  isDark: boolean;
  source: "template" | "preset" | "override";
}

export function resolvePalette(
  templateSlug: string,
  colorOverride?: string[],
): ResolvedPalette {
  if (colorOverride && colorOverride.length >= 2) {
    const isDark = isDarkBackground(colorOverride);
    return {
      palette: colorOverride,
      echartsTheme: buildEchartsTheme(colorOverride, isDark),
      isDark,
      source: "override",
    };
  }

  const detail = readDetailJson(templateSlug);
  if (detail && detail.themeColors.length >= 2) {
    const cached = getCachedPalette(detail.slug, detail.mtime);
    if (cached) {
      return {
        palette: cached.palette,
        echartsTheme: cached.echartsTheme,
        isDark: cached.isDark,
        source: "template",
      };
    }

    const primary = detail.themeColors[0];
    const accent = detail.themeColors[1];
    const palette = generatePalette(primary, accent);
    const isDark = isDarkBackground(detail.themeColors);
    const echartsTheme = buildEchartsTheme(palette, isDark);

    setCachedPalette(detail.slug, detail.mtime, { palette, echartsTheme, isDark });

    return { palette, echartsTheme, isDark, source: "template" };
  }

  const fallbackPrimary = colorOverride?.[0] || "#485275";
  const palette = findBestPresetPalette(fallbackPrimary);
  const isDark = isDarkBackground(palette);
  return {
    palette,
    echartsTheme: buildEchartsTheme(palette, isDark),
    isDark,
    source: "preset",
  };
}
