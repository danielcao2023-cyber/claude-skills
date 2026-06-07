import { z } from "zod";
import { renderThreeScene, type ThreeSceneType } from "../renderer/three-renderer.js";
import { validateSceneParams } from "../scene-intelligence/validate-params.js";

const schema = z.object({
  scene_type: z.enum(["particles", "geometry", "product_rotation", "abstract_waves", "text_3d"]),
  template_slug: z.string(),
  color_override: z.array(z.string()).optional(),
  custom_description: z.string().optional(),
  output_dir: z.string(),
  filename: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export const renderThreeSceneTool = {
  name: "render_three_scene",
  description: "渲染 three.js 3D 场景为高清 PNG（@2x）。支持粒子/几何体/产品展台/波形平面/3D文字。自动从 PPT 模板提取主色。",
  inputSchema: {
    type: "object",
    properties: {
      scene_type: { type: "string", enum: ["particles", "geometry", "product_rotation", "abstract_waves", "text_3d"] },
      template_slug: { type: "string" },
      color_override: { type: "array", items: { type: "string" } },
      custom_description: { type: "string", description: "自定义描述（text_3d 场景用于显示文字）" },
      output_dir: { type: "string" },
      filename: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      scale: { type: "number" },
    },
    required: ["scene_type", "template_slug", "output_dir", "filename"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const v = validateSceneParams("three_js", { scene_type: p.scene_type, custom_description: p.custom_description });
    if (!v.valid) {
      return { content: [{ type: "text", text: `参数校验失败: ${v.errors.join("; ")}` }], isError: true };
    }
    const result = await renderThreeScene({
      sceneType: p.scene_type as ThreeSceneType,
      templateSlug: p.template_slug,
      colorOverride: p.color_override,
      customDescription: p.custom_description,
      outputDir: p.output_dir,
      filename: p.filename,
      width: p.width,
      height: p.height,
      scale: p.scale,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
