import { z } from "zod";
import { generateRivePreview } from "../preview/rive-preview.js";

const schema = z.object({
  riv_url: z.string().url(),
  template_slug: z.string().optional(),
});

export const previewRiveAnimationTool = {
  name: "preview_rive_animation",
  description: "验证 .riv 动画文件 URL 并渲染首帧预览",
  inputSchema: {
    type: "object",
    properties: {
      riv_url: { type: "string", description: ".riv 动画文件 URL" },
      template_slug: { type: "string", description: "PPT 模板 slug（可选）" },
    },
    required: ["riv_url"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const preview = await generateRivePreview(p.riv_url, p.template_slug);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          isValid: preview.isValid,
          firstFramePreview: preview.firstFramePreview?.substring(0, 60) + "...",
          animations: preview.animations,
          error: preview.error,
        }, null, 2),
      }],
    };
  },
};
