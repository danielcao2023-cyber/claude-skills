import { z } from "zod";
import { generateThreePreviews } from "../preview/three-preview.js";
import type { ThreeSceneType } from "../renderer/three-renderer.js";

const VALID_THREE_TYPES = ["particles", "geometry", "product_rotation", "abstract_waves", "text_3d"] as const;

const schema = z.object({
  template_slug: z.string(),
  scene_types: z.array(z.enum(VALID_THREE_TYPES)).optional(),
});

export const previewThreePresetsTool = {
  name: "preview_three_presets",
  description: "生成 5 种 three.js 预设场景的缩略图预览（粒子/几何体/产品展台/波形平面/3D文字）",
  inputSchema: {
    type: "object",
    properties: {
      template_slug: { type: "string", description: "PPT 模板 slug" },
      scene_types: {
        type: "array",
        items: { type: "string", enum: VALID_THREE_TYPES as unknown as string[] },
        description: "要预览的场景类型列表，默认全部 5 种",
      },
    },
    required: ["template_slug"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const previews = await generateThreePreviews(
      p.template_slug,
      p.scene_types as ThreeSceneType[] | undefined,
    );
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          previews: previews.map(pre => ({
            sceneType: pre.sceneType,
            label: pre.label,
            description: pre.description,
            pngBase64: pre.pngBase64.substring(0, 60) + "...",
          })),
        }, null, 2),
      }],
    };
  },
};
