import { resolvePalette } from "../theme/template-palette.js";

export interface SplinePreviewInfo {
  sceneUrl: string;
  sceneId: string;
  previewUrl: string;
  isValid: boolean;
  error?: string;
}

export async function generateSplinePreview(
  sceneUrl: string,
  templateSlug: string,
): Promise<SplinePreviewInfo> {
  // Extract scene ID from Spline URL
  let sceneId = "";
  try {
    const url = new URL(sceneUrl);
    // Spline URLs: https://my.spline.com/untitled-abc123
    const parts = url.pathname.split("/");
    sceneId = parts[parts.length - 1] || parts[parts.length - 2] || "unknown";
  } catch {
    return { sceneUrl, sceneId: "invalid", previewUrl: "", isValid: false, error: "Invalid URL format" };
  }

  // Validate: URL must be from spline.design or my.spline
  if (!sceneUrl.includes("spline.design") && !sceneUrl.includes("my.spline")) {
    return {
      sceneUrl,
      sceneId,
      previewUrl: "",
      isValid: false,
      error: "URL must be from spline.design or my.spline",
    };
  }

  const { isDark } = resolvePalette(templateSlug);
  const bgHex = isDark ? "1a1a2e" : "f5f5f8";

  // Spline doesn't have a public thumbnail API, but we can construct the viewer URL
  const previewUrl = `https://my.spline.com/${sceneId}?background=${bgHex}`;

  return {
    sceneUrl,
    sceneId,
    previewUrl,
    isValid: true,
  };
}
