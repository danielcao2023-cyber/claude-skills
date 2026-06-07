import { mkdirSync, writeFileSync, statSync } from "fs";
import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";

export interface RenderRiveParams {
  rivUrl: string;
  templateSlug: string;
  artboard?: string;
  animation?: string;
  frame?: number;
  colorOverride?: string[];
  outputDir: string;
  filename: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface RenderRiveResult {
  success: boolean;
  pngPath?: string;
  pngSize?: string;
  dimensions?: string;
  metadata?: { artboards?: string[]; animations?: string[] };
  error?: string;
}

export async function renderRiveAnimation(params: RenderRiveParams): Promise<RenderRiveResult> {
  const {
    rivUrl, templateSlug, artboard, animation, frame = 0,
    colorOverride, outputDir, filename,
    width = 1920, height = 1080, scale = 2,
  } = params;

  const { palette, isDark } = resolvePalette(templateSlug, colorOverride);
  const bgColor = isDark ? "#1a1a2e" : palette[3] || "#F5F5F8";
  const html = buildRiveHtml(rivUrl, bgColor, width, height, artboard, animation, frame);

  try {
    const pngBuffer = await renderWithRetry(async (page) => {
      await page.setViewport({
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
        deviceScaleFactor: scale,
      });
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
      // Wait for rive to render
      await page.waitForFunction(
        () => (window as unknown as Record<string, unknown>).__rive_rendered === true,
        { timeout: 15000 },
      );
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
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

function buildRiveHtml(
  rivUrl: string,
  bgColor: string,
  width: number,
  height: number,
  artboard?: string,
  animation?: string,
  frame?: number,
): string {
  const artboardParam = artboard ? `, artboard: "${artboard}"` : "";
  const animationParam = animation ? `, animation: "${animation}"` : "";
  const autoPlay = frame === 0 ? "true" : "false";
  const scrubLine = frame !== undefined && frame > 0
    ? `try { riveInst.scrollToTimestamp(${(frame / 60).toFixed(3)}); } catch(e) {} window.__rive_rendered = true;`
    : `window.__rive_rendered = true;`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${width}px;height:${height}px;background:${bgColor};overflow:hidden;display:flex;align-items:center;justify-content:center}
canvas{max-width:100%;max-height:100%}
</style></head><body>
<script src="https://unpkg.com/@rive-app/canvas@2.21.0/rive.js"></script>
<canvas id="riveCanvas"></canvas>
<script>
(function() {
  try {
    new rive.Rive({
      src: "${rivUrl}",
      canvas: document.getElementById("riveCanvas"),
      autoplay: ${autoPlay},${artboardParam}${animationParam}
      onLoad: function() {
        ${scrubLine}
      },
      onLoadError: function(err) {
        window.__rive_rendered = true;
      }
    });
  } catch(e) {
    window.__rive_rendered = true;
  }
})();
</script></body></html>`;
}
