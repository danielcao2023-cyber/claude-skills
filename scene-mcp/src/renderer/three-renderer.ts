import { mkdirSync, writeFileSync, statSync } from "fs";
import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";

export type ThreeSceneType = "particles" | "geometry" | "product_rotation" | "abstract_waves" | "text_3d";

export interface RenderThreeParams {
  sceneType: ThreeSceneType;
  templateSlug: string;
  colorOverride?: string[];
  customDescription?: string;
  outputDir: string;
  filename: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface RenderThreeResult {
  success: boolean;
  pngPath?: string;
  pngSize?: string;
  dimensions?: string;
  colorPalette?: string[];
  sceneType?: string;
  error?: string;
}

export async function renderThreeScene(params: RenderThreeParams): Promise<RenderThreeResult> {
  const {
    sceneType, templateSlug, colorOverride, customDescription,
    outputDir, filename, width = 1920, height = 1080, scale = 2,
  } = params;

  const { palette, isDark } = resolvePalette(templateSlug, colorOverride);
  const html = buildThreeHtml(sceneType, palette, isDark, width, height, customDescription);

  try {
    const pngBuffer = await renderWithRetry(async (page) => {
      await page.setViewport({
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale),
        deviceScaleFactor: scale,
      });
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
      await page.waitForFunction(
        () => (window as unknown as Record<string, unknown>).__three_rendered === true,
        { timeout: 15000 },
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

function buildThreeHtml(
  sceneType: ThreeSceneType,
  palette: string[],
  isDark: boolean,
  width: number,
  height: number,
  customDescription?: string,
): string {
  const bgColor = isDark ? "#1a1a2e" : palette[3] || "#F0F0F5";
  const primaryColor = palette[0];
  const accentColor = palette[1];
  const lightColor = palette[2];
  const darkAccent = palette[4];

  // Scene-specific Three.js code
  const sceneCode = buildSceneCode(sceneType, palette, isDark, customDescription);
  const cameraZ = sceneType === "text_3d" ? 8 : sceneType === "abstract_waves" ? 6 : 5;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${width}px;height:${height}px;background:${bgColor};overflow:hidden}
canvas{display:block}
</style></head><body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
        onerror="window.__three_rendered=true"></script>
<script>
const palette = ${JSON.stringify(palette)};
const primaryColor = '${primaryColor}';
const accentColor = '${accentColor}';
const lightColor = '${lightColor}';
const darkAccent = '${darkAccent}';
const isDark = ${isDark};
const bgColor = '${bgColor}';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(bgColor);

const camera = new THREE.PerspectiveCamera(45, ${width}/${height}, 0.1, 100);
camera.position.set(0, 1.5, ${cameraZ});
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(${width}, ${height});
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(new THREE.Color(lightColor), 1.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(new THREE.Color(lightColor), 1.5);
fillLight.position.set(-3, 2, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(new THREE.Color(accentColor), 2);
rimLight.position.set(0, -1, 5);
scene.add(rimLight);

${sceneCode}

// Render and signal completion
try {
  renderer.render(scene, camera);
  window.__three_rendered = true;
} catch(e) {
  console.error('Three render error:', e);
  window.__three_rendered = true;
}
</script>
<script>
// Fallback: ensure we don't hang forever
setTimeout(function() {
  if (!window.__three_rendered) {
    window.__three_rendered = true;
  }
}, 12000);
</script></body></html>`;
}

function buildSceneCode(
  sceneType: ThreeSceneType,
  palette: string[],
  isDark: boolean,
  customDescription?: string,
): string {
  const [primary, accent, light, bgLight, dark] = palette;
  const textColor = isDark ? "#e0e0e0" : dark;

  switch (sceneType) {
    case "particles":
      return `
// Particle system — rotating starfield
const particlesGeo = new THREE.BufferGeometry();
const count = 2000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const paletteColors = [
  new THREE.Color('${primary}'),
  new THREE.Color('${accent}'),
  new THREE.Color('${light}'),
  new THREE.Color('${dark}'),
];

for (let i = 0; i < count; i++) {
  const r = 3 + Math.random() * 4;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
  const c = paletteColors[Math.floor(Math.random() * paletteColors.length)];
  colors[i * 3] = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particlesMat = new THREE.PointsMaterial({
  size: 0.04,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particles = new THREE.Points(particlesGeo, particlesMat);
particles.rotation.x = 0.3;
particles.rotation.y = 0.5;
scene.add(particles);

// Central glow sphere
const glowGeo = new THREE.SphereGeometry(0.3, 32, 32);
const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('${primary}'), transparent: true, opacity: 0.15 });
const glow = new THREE.Mesh(glowGeo, glowMat);
scene.add(glow);
`;

    case "geometry":
      return `
// Abstract geometric shapes
function createGeoMesh(geo, color, pos, rot) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.2,
    metalness: 0.4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const icoGeo = new THREE.IcosahedronGeometry(1.2, 0);
scene.add(createGeoMesh(icoGeo, '${primary}', [0, 0.2, 0], [0.3, 0.5, 0]));

const torusGeo = new THREE.TorusKnotGeometry(0.9, 0.25, 128, 32);
scene.add(createGeoMesh(torusGeo, '${accent}', [2, -0.3, -0.5], [0.8, 1.2, 0.4]));

const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
scene.add(createGeoMesh(boxGeo, '${light}', [-1.8, 0.5, -1], [0.5, 0.3, 0.7]));

const dodecGeo = new THREE.DodecahedronGeometry(0.6);
scene.add(createGeoMesh(dodecGeo, '${dark}', [-1.2, -0.6, 1], [0.2, -0.4, 0.3]));

const smallIco = new THREE.IcosahedronGeometry(0.4);
scene.add(createGeoMesh(smallIco, '${primary}', [1.5, 1, -1.2], [0.7, 1.5, 0.2]));

// Ground plane
const planeGeo = new THREE.PlaneGeometry(10, 10);
const planeMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${bgLight}'),
  roughness: 0.8,
  metalness: 0.1,
});
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -2;
plane.receiveShadow = true;
scene.add(plane);
`;

    case "product_rotation":
      return `
// Product showcase — pedestal + central object
// Pedestal
const pedestalGeo = new THREE.CylinderGeometry(0.8, 1, 0.3, 64);
const pedestalMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${dark}'),
  roughness: 0.3,
  metalness: 0.6,
});
const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
pedestal.position.y = -2;
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

// Upper pedestal
const upperGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.15, 64);
const upper = new THREE.Mesh(upperGeo, pedestalMat);
upper.position.y = -1.75;
upper.castShadow = true;
scene.add(upper);

// Display object — torus knot (stand-in for product)
const productGeo = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
const productMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${primary}'),
  roughness: 0.15,
  metalness: 0.7,
});
const product = new THREE.Mesh(productGeo, productMat);
product.position.y = 0.3;
product.castShadow = true;
product.receiveShadow = true;
scene.add(product);

// Accent ring
const ringGeo = new THREE.TorusGeometry(0.85, 0.03, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${accent}'),
  roughness: 0.1,
  metalness: 0.9,
  emissive: new THREE.Color('${accent}'),
  emissiveIntensity: 0.3,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.position.y = -0.2;
ring.rotation.x = Math.PI / 2;
scene.add(ring);

// Ground plane
const groundGeo = new THREE.PlaneGeometry(8, 8);
const groundMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${bgLight}'),
  roughness: 0.7,
  metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.15;
ground.receiveShadow = true;
scene.add(ground);
`;

    case "abstract_waves":
      return `
// Wave plane with vertex displacement
const waveGeo = new THREE.PlaneGeometry(8, 6, 100, 80);
waveGeo.rotateX(-Math.PI / 3);
const positionsAttr = waveGeo.attributes.position;
for (let i = 0; i < positionsAttr.count; i++) {
  const x = positionsAttr.getX(i);
  const y = positionsAttr.getY(i);
  const z = Math.sin(x * 2.5) * Math.cos(y * 2) * 0.4 +
            Math.sin(x * 5 + y * 3) * 0.2 +
            Math.cos(y * 4) * 0.3;
  positionsAttr.setZ(i, z);
}
waveGeo.computeVertexNormals();

const waveMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('${primary}'),
  roughness: 0.3,
  metalness: 0.5,
  side: THREE.DoubleSide,
  flatShading: false,
});
const wave = new THREE.Mesh(waveGeo, waveMat);
wave.position.y = 0.5;
wave.castShadow = true;
wave.receiveShadow = true;
scene.add(wave);

