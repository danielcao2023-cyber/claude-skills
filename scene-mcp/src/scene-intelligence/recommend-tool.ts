import type { SceneTool } from "./validate-params.js";

export interface ToolRecommendation {
  tool: SceneTool;
  reason: string;
  suitability: "best" | "good" | "possible";
  presetSceneTypes: string[];
}

export function recommendSceneTool(
  slideRole: string,
  description?: string,
): ToolRecommendation[] {
  const desc = (description || "").toLowerCase();
  const role = slideRole.toLowerCase();

  // Cover slides: 3D text, abstract geometry, particles
  if (role === "cover" || desc.includes("封面")) {
    return [
      { tool: "three_js", reason: "3D 文字或几何场景打造震撼封面", suitability: "best", presetSceneTypes: ["text_3d", "geometry", "abstract_waves"] },
      { tool: "spline", reason: "预制 Spline 3D 场景，快速出效果", suitability: "good", presetSceneTypes: [] },
      { tool: "rive", reason: "动画 Logo 或动态装饰元素", suitability: "possible", presetSceneTypes: [] },
    ];
  }

  // Process / flow slides: physics, animations
  if (desc.includes("流程") || desc.includes("过程") || desc.includes("步骤") || role === "agenda") {
    return [
      { tool: "matter_js", reason: "物理模拟展现流程动态感", suitability: "best", presetSceneTypes: ["gravity_fall", "collision"] },
      { tool: "rive", reason: "交互动画展示步骤流转", suitability: "good", presetSceneTypes: [] },
    ];
  }

  // Product showcase
  if (desc.includes("产品") || desc.includes("展示") || desc.includes("模型")) {
    return [
      { tool: "three_js", reason: "3D 产品旋转展示", suitability: "best", presetSceneTypes: ["product_rotation", "geometry"] },
      { tool: "spline", reason: "Spline 3D 产品模型嵌入", suitability: "best", presetSceneTypes: [] },
    ];
  }

  // Ending slides
  if (role === "ending" || desc.includes("结尾") || desc.includes("谢谢") || desc.includes("感谢")) {
    return [
      { tool: "three_js", reason: "粒子或抽象波浪打造优雅结尾", suitability: "best", presetSceneTypes: ["particles", "abstract_waves"] },
      { tool: "rive", reason: "动画感谢页面", suitability: "good", presetSceneTypes: [] },
    ];
  }

  // Section dividers
  if (role === "section_divider") {
    return [
      { tool: "three_js", reason: "抽象几何体做章节过渡", suitability: "best", presetSceneTypes: ["geometry", "particles"] },
      { tool: "matter_js", reason: "趣味物理效果做过渡", suitability: "possible", presetSceneTypes: ["collision"] },
    ];
  }

  // Content slides with data/numbers → maybe physics or 3D
  if (desc.includes("数据") || desc.includes("增长") || desc.includes("趋势")) {
    return [
      { tool: "three_js", reason: "3D 数据可视化增强", suitability: "good", presetSceneTypes: ["particles", "abstract_waves"] },
      { tool: "matter_js", reason: "物理粒子模拟数据流动", suitability: "possible", presetSceneTypes: ["fluid"] },
    ];
  }

  // Default
  return [
    { tool: "three_js", reason: "通用 3D 场景，适配多数场合", suitability: "best", presetSceneTypes: ["particles", "geometry", "abstract_waves"] },
    { tool: "matter_js", reason: "趣味物理效果，适合轻松场合", suitability: "good", presetSceneTypes: ["gravity_fall", "collision"] },
    { tool: "rive", reason: "动画元素增加活力", suitability: "possible", presetSceneTypes: [] },
  ];
}
