import { z } from "zod";
import { renderMapbox } from "../renderer/mapbox-renderer.js";

const schema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  zoom: z.number().min(0).max(22).default(12),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
  template_slug: z.string(),
  style: z.enum(["streets-v12","light-v11","dark-v11","outdoors-v12","satellite-streets-v12"]).optional(),
  color_override: z.array(z.string()).optional(),
  access_token: z.string().optional(),
  output_dir: z.string(),
  filename: z.string(),
});

export const renderMapboxTool = {
  name: "render_mapbox",
  description: "渲染 Mapbox 静态地图为高清 PNG（@2x）。自动根据模板明暗选择地图样式。",
  inputSchema: {
    type: "object",
    properties: {
      longitude: { type: "number" },
      latitude: { type: "number" },
      zoom: { type: "number" },
      template_slug: { type: "string" },
      style: { type: "string", enum: ["streets-v12","light-v11","dark-v11","outdoors-v12","satellite-streets-v12"] },
      color_override: { type: "array", items: { type: "string" } },
      access_token: { type: "string" },
      output_dir: { type: "string" },
      filename: { type: "string" },
    },
    required: ["longitude","latitude","template_slug","output_dir","filename"],
  },
  handler: async (args: unknown) => {
    const p = schema.parse(args);
    const result = await renderMapbox({
      longitude: p.longitude, latitude: p.latitude, zoom: p.zoom,
      width: p.width, height: p.height, scale: p.scale,
      templateSlug: p.template_slug, style: p.style,
      colorOverride: p.color_override, accessToken: p.access_token,
      outputDir: p.output_dir, filename: p.filename,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};
