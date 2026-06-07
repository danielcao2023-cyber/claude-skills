import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";
import type { ThreeSceneType } from "../renderer/three-renderer.js";

export interface ThreePreviewSpec {
  sceneType: ThreeSceneType;
  label: string;
  description: string;
  pngBase64: string;
}

const PRESET_LABELS: Record<ThreeSceneType, { label: string; description: string }> = {
  particles: { label: "粒子星空", description: "旋转粒子光点场，深邃科技感" },
  geometry: { label: "几何抽象", description: "多种几何体组合，现代艺术风" },
  product_rotation: { label: "产品展台", description: "展示台 + 中心物体，适合产品介绍" },
  abstract_waves: { label: "波形平面", description: "起伏波浪网格，流动数据感" },
  text_3d: { label: "3D 文字", description: "3D 大标题 + 装饰几何体，封面首选" },
};

export async function generateThreePreviews(
  templateSlug: string,
  sceneTypes?: ThreeSceneType[],
): Promise<ThreePreviewSpec[]> {
  const types = sceneTypes || (Object.keys(PRESET_LABELS) as ThreeSceneType[]);
  const { palette, isDark } = resolvePalette(templateSlug);
  const results: ThreePreviewSpec[] = [];

  for (const sceneType of types) {
    try {
      const pngBase64 = await renderPreviewPng(sceneType, palette, isDark);
      const meta = PRESET_LABELS[sceneType] || { label: sceneType, description: "" };
      results.push({ sceneType, label: meta.label, description: meta.description, pngBase64 });
    } catch {
      const meta = PRESET_LABELS[sceneType] || { label: sceneType, description: "" };
      results.push({ sceneType, label: meta.label, description: meta.description, pngBase64: "" });
    }
  }
  return results;
}

