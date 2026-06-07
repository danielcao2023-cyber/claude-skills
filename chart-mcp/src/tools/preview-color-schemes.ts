import { resolvePalette } from "../theme/template-palette.js";
import { generateChartPreviews } from "../preview/echarts-preview.js";
import { UNIVERSAL_PALETTES } from "../theme/presets.js";
import type { ChartData, ChartType } from "../chart-intelligence/validate-data.js";

export const previewColorSchemesTool = {
  name: "preview_color_schemes",
  description: "生成 3 种配色方案的图表预览，供用户选择：模板主色 / 暖色调 / 对比色",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "object" },
      chart_type: { type: "string" },
      template_slug: { type: "string" },
    },
    required: ["data", "chart_type", "template_slug"],
  },
  handler: async (args: { data: ChartData; chart_type: string; template_slug: string }) => {
    const schemes = [
      { label: "模板主色", palette: resolvePalette(args.template_slug).palette },
      { label: "暖色调", palette: UNIVERSAL_PALETTES["warm-orange"] },
      { label: "对比色", palette: UNIVERSAL_PALETTES["dark-mode"] },
    ];
    const previews = [];
    for (const scheme of schemes) {
      const p = await generateChartPreviews(args.data, [{
        type: args.chart_type as ChartType,
        label: scheme.label,
        reason: `色板: ${scheme.palette.slice(0, 3).join(", ")}`,
      }], args.template_slug);
      previews.push({ scheme: scheme.label, palette: scheme.palette, hasPreview: p[0]?.pngBase64.length > 0 });
    }
    return { content: [{ type: "text", text: JSON.stringify({ schemes: previews }, null, 2) }] };
  },
};
