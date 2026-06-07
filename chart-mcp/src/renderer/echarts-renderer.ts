import { mkdirSync, writeFileSync, statSync } from "fs";
import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";
import type { ChartData, ChartType } from "../chart-intelligence/validate-data.js";

export interface RenderEchartsParams {
  data: ChartData;
  templateSlug: string;
  chartType: ChartType;
  title: string;
  orientation?: "vertical" | "horizontal";
  sort?: "ascending" | "descending" | "none";
  colorOverride?: string[];
  outputDir: string;
  filename: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface RenderEchartsResult {
  success: boolean;
  pngPath?: string;
  pngSize?: string;
  dimensions?: string;
  generatedOption?: Record<string, unknown>;
  colorPalette?: string[];
  error?: string;
}

export async function renderEcharts(params: RenderEchartsParams): Promise<RenderEchartsResult> {
  const {
    data, templateSlug, chartType, title, orientation, sort,
    colorOverride, outputDir, filename,
    width = 1920, height = 1080, scale = 2,
  } = params;

  const { palette, echartsTheme, isDark } = resolvePalette(templateSlug, colorOverride);
  const option = buildEchartsOption(data, chartType, title, palette, isDark, orientation, sort);
  const html = buildRenderHtml(option, echartsTheme, palette, width, height, isDark);

  try {
    const pngBuffer = await renderWithRetry(async (page) => {
      await page.setViewport({
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
        deviceScaleFactor: scale,
      });
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
      await page.waitForFunction(
        () => (window as unknown as Record<string, unknown>).__echarts_rendered === true,
        { timeout: 10000 },
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
      generatedOption: option,
      colorPalette: palette,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message, colorPalette: palette };
  }
}

function buildEchartsOption(
  data: ChartData,
  chartType: ChartType,
  title: string,
  palette: string[],
  isDark: boolean,
  orientation?: string,
  _sort?: string,
): Record<string, unknown> {
  const isHorizontal = chartType === "bar" && orientation === "horizontal";
  const textColor = isDark ? "#c0c0c0" : palette[4] || "#555";
  const axisLabelColor = isDark ? "#a0a0a0" : palette[4] || "#666";

  const baseOption: Record<string, unknown> = {
    title: {
      text: title,
      left: "center",
      top: 20,
      textStyle: { color: palette[0], fontSize: 24, fontWeight: "bold" },
    },
    tooltip: { trigger: chartType === "pie" ? "item" : "axis" },
    color: palette,
  };

  if (chartType === "pie") {
    const pieData = data.categories.map((name, i) => ({
      name,
      value: data.series[0]?.values[i] ?? 0,
    }));
    return {
      ...baseOption,
      series: [{
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "55%"],
        data: pieData,
        label: { formatter: "{b}: {d}%" },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" } },
      }],
    };
  }

  const xKey = isHorizontal ? "yAxis" : "xAxis";
  const yKey = isHorizontal ? "xAxis" : "yAxis";

  return {
    ...baseOption,
    legend: data.series.length > 1 ? {
      data: data.series.map(s => s.name),
      bottom: 10,
      textStyle: { color: textColor },
    } : undefined,
    grid: {
      left: "3%", right: "4%",
      bottom: data.series.length > 1 ? "12%" : "8%",
      top: "18%", containLabel: true,
    },
    [xKey]: {
      type: "category",
      data: data.categories,
      axisLabel: {
        rotate: data.categories.length > 8 ? 45 : 0,
        color: axisLabelColor,
      },
    },
    [yKey]: { type: "value", axisLabel: { color: axisLabelColor } },
    series: data.series.map(s => ({
      name: s.name,
      type: chartType === "line" ? "line" : "bar",
      data: s.values,
      ...(chartType === "line" ? { smooth: true, symbol: "circle", symbolSize: 6 } : {
        barMaxWidth: 60,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      }),
    })),
  };
}

function buildRenderHtml(
  option: Record<string, unknown>,
  echartsTheme: Record<string, unknown>,
  _palette: string[],
  width: number,
  height: number,
  isDark: boolean,
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${width}px;height:${height}px;background:${isDark ? "#1a1a2e" : "#FFFFFF"};overflow:hidden}
#chart{width:100%;height:100%}
</style></head><body>
<div id="chart"></div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
<script>
(function(){
  var theme = ${JSON.stringify(echartsTheme)};
  echarts.registerTheme('custom', theme);
  var chart = echarts.init(document.getElementById('chart'), 'custom');
  var option = ${JSON.stringify(option)};
  chart.setOption(option);
  window.__echarts_rendered = true;
  chart.on('finished', function(){ window.__echarts_rendered = true; });
})();
</script></body></html>`;
}