// Accent grid underneath
const gridGeo = new THREE.PlaneGeometry(9, 7, 40, 30);
gridGeo.rotateX(-Math.PI / 2);
const gridMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color('${accent}'),
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});
const grid = new THREE.Mesh(gridGeo, gridMat);
grid.position.y = -1.5;
scene.add(grid);

// Add camera angle
camera.position.set(0, 3, 8);
camera.lookAt(0, 0.3, 0);
`;

    case "text_3d":
      return `
// 3D Text — rendered on floating planes with glow
const textContent = ${JSON.stringify(customDescription || "PPT")};

// Create text texture via Canvas
const textCanvas = document.createElement('canvas');
textCanvas.width = 1024;
textCanvas.height = 256;
const ctx = textCanvas.getContext('2d');
ctx.fillStyle = isDark ? '${bgColor}' : 'rgba(0,0,0,0)';
ctx.fillRect(0, 0, 1024, 256);
ctx.font = 'bold 120px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = '${primary}';
ctx.fillText(textContent, 512, 100);
// Subtitle line
ctx.font = 'bold 36px "Microsoft YaHei", "PingFang SC", sans-serif';
ctx.fillStyle = '${accent}';
ctx.fillText('POWERED BY AI', 512, 190);

const texture = new THREE.CanvasTexture(textCanvas);
texture.minFilter = THREE.LinearFilter;

