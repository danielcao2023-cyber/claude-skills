import { z } from "zod";
import { generateMapPreviews } from "../preview/mapbox-preview.js";

const schema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  zoom: z.number().min(0).max(22).default(12),
  template_slug: z.string(),
  access_token: z.string().optional(),
});

export const previewMapStylesTool = {
  name: "preview_map_styles",
  description: "生成 3 种地图样式预览（亮色街道/暗色街道/卫星混合），供用户选择",
  inputSchema: {
    type: "object",
    properties: {
      longitude: { type: "number", description: "经度 -180~180" },
      latitude: { type: "number", description: "纬度 -90~90" },
      zoom: { type: "number", description: "缩放级别 0-22，默认 12" },
      template_slug: { type: "string", description: "PPT 模板 slug" },
      access_token: { type: "string", description: "Mapbox access token（可选，优先用环境变量）" },
    },
    required: ["longitude", "latitude", "template_slug"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const styles = await generateMapPreviews(p.longitude, p.latitude, p.zoom, p.template_slug, p.access_token);
    return { content: [{ type: "text", text: JSON.stringify(styles, null, 2) }] };
  },
};
