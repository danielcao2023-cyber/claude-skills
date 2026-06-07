import { z } from "zod";

const SeriesSchema = z.object({
  name: z.string().min(1).max(50),
  values: z.array(z.number()).min(1).max(200),
});

const ChartDataSchema = z.object({
  categories: z.array(z.string().min(1).max(100)).min(1).max(200),
  series: z.array(SeriesSchema).min(1).max(10),
});

export const VALID_CHART_TYPES = ["bar", "line", "pie", "scatter", "radar", "funnel", "heatmap"] as const;

export type ChartType = (typeof VALID_CHART_TYPES)[number];

export interface ChartData {
  categories: string[];
  series: { name: string; values: number[] }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateChartData(
  data: unknown,
  chartType: string,
): ValidationResult {
  const result: ValidationResult = { valid: false, errors: [], warnings: [] };

  if (!VALID_CHART_TYPES.includes(chartType as ChartType)) {
    result.errors.push(`Invalid chart_type "${chartType}". Valid: ${VALID_CHART_TYPES.join(", ")}`);
    return result;
  }

  const parsed = ChartDataSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      result.errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return result;
  }

  const d = parsed.data;

  if (chartType === "pie" && d.series.length > 1) {
    result.warnings.push("饼图只支持单个 series，将使用第一个 series");
  }

  if (chartType === "scatter" && d.categories.length === 0) {
    result.warnings.push("散点图建议有 categories 作为标签");
  }

  if (d.categories.length > 50 && chartType === "bar") {
    result.warnings.push(`柱状图有 ${d.categories.length} 个分类，可能会拥挤，建议 ≤20`);
  }

  const allZero = d.series.every(s => s.values.every(v => v === 0));
  if (allZero) {
    result.warnings.push("所有数据值都为 0，图表将为空");
  }

  for (let i = 0; i < d.series.length; i++) {
    if (d.series[i].values.length !== d.categories.length) {
      result.errors.push(
        `series[${i}]("${d.series[i].name}") values 长度(${d.series[i].values.length}) ` +
        `与 categories 长度(${d.categories.length})不匹配`
      );
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
