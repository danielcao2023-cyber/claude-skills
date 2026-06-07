import { z } from "zod";
import { renderSplineScene } from "../renderer/spline-renderer.js";
import { validateSceneParams } from "../scene-intelligence/validate-params.js";

const schema = z.object({
  scene_url: z.string().url(),
  template_slug: z.string(),
  zoom: z.number().min(0.5).max(3).optional(),
  color_override: z.array(z.string()).optional(),
  output_dir: z.string(),
  filename: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export const renderSplineSceneTool = {
  name: "render_spline_scene",
  description: "渲染 Spline 3D 场景为高清 PNG（@2x）。需要用户提供 Spline 分享 URL。",
  inputSchema: {
    type: "object",
    properties: {
      scene_url: { type: "string", description: "Spline 场景分享 URL" },
      template_slug: { type: "string" },
      zoom: { type: "number", description: "缩放级别 0.5-3" },
      color_override: { type: "array", items: { type: "string" } },
      output_dir: { type: "string" },
      filename: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      scale: { type: "number" },
    },
    required: ["scene_url", "template_slug", "output_dir", "filename"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const v = validateSceneParams("spline", { scene_url: p.scene_url, zoom: p.zoom });
    if (!v.valid) {
      return { content: [{ type: "text", text: `参数校验失败: ${v.errors.join("; ")}` }], isError: true };
    }
    const result = await renderSplineScene({
      sceneUrl: p.scene_url,
      templateSlug: p.template_slug,
      zoom: p.zoom,
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
