import { z } from "zod";
import { renderPhysicsScene, type MatterSceneType } from "../renderer/matter-renderer.js";
import { validateSceneParams } from "../scene-intelligence/validate-params.js";

const schema = z.object({
  scene_type: z.enum(["gravity_fall", "collision", "pendulum", "cloth", "fluid"]),
  template_slug: z.string(),
  duration_seconds: z.number().min(1).max(10).optional(),
  color_override: z.array(z.string()).optional(),
  output_dir: z.string(),
  filename: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export const renderPhysicsSceneTool = {
  name: "render_physics_scene",
  description: "渲染 matter.js 物理模拟场景为高清 PNG（@2x）。运行物理引擎 N 秒后截图。支持重力堆积/碰撞/摆/布料/流体。",
  inputSchema: {
    type: "object",
    properties: {
      scene_type: { type: "string", enum: ["gravity_fall", "collision", "pendulum", "cloth", "fluid"] },
      template_slug: { type: "string" },
      duration_seconds: { type: "number", description: "物理运行时长（秒），默认 3" },
      color_override: { type: "array", items: { type: "string" } },
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
    const v = validateSceneParams("matter_js", { scene_type: p.scene_type, duration_seconds: p.duration_seconds ?? 3 });
    if (!v.valid) {
      return { content: [{ type: "text", text: `参数校验失败: ${v.errors.join("; ")}` }], isError: true };
    }
    const result = await renderPhysicsScene({
      sceneType: p.scene_type as MatterSceneType,
      templateSlug: p.template_slug,
      durationSeconds: p.duration_seconds,
      colorOverride: p.color_override,
      outputDir: p.output_dir,
      filename: p.filename,
      width: p.width,
      height: p.height,
      scale: p.scale,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