async function renderPreviewPng(
  sceneType: ThreeSceneType,
  palette: string[],
  isDark: boolean,
): Promise<string> {
  const html = buildPreviewHtml(sceneType, palette, isDark);
  const buffer = await renderWithRetry(async (page) => {
    await page.setViewport({ width: 800, height: 500, deviceScaleFactor: 1 });
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      () => (window as unknown as Record<string, unknown>).__three_rendered === true,
      { timeout: 10000 },
    );
    return Buffer.from(await page.screenshot({ type: "png" }));
  });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function buildPreviewHtml(
  sceneType: ThreeSceneType,
  palette: string[],
  isDark: boolean,
): string {
  const bgColor = isDark ? "#1a1a2e" : palette[3] || "#F0F0F5";
  const primaryColor = palette[0];
  const accentColor = palette[1];
  const lightColor = palette[2];
  const darkAccent = palette[4];

  // Simplified scene for preview (no shadows, fewer objects)
  let sceneCode = "";
  switch (sceneType) {
    case "particles":
      sceneCode = `
const pGeo = new THREE.BufferGeometry();
const count = 800;
const pos = new Float32Array(count * 3);
const cols = new Float32Array(count * 3);
const pCols = [new THREE.Color('${primaryColor}'), new THREE.Color('${accentColor}'), new THREE.Color('${lightColor}')];
for (let i=0;i<count;i++){const r=2+Math.random()*3,th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI;pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);pos[i*3+2]=r*Math.cos(ph);const c=pCols[Math.floor(Math.random()*3)];cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b}
pGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(cols,3));
const pMat=new THREE.PointsMaterial({size:0.04,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false});
const ps=new THREE.Points(pGeo,pMat);ps.rotation.x=0.3;ps.rotation.y=0.5;scene.add(ps);
const sg=new THREE.SphereGeometry(0.2,16,16);const sm=new THREE.MeshBasicMaterial({color:new THREE.Color('${primaryColor}'),transparent:true,opacity:0.15});scene.add(new THREE.Mesh(sg,sm));`;
      break;
    case "geometry":
      sceneCode = `
const ico=new THREE.Mesh(new THREE.IcosahedronGeometry(1),new THREE.MeshStandardMaterial({color:new THREE.Color('${primaryColor}'),roughness:0.2,metalness:0.4}));ico.position.set(0,0.2,0);ico.rotation.set(0.3,0.5,0);scene.add(ico);
const torus=new THREE.Mesh(new THREE.TorusKnotGeometry(0.7,0.2,64,16),new THREE.MeshStandardMaterial({color:new THREE.Color('${accentColor}'),roughness:0.2,metalness:0.4}));torus.position.set(1.8,-0.3,-0.5);torus.rotation.set(0.8,1.2,0.4);scene.add(torus);
const box=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),new THREE.MeshStandardMaterial({color:new THREE.Color('${lightColor}'),roughness:0.2,metalness:0.4}));box.position.set(-1.6,0.3,-0.8);box.rotation.set(0.5,0.3,0.7);scene.add(box);`;
      break;
    case "product_rotation":
      sceneCode = `
const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.8,0.25,32),new THREE.MeshStandardMaterial({color:new THREE.Color('${darkAccent}'),roughness:0.3,metalness:0.6}));ped.position.y=-1.8;scene.add(ped);
const up=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,0.12,32),new THREE.MeshStandardMaterial({color:new THREE.Color('${darkAccent}'),roughness:0.3,metalness:0.6}));up.position.y=-1.55;scene.add(up);
const prod=new THREE.Mesh(new THREE.TorusKnotGeometry(0.5,0.15,64,12),new THREE.MeshStandardMaterial({color:new THREE.Color('${primaryColor}'),roughness:0.15,metalness:0.7}));prod.position.y=0.2;scene.add(prod);
const ring=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.025,12,64),new THREE.MeshStandardMaterial({color:new THREE.Color('${accentColor}'),roughness:0.1,metalness:0.9,emissive:new THREE.Color('${accentColor}'),emissiveIntensity:0.3}));ring.position.y=-0.15;ring.rotation.x=Math.PI/2;scene.add(ring);`;
      break;
    case "abstract_waves":
      sceneCode = `
const wGeo=new THREE.PlaneGeometry(6,5,80,60);wGeo.rotateX(-Math.PI/3);const attr=wGeo.attributes.position;
for(let i=0;i<attr.count;i++){const x=attr.getX(i);const y=attr.getY(i);const z=Math.sin(x*2.5)*Math.cos(y*2)*0.35+Math.sin(x*5+y*3)*0.15+Math.cos(y*4)*0.25;attr.setZ(i,z)}
wGeo.computeVertexNormals();const wMat=new THREE.MeshStandardMaterial({color:new THREE.Color('${primaryColor}'),roughness:0.3,metalness:0.5,side:THREE.DoubleSide});
const w=new THREE.Mesh(wGeo,wMat);w.position.y=0.3;scene.add(w);
const gGeo=new THREE.PlaneGeometry(7,6,30,20);gGeo.rotateX(-Math.PI/2);const gMat=new THREE.MeshBasicMaterial({color:new THREE.Color('${accentColor}'),wireframe:true,transparent:true,opacity:0.12});scene.add(new THREE.Mesh(gGeo,gMat));
camera.position.set(0,3,6);camera.lookAt(0,0,0);`;
      break;
    case "text_3d":
      sceneCode = `
const tc=document.createElement('canvas');tc.width=512;tc.height=128;const cx=tc.getContext('2d');
cx.fillStyle='${bgColor}';cx.fillRect(0,0,512,128);
cx.font='bold 60px "Microsoft YaHei","PingFang SC",sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='${primaryColor}';cx.fillText('PPT',256,50);
cx.font='bold 20px "Microsoft YaHei","PingFang SC",sans-serif';cx.fillStyle='${accentColor}';cx.fillText('AI GENERATED',256,95);
const tex=new THREE.CanvasTexture(tc);tex.minFilter=THREE.LinearFilter;
const tp=new THREE.Mesh(new THREE.PlaneGeometry(4,1),new THREE.MeshStandardMaterial({map:tex,roughness:0.3,metalness:0.2,side:THREE.DoubleSide}));tp.position.y=0.4;scene.add(tp);
for(let i=0;i<6;i++){const g=new THREE.IcosahedronGeometry(0.12);const m=new THREE.MeshStandardMaterial({color:new THREE.Color(i%2===0?'${primaryColor}':'${accentColor}'),roughness:0.2,metalness:0.6});const o=new THREE.Mesh(g,m);o.position.set((i-2.5)*1,1.2-(i%2*0.8),-1);scene.add(o)}`;
      break;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:800px;height:500px;background:${bgColor};overflow:hidden}canvas{display:block}
</style></head><body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
        onerror="window.__three_rendered=true"></script>
<script>
try{
const scene=new THREE.Scene();scene.background=new THREE.Color('${bgColor}');
const camera=new THREE.PerspectiveCamera(45,800/500,0.1,100);camera.position.set(0,1,5);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(800,500);renderer.setPixelRatio(1);document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(new THREE.Color('${lightColor}'),2));
const dl=new THREE.DirectionalLight(0xffffff,2);dl.position.set(5,8,5);scene.add(dl);
scene.add(new THREE.DirectionalLight(new THREE.Color('${lightColor}'),1.5)).position.set(-3,2,-2);
${sceneCode}
renderer.render(scene,camera);window.__three_rendered=true;
}catch(e){window.__three_rendered=true;}
setTimeout(function(){if(!window.__three_rendered)window.__three_rendered=true;},10000);
</script></body></html>`;
}
