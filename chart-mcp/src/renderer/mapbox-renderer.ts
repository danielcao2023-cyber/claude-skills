import { mkdirSync, writeFileSync } from "fs";
import { resolvePalette } from "../theme/template-palette.js";

const MAPBOX_API = "https://api.mapbox.com/styles/v1/mapbox";

export interface RenderMapboxParams {
  longitude: number;
  latitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  scale?: number;
  templateSlug: string;
  style?: "streets-v12" | "light-v11" | "dark-v11" | "outdoors-v12" | "satellite-streets-v12";
  colorOverride?: string[];
  accessToken?: string;
  outputDir: string;
  filename: string;
}

export interface RenderMapboxResult {
  success: boolean;
  pngPath?: string;
  staticUrl?: string;
  dimensions?: string;
  error?: string;
}

export async function renderMapbox(params: RenderMapboxParams): Promise<RenderMapboxResult> {
  const {
    longitude, latitude, zoom = 12, width = 1920, height = 1080, scale = 2,
    templateSlug, style = "light-v11", colorOverride, accessToken, outputDir, filename,
  } = params;

  const token = accessToken || process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return {
      success: false,
      error: "Mapbox access token required. Set MAPBOX_ACCESS_TOKEN env var or pass accessToken param.",
    };
  }

  const { isDark } = resolvePalette(templateSlug, colorOverride);
  const effectiveStyle = isDark && style === "light-v11" ? "dark-v11" : style;

  const w = Math.ceil(width * scale);
  const h = Math.ceil(height * scale);

  const staticUrl =
    `${MAPBOX_API}/${effectiveStyle}/static/` +
    `${longitude},${latitude},${zoom}/${w}x${h}` +
    `?access_token=${token}&logo=false&attribution=false`;

  try {
    const response = await fetch(staticUrl);
    if (!response.ok) {
      return { success: false, error: `Mapbox API returned ${response.status}: ${response.statusText}`, staticUrl };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(outputDir, { recursive: true });
    const pngPath = `${outputDir}/${filename}.png`;
    writeFileSync(pngPath, buffer);

    return {
      success: true,
      pngPath,
      staticUrl,
      dimensions: `${w}×${h}`,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message, staticUrl };
  }
}
