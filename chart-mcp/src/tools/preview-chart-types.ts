import { validateChartData, type ChartData } from "../chart-intelligence/validate-data.js";
import { recommendChartTypes } from "../chart-intelligence/recommend-type.js";
import { generateChartPreviews } from "../preview/echarts-preview.js";

export const previewChartTypesTool = {
  name: "preview_chart_types",
  description: "根据数据特征推荐最佳图表类型，并生成缩略图预览供用户选择",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "object", description: "图表数据: { categories: string[], series: {name:string, values:number[]}[] }" },
      purpose: { type: "string", description: "图表用途，如 '月度销售趋势' '市场占比'" },
      template_slug: { type: "string", description: "当前选用的 PPT 模板 slug" },
    },
    required: ["data", "template_slug"],
  },
  handler: async (args: { data: ChartData; purpose?: string; template_slug: string }) => {
    const validation = validateChartData(args.data, "bar");
    if (!validation.valid) {
      return { content: [{ type: "text", text: `数据校验失败: ${validation.errors.join("; ")}` }], isError: true };
    }
    const recommendations = recommendChartTypes(args.data, args.purpose);
    const top3 = recommendations.slice(0, 3);
    const previews = await generateChartPreviews(
      args.data,
      top3.map(r => ({ type: r.type, label: `${r.type} — ${r.reason}`, reason: r.reason })),
      args.template_slug,
    );
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          recommendations: top3,
          preview_count: previews.length,
        }, null, 2),
      }],
    };
  },
};
