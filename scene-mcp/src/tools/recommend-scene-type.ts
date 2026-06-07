import { recommendSceneTool } from "../scene-intelligence/recommend-tool.js";

export const recommendSceneTypeTool = {
  name: "recommend_scene_type",
  description: "根据 slide 角色和用户描述推荐最佳 3D/动画工具（three.js / Spline / rive / matter.js）",
  inputSchema: {
    type: "object",
    properties: {
      slide_role: { type: "string", description: "slide 角色: cover / agenda / section_divider / content / ending" },
      description: { type: "string", description: "用户对 slide 内容的描述" },
    },
    required: ["slide_role"],
  },
  handler: async (args: { slide_role: string; description?: string }) => {
    const recommendations = recommendSceneTool(args.slide_role, args.description);
    return {
      content: [{ type: "text", text: JSON.stringify({ recommendations }, null, 2) }],
    };
  },
};
