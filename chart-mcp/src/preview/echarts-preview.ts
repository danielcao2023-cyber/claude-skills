import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";
import type { ChartData, ChartType } from "../chart-intelligence/validate-data.js";

export interface PreviewSpec {
  type: ChartType;
  label: string;
  reason: string;
  pngBase64: string;
}

export async function generateChartPreviews(
  data: ChartData,
  types: Array<{ type: ChartType; label: string; reason: string }>,
  templateSlug: string,
): Promise<PreviewSpec[]> {
  const { palette, echartsTheme, isDark } = resolvePalette(templateSlug);
  const results: PreviewSpec[] = [];

  for (const t of types) {
    try {
      const pngBase64 = await renderPreviewPng(data, t.type, palette, echartsTheme, isDark);
      results.push({ ...t, pngBase64 });
    } catch {
      results.push({ ...t, pngBase64: "" });
    }
  }
  return results;
}

async function renderPreviewPng(
  data: ChartData, chartType: ChartType,
  palette: string[], theme: Record<string, unknown>, isDark: boolean,
): Promise<string> {
  const option = buildPreviewOption(data, chartType, palette);
  const html = buildPreviewHtml(option, theme, isDark);
  const buffer = await renderWithRetry(async (page) => {
    await page.setViewport({ width: 800, height: 500, deviceScaleFactor: 1 });
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      () => (window as unknown as Record<string, unknown>).__echarts_rendered === true,
      { timeout: 8000 },
    );
    return Buffer.from(await page.screenshot({ type: "png" }));
  });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function buildPreviewOption(
  data: ChartData, chartType: ChartType, palette: string[],
): Record<string, unknown> {
  if (chartType === "pie") {
    return {
      color: palette,
      series: [{
        type: "pie", radius: ["40%", "70%"],
        data: data.categories.map((name, i) => ({ name, value: data.series[0]?.values[i] ?? 0 })),
        label: { fontSize: 10, formatter: "{b}" },
      }],
    };
  }
  return {
    color: palette,
    grid: { left: "8%", right: "4%", top: "10%", bottom: "10%" },
    xAxis: {
      type: "category", data: data.categories,
      axisLabel: { fontSize: 9, rotate: data.categories.length > 8 ? 30 : 0 },
    },
    yAxis: { type: "value", axisLabel: { fontSize: 9 } },
    series: data.series.map(s => ({
      name: s.name, type: chartType, data: s.values,
      ...(chartType === "line" ? { smooth: true, symbol: "circle", symbolSize: 3 } : {}),
    })),
    legend: data.series.length > 1 ? { bottom: 0, textStyle: { fontSize: 10 } } : undefined,
  };
}

function buildPreviewHtml(
  option: Record<string, unknown>, theme: Record<string, unknown>, isDark: boolean,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:800px;height:500px;background:${isDark ? "#1a1a2e" : "#FFFFFF"};overflow:hidden}
#chart{width:100%;height:100%}
</style></head><body><div id="chart"></div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
<script>
(function(){
echarts.registerTheme('preview', ${JSON.stringify(theme)});
var c=echarts.init(document.getElementById('chart'),'preview');
c.setOption(${JSON.stringify(option)});
window.__echarts_rendered=true;c.on('finished',function(){window.__echarts_rendered=true;});
})();
</script></body></html>`;
}
