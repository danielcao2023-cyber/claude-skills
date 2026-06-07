import { validateChartData } from "../chart-intelligence/validate-data.js";

export const validateChartDataTool = {
  name: "validate_chart_data",
  description: "校验图表数据格式和 chart_type 合法性，返回具体问题",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "object", description: "图表数据 { categories, series }" },
      chart_type: { type: "string", description: "bar | line | pie | scatter | radar | funnel | heatmap" },
    },
    required: ["data", "chart_type"],
  },
  handler: async (args: { data: unknown; chart_type: string }) => {
    const result = validateChartData(args.data, args.chart_type);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
