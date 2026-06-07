import { mkdirSync, writeFileSync, statSync } from "fs";
import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";

export interface RenderSplineParams {
  sceneUrl: string;
  templateSlug: string;
  zoom?: number;
  colorOverride?: string[];
  outputDir: string;
  filename: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface RenderSplineResult {
  success: boolean;
  pngPath?: string;
  pngSize?: string;
  dimensions?: string;
  sceneUrl?: string;
  error?: string;
}

export async function renderSplineScene(params: RenderSplineParams): Promise<RenderSplineResult> {
  const {
    sceneUrl, templateSlug, zoom = 1, colorOverride,
    outputDir, filename, width = 1920, height = 1080, scale = 2,
  } = params;

  const { isDark } = resolvePalette(templateSlug, colorOverride);
  const bgColor = isDark ? "#1a1a2e" : "#F5F5F8";
  const html = buildSplineHtml(sceneUrl, bgColor, zoom, width, height);

  try {
    const pngBuffer = await renderWithRetry(async (page) => {
      await page.setViewport({
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
        deviceScaleFactor: scale,
      });
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
      // Wait for Spline viewer to load
      await page.waitForFunction(
        () => {
          const sv = document.querySelector("spline-viewer");
          return sv && (sv as HTMLElement).shadowRoot?.querySelector("canvas");
        },
        { timeout: 20000 },
      ).catch(() => {
        // Spline viewer may not use shadow DOM; fallback to waiting for <canvas>
      });
      // Extra wait for render
      await new Promise(r => setTimeout(r, 3000));
      return Buffer.from(await page.screenshot({ type: "png", fullPage: false }));
    });

    mkdirSync(outputDir, { recursive: true });
    const pngPath = `${outputDir}/${filename}.png`;
    writeFileSync(pngPath, pngBuffer);
    const fileStat = statSync(pngPath);
    const sizeKB = Math.round(fileStat.size / 1024);

    return {
      success: true,
      pngPath,
      pngSize: `${sizeKB}KB`,
      dimensions: `${Math.ceil(width * scale)}×${Math.ceil(height * scale)}`,
      sceneUrl,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

function buildSplineHtml(
  sceneUrl: string,
  bgColor: string,
  zoom: number,
  width: number,
  height: number,
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${width}px;height:${height}px;background:${bgColor};overflow:hidden}
spline-viewer{width:100%;height:100%;display:block}
</style></head><body>
<script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.0/build/spline-viewer.js"></script>
<spline-viewer
  url="${sceneUrl}"
  background="${bgColor}"
  zoom="${zoom}"
  loading="eager"
></spline-viewer>
</body></html>`;
}
