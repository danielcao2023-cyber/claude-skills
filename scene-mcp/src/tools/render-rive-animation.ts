import { z } from "zod";
import { renderRiveAnimation } from "../renderer/rive-renderer.js";
import { validateSceneParams } from "../scene-intelligence/validate-params.js";

const schema = z.object({
  riv_url: z.string().url(),
  template_slug: z.string(),
  artboard: z.string().optional(),
  animation: z.string().optional(),
  frame: z.number().int().min(0).optional(),
  color_override: z.array(z.string()).optional(),
  output_dir: z.string(),
  filename: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export const renderRiveAnimationTool = {
  name: "render_rive_animation",
  description: "渲染 rive 矢量动画为高清 PNG（@2x）。支持指定画板、动画和帧号。",
  inputSchema: {
    type: "object",
    properties: {
      riv_url: { type: "string", description: ".riv 动画文件 URL" },
      template_slug: { type: "string" },
      artboard: { type: "string", description: "画板名称（可选）" },
      animation: { type: "string", description: "动画名称（可选）" },
      frame: { type: "integer", description: "要截取的帧号，默认 0（首帧）" },
      color_override: { type: "array", items: { type: "string" } },
      output_dir: { type: "string" },
      filename: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      scale: { type: "number" },
    },
    required: ["riv_url", "template_slug", "output_dir", "filename"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const v = validateSceneParams("rive", { riv_url: p.riv_url, artboard: p.artboard, animation: p.animation, frame: p.frame });
    if (!v.valid) {
      return { content: [{ type: "text", text: `参数校验失败: ${v.errors.join("; ")}` }], isError: true };
    }
    const result = await renderRiveAnimation({
      rivUrl: p.riv_url,
      templateSlug: p.template_slug,
      artboard: p.artboard,
      animation: p.animation,
      frame: p.frame,
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
