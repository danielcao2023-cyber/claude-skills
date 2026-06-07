import { validateSceneParams } from "../scene-intelligence/validate-params.js";
import type { SceneTool } from "../scene-intelligence/validate-params.js";

export const validateSceneParamsTool = {
  name: "validate_scene_params",
  description: "校验场景参数格式和工具类型的合法性",
  inputSchema: {
    type: "object",
    properties: {
      tool: { type: "string", description: "工具类型: three_js | spline | rive | matter_js" },
      params: { type: "object", description: "该工具的参数" },
    },
    required: ["tool", "params"],
  },
  handler: async (args: { tool: string; params: unknown }) => {
    const result = validateSceneParams(args.tool as SceneTool, args.params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
