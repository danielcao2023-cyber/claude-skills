import { z } from "zod";

export const VALID_SCENE_TOOLS = ["three_js", "spline", "rive", "matter_js"] as const;
export type SceneTool = (typeof VALID_SCENE_TOOLS)[number];

// ── Three.js params ──────────────────────────────────────────────
export const ThreeParamsSchema = z.object({
  scene_type: z.enum(["particles", "geometry", "product_rotation", "abstract_waves", "text_3d"]),
  color_override: z.array(z.string()).optional(),
  custom_description: z.string().optional(),
});

// ── Spline params ────────────────────────────────────────────────
export const SplineParamsSchema = z.object({
  scene_url: z.string().url(),
  zoom: z.number().min(0.5).max(3).default(1),
});

// ── Rive params ──────────────────────────────────────────────────
export const RiveParamsSchema = z.object({
  riv_url: z.string().url(),
  artboard: z.string().optional(),
  animation: z.string().optional(),
  frame: z.number().int().min(0).default(0),
});

// ── Matter.js params ─────────────────────────────────────────────
export const MatterParamsSchema = z.object({
  scene_type: z.enum(["gravity_fall", "collision", "pendulum", "cloth", "fluid"]),
  duration_seconds: z.number().min(1).max(10).default(3),
  color_override: z.array(z.string()).optional(),
});

// ── Validation ───────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSceneParams(
  tool: SceneTool,
  params: unknown,
): ValidationResult {
  const schemas: Record<SceneTool, z.ZodTypeAny> = {
    three_js: ThreeParamsSchema,
    spline: SplineParamsSchema,
    rive: RiveParamsSchema,
    matter_js: MatterParamsSchema,
  };

  if (!schemas[tool]) {
    return {
      valid: false,
      errors: [`Unknown tool "${tool}". Valid: ${VALID_SCENE_TOOLS.join(", ")}`],
      warnings: [],
    };
  }

  const result = schemas[tool].safeParse(params);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
      warnings: [],
    };
  }
  return { valid: true, errors: [], warnings: [] };
}