const textPlaneGeo = new THREE.PlaneGeometry(5, 1.25);
const textPlaneMat = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.3,
  metalness: 0.2,
  emissive: new THREE.Color('${primary}'),
  emissiveIntensity: 0.15,
  side: THREE.DoubleSide,
});
const textPlane = new THREE.Mesh(textPlaneGeo, textPlaneMat);
textPlane.position.y = 0.5;
textPlane.castShadow = true;
scene.add(textPlane);

// Floating geometric accents around text
const accentGeos = [
  new THREE.IcosahedronGeometry(0.15),
  new THREE.TorusGeometry(0.2, 0.05, 8, 16),
  new THREE.OctahedronGeometry(0.12),
];
const accentPositions = [
  [-2.8, 1.5, -1], [2.6, -0.3, -0.5], [-1.5, -1, 0.8],
  [3, 1.2, -1.5], [-2.5, -0.5, 2], [1.8, 1.4, 0.3],
  [-0.5, 1.6, -1.8], [0.5, -1.2, 1.5],
];
for (let i = 0; i < accentPositions.length; i++) {
  const geo = accentGeos[i % accentGeos.length];
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color([i % 3 === 0 ? '${primary}' : i % 3 === 1 ? '${accent}' : '${light}'][0]),
    roughness: 0.2,
    metalness: 0.6,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...accentPositions[i]);
  mesh.castShadow = true;
  scene.add(mesh);
}

// Subtle particle backdrop
const bgParticlesGeo = new THREE.BufferGeometry();
const bgCount = 300;
const bgPositions = new Float32Array(bgCount * 3);
for (let i = 0; i < bgCount; i++) {
  bgPositions[i * 3] = (Math.random() - 0.5) * 8;
  bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
  bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 2;
}
bgParticlesGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
const bgMat = new THREE.PointsMaterial({
  size: 0.03,
  color: new THREE.Color('${accent}'),
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.6,
});
const bgParticles = new THREE.Points(bgParticlesGeo, bgMat);
scene.add(bgParticles);
`;

    default:
      return `// Fallback: simple colored cube
const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
const cubeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('${primary}'), roughness: 0.2, metalness: 0.5 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.castShadow = true;
scene.add(cube);`;
  }
}
