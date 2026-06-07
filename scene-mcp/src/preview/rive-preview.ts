import { renderWithRetry } from "../browser-pool.js";

export interface RivePreviewInfo {
  rivUrl: string;
  isValid: boolean;
  firstFramePreview?: string;
  animations?: string[];
  error?: string;
}

export async function generateRivePreview(
  rivUrl: string,
  templateSlug?: string,
): Promise<RivePreviewInfo> {
  // Quick fetch check for the .riv file
  try {
    const response = await fetch(rivUrl, { method: "HEAD" });
    if (!response.ok) {
      return {
        rivUrl,
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (e) {
    return {
      rivUrl,
      isValid: false,
      error: `Cannot reach URL: ${(e as Error).message}`,
    };
  }

  // Render first frame as preview using Puppeteer
  try {
    const pngBase64 = await renderPreviewPng(rivUrl);
    return {
      rivUrl,
      isValid: true,
      firstFramePreview: pngBase64,
    };
  } catch {
    return {
      rivUrl,
      isValid: true,
      firstFramePreview: "",
    };
  }
}

async function renderPreviewPng(rivUrl: string): Promise<string> {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:800px;height:500px;background:#f5f5f8;overflow:hidden;display:flex;align-items:center;justify-content:center}
canvas{max-width:100%;max-height:100%}
</style></head><body>
<script src="https://unpkg.com/@rive-app/canvas@2.21.0/rive.js"></script>
<canvas id="c"></canvas>
<script>
(function(){
try{new rive.Rive({src:"${rivUrl}",canvas:document.getElementById("c"),autoplay:false,
onLoad:function(){window.__rive_rendered=true;},onLoadError:function(){window.__rive_rendered=true;}});}catch(e){window.__rive_rendered=true;}
})();
</script></body></html>`;

  const buffer = await renderWithRetry(async (page) => {
    await page.setViewport({ width: 800, height: 500, deviceScaleFactor: 1 });
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      () => (window as unknown as Record<string, unknown>).__rive_rendered === true,
      { timeout: 12000 },
    );
    return Buffer.from(await page.screenshot({ type: "png" }));
  });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
