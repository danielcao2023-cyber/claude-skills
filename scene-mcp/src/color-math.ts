export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function hexToHsl(hex: string): HSL {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(hsl: HSL): string {
  const s = hsl.s / 100, l = hsl.l / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hsl.h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** 生成一个主色的深浅变体调色板（5 色） */
export function generatePalette(primaryHex: string, accentHex?: string): string[] {
  const primary = hexToHsl(primaryHex);
  const palette: string[] = [primaryHex];
  palette.push(hslToHex({ ...primary, s: Math.max(0, primary.s - 30), l: Math.min(95, primary.l + 15) }));
  palette.push(hslToHex({ ...primary, s: Math.max(0, primary.s - 50), l: Math.min(95, primary.l + 25) }));
  palette.push(hslToHex({ ...primary, s: Math.max(0, primary.s - 65), l: Math.min(95, primary.l + 35) }));
  if (accentHex) {
    palette.push(accentHex);
  } else {
    palette.push(hslToHex({ ...primary, l: Math.max(5, primary.l - 15) }));
  }
  return palette;
}

/** 判断 hex 是否为深色 */
export function isDarkColor(hex: string): boolean {
  const hsl = hexToHsl(hex);
  return hsl.l < 30;
}

/** 判断模板背景是否为暗色 */
export function isDarkBackground(themeColors: string[]): boolean {
  const bgHex = themeColors[themeColors.length - 1] || themeColors[0];
  return isDarkColor(bgHex);
}
