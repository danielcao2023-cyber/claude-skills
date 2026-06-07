import { z } from "zod";
import { renderEcharts } from "../renderer/echarts-renderer.js";
import { validateChartData } from "../chart-intelligence/validate-data.js";
import type { ChartType } from "../chart-intelligence/validate-data.js";

const schema = z.object({
  data: z.object({
    categories: z.array(z.string()),
    series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
  }),
  chart_type: z.enum(["bar","line","pie","scatter","radar","funnel","heatmap"]),
  title: z.string(),
  template_slug: z.string(),
  orientation: z.enum(["vertical","horizontal"]).optional(),
  sort: z.enum(["ascending","descending","none"]).optional(),
  color_override: z.array(z.string()).optional(),
  output_dir: z.string(),
  filename: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export const renderEchartsTool = {
  name: "render_echarts",
  description: "渲染 echarts 图表为高清 PNG（@2x）。自动从 PPT 模板提取主色生成配色。",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "object", description: "{ categories: string[], series: {name:string, values:number[]}[] }" },
      chart_type: { type: "string", enum: ["bar","line","pie","scatter","radar","funnel","heatmap"] },
      title: { type: "string" },
      template_slug: { type: "string" },
      orientation: { type: "string", enum: ["vertical","horizontal"] },
      sort: { type: "string", enum: ["ascending","descending","none"] },
      color_override: { type: "array", items: { type: "string" } },
      output_dir: { type: "string" },
      filename: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      scale: { type: "number" },
    },
    required: ["data","chart_type","title","template_slug","output_dir","filename"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const v = validateChartData(p.data, p.chart_type);
    if (!v.valid) return { content: [{ type: "text", text: `数据校验失败: ${v.errors.join("; ")}` }], isError: true };
    const result = await renderEcharts({
      data: p.data, templateSlug: p.template_slug, chartType: p.chart_type as ChartType,
      title: p.title, orientation: p.orientation, sort: p.sort,
      colorOverride: p.color_override, outputDir: p.output_dir, filename: p.filename,
      width: p.width, height: p.height, scale: p.scale,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
