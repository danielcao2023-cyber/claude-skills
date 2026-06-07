import { mkdirSync, writeFileSync, statSync } from "fs";
import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";

export type MatterSceneType = "gravity_fall" | "collision" | "pendulum" | "cloth" | "fluid";

export interface RenderMatterParams {
  sceneType: MatterSceneType;
  templateSlug: string;
  durationSeconds?: number;
  colorOverride?: string[];
  outputDir: string;
  filename: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface RenderMatterResult {
  success: boolean;
  pngPath?: string;
  pngSize?: string;
  dimensions?: string;
  colorPalette?: string[];
  sceneType?: string;
  error?: string;
}

export async function renderPhysicsScene(params: RenderMatterParams): Promise<RenderMatterResult> {
  const {
    sceneType, templateSlug, durationSeconds = 3, colorOverride,
    outputDir, filename, width = 1920, height = 1080, scale = 2,
  } = params;

  const { palette, isDark } = resolvePalette(templateSlug, colorOverride);
  const html = buildMatterHtml(sceneType, palette, isDark, width, height, durationSeconds);

  try {
    const pngBuffer = await renderWithRetry(async (page) => {
      await page.setViewport({
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
        deviceScaleFactor: scale,
      });
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
      // Wait for physics simulation to complete (duration + render)
      await page.waitForFunction(
        () => (window as unknown as Record<string, unknown>).__matter_rendered === true,
        { timeout: (durationSeconds + 5) * 1000 },
      );
      return Buffer.from(await page.screenshot({ type: "png", fullPage: false }));
    });

    mkdirSync(outputDir, { recursive: true });
    const pngPath = `${outputDir}/${filename}.png`;
    writeFileSync(pngPath, pngBuffer);
    const fileStat = statSync(pngPath);
    const sizeKB = Math.round(fileStat.size / 1024);

    return {
      success: true,
      pngPath,
      pngSize: `${sizeKB}KB`,
      dimensions: `${Math.ceil(width * scale)}×${Math.ceil(height * scale)}`,
      colorPalette: palette,
      sceneType,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message, colorPalette: palette };
  }
}

function buildMatterHtml(
  sceneType: MatterSceneType,
  palette: string[],
  isDark: boolean,
  width: number,
  height: number,
  durationSeconds: number,
): string {
  const bgColor = isDark ? "#1a1a2e" : palette[3] || "#F0F0F5";
  const [primary, accent, light, bgLight, dark] = palette;
  const wallColor = isDark ? dark : "#555555";

  // Shared setup code
  const setup = `
const {Engine,Render,Runner,Bodies,Composite,Composites,Constraint,Mouse,MouseConstraint,Events} = Matter;
const engine = Engine.create();
const world = engine.world;

const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: ${width},
    height: ${height},
    wireframes: false,
    background: '${bgColor}',
    pixelRatio: 1,
  },
});

// Color helper
function bodyColor(i, total) {
  const cols = ['${primary}','${accent}','${light}','${dark}'];
  return cols[i % cols.length];
}`;

  // Scene-specific bodies
  let bodiesCode = "";
  switch (sceneType) {
    case "gravity_fall":
      bodiesCode = `
// Walls (floor + sides)
Composite.add(world, [
  Bodies.rectangle(${width / 2}, ${height + 25}, ${width * 2}, 50, { isStatic: true, render: { fillStyle: '${wallColor}' } }),
]);

// Falling colored blocks
const cols = ['${primary}','${accent}','${light}','${dark}'];
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 8; col++) {
    const x = ${width * 0.15} + col * (${width * 0.08});
    const y = 40 + row * 60;
    const block = Bodies.rectangle(x, y, ${Math.floor(width * 0.055)}, ${Math.floor(width * 0.055)}, {
      render: { fillStyle: cols[(row + col) % cols.length] },
      restitution: 0.4,
      friction: 0.3,
      chamfer: { radius: 5 },
    });
    Composite.add(world, block);
  }
}`;
      break;

    case "collision":
      bodiesCode = `
// Newton's cradle style — 5 balls
const centerX = ${width / 2};
const baseY = ${height * 0.6};
const ballRadius = ${Math.floor(Math.min(width, height) * 0.05)};

for (let i = 0; i < 5; i++) {
  const x = centerX + (i - 2) * ballRadius * 2.5;
  const ball = Bodies.circle(x, baseY - 200, ballRadius, {
    render: { fillStyle: bodyColor(i, 5) },
    restitution: 0.95,
    friction: 0.01,
    density: 0.01,
  });
  const constraint = Constraint.create({
    pointA: { x, y: baseY - 350 },
    bodyB: ball,
    pointB: { x: 0, y: 0 },
    length: 200,
    stiffness: 0.9,
  });
  Composite.add(world, [ball, constraint]);
}

// Raise first ball
setTimeout(() => {
  const bodies = Composite.allBodies(world).filter(b => b.circleRadius);
  if (bodies[0]) {
    Matter.Body.setPosition(bodies[0], { x: bodies[0].position.x, y: bodies[0].position.y - 120 });
  }
}, 500);

// Support bar
Composite.add(world, [
  Bodies.rectangle(centerX, baseY - 350, ballRadius * 12, 4, { isStatic: true, render: { fillStyle: '${wallColor}' } }),
]);`;
      break;

    case "pendulum":
      bodiesCode = `
// Multi-pendulum system
const pendCount = 6;
const spacing = ${Math.floor(width / (pendCount + 1))};
const startY = ${Math.floor(height * 0.15)};

for (let i = 0; i < pendCount; i++) {
  const x = spacing * (i + 1);
  const length = 120 + i * 40;
  const ballR = 18 + i * 4;
  const ball = Bodies.circle(x, startY + length, ballR, {
    render: { fillStyle: bodyColor(i, pendCount) },
    restitution: 0.3,
  });
  const constraint = Constraint.create({
    pointA: { x, y: startY },
    bodyB: ball,
    pointB: { x: 0, y: 0 },
    length: length,
    stiffness: 0.5,
  });
  Composite.add(world, [ball, constraint]);
}

// Top bar
Composite.add(world, [
  Bodies.rectangle(${width / 2}, startY - 10, ${width}, 8, { isStatic: true, render: { fillStyle: '${wallColor}' } }),
]);`;
      break;

    case "cloth":
      bodiesCode = `
// Cloth/soft body — grid of particles connected by constraints
const clothW = 30;
const clothH = 20;
const spacing = 22;
const startX = ${Math.floor(width * 0.25)};
const startY = ${Math.floor(height * 0.05)};

const group = Matter.Body.nextGroup(true);
const particles = [];
for (let y = 0; y < clothH; y++) {
  for (let x = 0; x < clothW; x++) {
    const isPinned = y === 0 && (x === 0 || x === clothW - 1 || x === Math.floor(clothW / 2));
    const particle = Bodies.circle(startX + x * spacing, startY + y * spacing, 4, {
      render: { fillStyle: bodyColor(y, clothH) },
      collisionFilter: { group: group },
      isStatic: isPinned,
      restitution: 0.1,
    });
    particles.push(particle);
    Composite.add(world, particle);
  }
}

// Connect neighbors with constraints
for (let y = 0; y < clothH; y++) {
  for (let x = 0; x < clothW; x++) {
    const idx = y * clothW + x;
    if (x < clothW - 1) {
      Composite.add(world, Constraint.create({
        bodyA: particles[idx], bodyB: particles[idx + 1],
        stiffness: 0.6, damping: 0.1,
      }));
    }
    if (y < clothH - 1) {
      Composite.add(world, Constraint.create({
        bodyA: particles[idx], bodyB: particles[idx + clothW],
        stiffness: 0.6, damping: 0.1,
      }));
    }
  }
}`;
      break;

    case "fluid":
      bodiesCode = `
// "Fluid-like" particles flowing through obstacles
const cols = ['${primary}','${accent}','${light}'];
const group = Matter.Body.nextGroup(true);

// Funnel structure
Composite.add(world, [
  // Left wall
  Bodies.rectangle(${Math.floor(width * 0.25)}, ${Math.floor(height * 0.55)}, 20, ${Math.floor(height * 0.5)}, { isStatic: true, render: { fillStyle: '${wallColor}' }, angle: -0.15 }),
  // Right wall
  Bodies.rectangle(${Math.floor(width * 0.75)}, ${Math.floor(height * 0.55)}, 20, ${Math.floor(height * 0.5)}, { isStatic: true, render: { fillStyle: '${wallColor}' }, angle: 0.15 }),
  // Floor
  Bodies.rectangle(${width / 2}, ${height - 20}, ${Math.floor(width * 0.6)}, 30, { isStatic: true, render: { fillStyle: '${wallColor}' } }),
  // Obstacles
  Bodies.rectangle(${Math.floor(width * 0.4)}, ${Math.floor(height * 0.7)}, 60, 15, { isStatic: true, render: { fillStyle: '${wallColor}' }, angle: 0.3 }),
  Bodies.rectangle(${Math.floor(width * 0.6)}, ${Math.floor(height * 0.6)}, 50, 12, { isStatic: true, render: { fillStyle: '${wallColor}' }, angle: -0.25 }),
]);

// Spawn particles from top
for (let i = 0; i < 150; i++) {
  const x = ${Math.floor(width * 0.3)} + Math.random() * ${Math.floor(width * 0.4)};
  const y = 30 + Math.random() * 100;
  const particle = Bodies.circle(x, y, 7 + Math.random() * 4, {
    render: { fillStyle: cols[Math.floor(Math.random() * 3)] },
    collisionFilter: { group: group },
    restitution: 0.15,
    friction: 0.05,
    density: 0.002,
  });
  Composite.add(world, particle);
}`;
      break;

    default:
      bodiesCode = `
Composite.add(world, [
  Bodies.rectangle(${width / 2}, ${height + 25}, ${width * 2}, 50, { isStatic: true, render: { fillStyle: '${wallColor}' } }),
]);
for (let i = 0; i < 10; i++) {
  const b = Bodies.circle(${width * 0.2} + i * ${width * 0.06}, 50, 25, {
    render: { fillStyle: bodyColor(i, 10) },
    restitution: 0.5,
  });
  Composite.add(world, b);
}`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${width}px;height:${height}px;background:${bgColor};overflow:hidden}
</style></head><body>
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
<script>
(function() {
  ${setup}
  ${bodiesCode}

  // Run the engine
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // After duration, stop and signal
  setTimeout(function() {
    Runner.stop(runner);
    Render.stop(render);
    window.__matter_rendered = true;
  }, ${durationSeconds * 1000});

  // Fallback: render even if physics hasn't settled
  setTimeout(function() {
    if (!window.__matter_rendered) {
      Runner.stop(runner);
      Render.stop(render);
      window.__matter_rendered = true;
    }
  }, ${(durationSeconds + 3) * 1000});
})();
</script></body></html>`;
}
