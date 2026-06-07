import { z } from "zod";
import { generateSplinePreview } from "../preview/spline-preview.js";

const schema = z.object({
  scene_url: z.string().url(),
  template_slug: z.string(),
});

export const previewSplineSceneTool = {
  name: "preview_spline_scene",
  description: "验证 Spline 场景 URL 并提取缩略图信息",
  inputSchema: {
    type: "object",
    properties: {
      scene_url: { type: "string", description: "Spline 场景分享 URL（如 https://my.spline.com/...）" },
      template_slug: { type: "string", description: "PPT 模板 slug" },
    },
    required: ["scene_url", "template_slug"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const preview = await generateSplinePreview(p.scene_url, p.template_slug);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          isValid: preview.isValid,
          sceneId: preview.sceneId,
          previewUrl: preview.previewUrl,
          error: preview.error,
        }, null, 2),
      }],
    };
  },
};
