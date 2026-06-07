import { z } from "zod";
import { generateMatterPreviews } from "../preview/matter-preview.js";
import type { MatterSceneType } from "../renderer/matter-renderer.js";

const VALID_MATTER_TYPES = ["gravity_fall", "collision", "pendulum", "cloth", "fluid"] as const;

const schema = z.object({
  template_slug: z.string(),
  scene_types: z.array(z.enum(VALID_MATTER_TYPES)).optional(),
});

export const previewPhysicsPresetsTool = {
  name: "preview_physics_presets",
  description: "生成 5 种 matter.js 物理场景的缩略图预览（重力堆积/牛顿摆/多摆系统/布料模拟/流体粒子）",
  inputSchema: {
    type: "object",
    properties: {
      template_slug: { type: "string", description: "PPT 模板 slug" },
      scene_types: {
        type: "array",
        items: { type: "string", enum: VALID_MATTER_TYPES as unknown as string[] },
        description: "要预览的场景类型列表，默认全部 5 种",
      },
    },
    required: ["template_slug"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const previews = await generateMatterPreviews(
      p.template_slug,
      p.scene_types as MatterSceneType[] | undefined,
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
