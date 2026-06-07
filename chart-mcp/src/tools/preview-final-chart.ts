import { renderEcharts } from "../renderer/echarts-renderer.js";
import type { ChartData, ChartType } from "../chart-intelligence/validate-data.js";

export const previewFinalChartTool = {
  name: "preview_final_chart",
  description: "生成 1:1 预览图 PNG，供用户在最终渲染前确认效果",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "object" },
      chart_type: { type: "string" },
      title: { type: "string" },
      template_slug: { type: "string" },
      color_override: { type: "array", items: { type: "string" } },
    },
    required: ["data", "chart_type", "title", "template_slug"],
  },
  handler: async (args: { data: ChartData; chart_type: string; title: string; template_slug: string; color_override?: string[] }) => {
    const result = await renderEcharts({
      data: args.data,
      templateSlug: args.template_slug,
      chartType: args.chart_type as ChartType,
      title: args.title,
      colorOverride: args.color_override,
      outputDir: "/tmp/chart-mcp-previews",
      filename: `preview-${Date.now()}`,
      width: 1200, height: 675, scale: 1,
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: result.success,
          pngPath: result.pngPath,
          colorPalette: result.colorPalette,
          error: result.error,
        }, null, 2),
      }],
    };
  },
};
