import { resolvePalette } from "../theme/template-palette.js";

const MAPBOX_API = "https://api.mapbox.com/styles/v1/mapbox";

export interface MapStylePreview {
  styleId: string;
  label: string;
  description: string;
  previewUrl: string;
}

export async function generateMapPreviews(
  longitude: number,
  latitude: number,
  zoom: number,
  templateSlug: string,
  accessToken?: string,
): Promise<MapStylePreview[]> {
  const token = accessToken || process.env.MAPBOX_ACCESS_TOKEN;

  const styles: Array<{ styleId: string; label: string; description: string }> = [
    { styleId: "light-v11", label: "亮色街道", description: "适合浅色模板，清晰街道标注" },
    { styleId: "dark-v11", label: "暗色街道", description: "适合深色模板，现代科技感" },
    { styleId: "satellite-streets-v12", label: "卫星混合", description: "卫星图+标注，信息量大" },
  ];

  return styles.map(s => ({
    styleId: s.styleId,
    label: s.label,
    description: s.description,
    previewUrl: token
      ? `${MAPBOX_API}/${s.styleId}/static/${longitude},${latitude},${zoom}/400x300?access_token=${token}&logo=false&attribution=false`
      : "",
  }));
}
