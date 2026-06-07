import type { ChartData, ChartType } from "./validate-data.js";

export interface Recommendation {
  type: ChartType;
  reason: string;
  suitability: "best" | "good" | "possible";
}

export function recommendChartTypes(
  data: ChartData,
  purpose?: string,
): Recommendation[] {
  const { categories, series } = data;
  const catCount = categories.length;
  const seriesCount = series.length;
  const results: Recommendation[] = [];

  const timePattern = /(月|季度|Q\d|年|周|日|hour|day|month|year|quarter)/i;
  const isTimeSeries = categories.some(c => timePattern.test(c)) || purpose?.includes("趋势");

  const hasPercentage = series.some(s =>
    s.values.every(v => v >= 0 && v <= 100) &&
    s.values.reduce((a, b) => a + b, 0) > 90 &&
    s.values.reduce((a, b) => a + b, 0) < 120
  );
  const singleSeriesTotal = series[0]?.values.reduce((a, b) => a + b, 0) || 0;
  const isProportion = hasPercentage ||
    (seriesCount === 1 && singleSeriesTotal > 0 && singleSeriesTotal <= 150);

  const isComparison = seriesCount >= 2 && catCount >= 2;

  if (isTimeSeries && isComparison) {
    results.push({ type: "line", reason: `时间序列对比（${catCount}个时间点 × ${seriesCount}个维度），折线趋势最直观`, suitability: "best" });
    results.push({ type: "bar", reason: "也可用分组柱状图展示各时间点对比", suitability: "good" });
  } else if (isTimeSeries && seriesCount === 1) {
    results.push({ type: "line", reason: `单一时间序列（${catCount}个时间点），折线看趋势`, suitability: "best" });
    results.push({ type: "bar", reason: "也可用柱状图逐月对比", suitability: "good" });
  } else if (isProportion && catCount <= 10) {
    results.push({ type: "pie", reason: `占比分布（${catCount}项），饼图展示构成`, suitability: "best" });
    results.push({ type: "bar", reason: "条形图对比更精确", suitability: "good" });
  } else if (isComparison && catCount <= 20) {
    results.push({ type: "bar", reason: `分组对比（${catCount}项 × ${seriesCount}维度），柱状图最清晰`, suitability: "best" });
    if (seriesCount >= 3) {
      results.push({ type: "radar", reason: "多维度可用雷达图展现整体轮廓", suitability: "possible" });
    }
  } else if (catCount <= 15 && seriesCount >= 1) {
    results.push({ type: "bar", reason: `柱状图通用可靠，${catCount}个分类清晰可辨`, suitability: "best" });
  } else if (catCount > 20) {
    results.push({ type: "bar", reason: `横向条形图可容纳${catCount}个分类`, suitability: "best" });
    results.push({ type: "heatmap", reason: "数据量大时热力图可替代", suitability: "possible" });
  } else {
    results.push({ type: "bar", reason: "柱状图通用可靠", suitability: "best" });
    results.push({ type: "pie", reason: "如为占比可选饼图", suitability: "possible" });
  }

  return results;
}
