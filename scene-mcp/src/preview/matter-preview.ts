import { renderWithRetry } from "../browser-pool.js";
import { resolvePalette } from "../theme/template-palette.js";
import type { MatterSceneType } from "../renderer/matter-renderer.js";

export interface MatterPreviewSpec {
  sceneType: MatterSceneType;
  label: string;
  description: string;
  pngBase64: string;
}

const PRESET_LABELS: Record<MatterSceneType, { label: string; description: string }> = {
  gravity_fall: { label: "重力堆积", description: "彩色方块落下堆积，展示重力效果" },
  collision: { label: "牛顿摆", description: "多球碰撞链，展示动量传递" },
  pendulum: { label: "多摆系统", description: "多级摆的混沌运动" },
  cloth: { label: "布料模拟", description: "粒子网格 + 约束，模拟软体" },
  fluid: { label: "流体粒子", description: "粒子流过障碍物，模拟流体" },
};

export async function generateMatterPreviews(
  templateSlug: string,
  sceneTypes?: MatterSceneType[],
): Promise<MatterPreviewSpec[]> {
  const types = sceneTypes || (Object.keys(PRESET_LABELS) as MatterSceneType[]);
  const { palette, isDark } = resolvePalette(templateSlug);
  const results: MatterPreviewSpec[] = [];

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
  sceneType: MatterSceneType,
  palette: string[],
  isDark: boolean,
): Promise<string> {
  const bgColor = isDark ? "#1a1a2e" : palette[3] || "#F0F0F5";
  const [primary, accent, light, , dark] = palette;
  const wallColor = isDark ? dark : "#555555";

  // Simplified scenes for preview (fewer bodies, shorter duration)
  let bodiesCode = "";
  const pw = 800, ph = 500;
  switch (sceneType) {
    case "gravity_fall":
      bodiesCode = `
Composite.add(world, [Bodies.rectangle(400,510,1600,40,{isStatic:true,render:{fillStyle:'${wallColor}'}})]);
const cols=['${primary}','${accent}','${light}','${dark}'];
for(let r=0;r<4;r++)for(let c=0;c<6;c++)
Composite.add(world,Bodies.rectangle(150+c*90,20+r*50,55,35,{render:{fillStyle:cols[(r+c)%4]},restitution:0.4,chamfer:{radius:4}}));`;
      break;
    case "collision":
      bodiesCode = `
const cx=400,br=28;
for(let i=0;i<5;i++){const b=Bodies.circle(cx+(i-2)*br*2.5,160,br,{render:{fillStyle:['${primary}','${accent}','${light}','${dark}','${primary}'][i]},restitution:0.95,density:0.005});
Composite.add(world,[b,Constraint.create({pointA:{x:cx+(i-2)*br*2.5,y:50},bodyB:b,length:100,stiffness:0.9})]);}
setTimeout(()=>{const bd=Composite.allBodies(world).filter(b=>b.circleRadius);if(bd[0])Matter.Body.setPosition(bd[0],{x:bd[0].position.x,y:bd[0].position.y-100})},400);
Composite.add(world,[Bodies.rectangle(cx,40,br*12,4,{isStatic:true,render:{fillStyle:'${wallColor}'}})]);`;
      break;
    case "pendulum":
      bodiesCode = `
for(let i=0;i<4;i++){const x=160+i*175,len=80+i*30,br=15+i*3;const b=Bodies.circle(x,30+len,br,{render:{fillStyle:['${primary}','${accent}','${light}','${dark}'][i]},restitution:0.3});
Composite.add(world,[b,Constraint.create({pointA:{x,y:30},bodyB:b,length:len,stiffness:0.5})]);}
Composite.add(world,[Bodies.rectangle(400,20,800,6,{isStatic:true,render:{fillStyle:'${wallColor}'}})]);`;
      break;
    case "cloth":
      bodiesCode = `
const grp=Matter.Body.nextGroup(true);const pts=[];const cw=18,ch=12,sp=18;
for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const pin=y===0&&(x===0||x===cw-1||x===9);const p=Bodies.circle(100+x*sp,20+y*sp,3,{render:{fillStyle:['${primary}','${accent}','${light}'][y%3]},collisionFilter:{group:grp},isStatic:pin,restitution:0.1});pts.push(p);Composite.add(world,p);}
for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=y*cw+x;if(x<cw-1)Composite.add(world,Constraint.create({bodyA:pts[i],bodyB:pts[i+1],stiffness:0.6}));if(y<ch-1)Composite.add(world,Constraint.create({bodyA:pts[i],bodyB:pts[i+cw],stiffness:0.6}));}`;
      break;
    case "fluid":
      bodiesCode = `
Composite.add(world,[Bodies.rectangle(200,250,16,250,{isStatic:true,render:{fillStyle:'${wallColor}'},angle:-0.15}),Bodies.rectangle(600,250,16,250,{isStatic:true,render:{fillStyle:'${wallColor}'},angle:0.15}),Bodies.rectangle(400,490,350,20,{isStatic:true,render:{fillStyle:'${wallColor}'}}),Bodies.rectangle(320,360,50,12,{isStatic:true,render:{fillStyle:'${wallColor}'},angle:0.3}),Bodies.rectangle(480,320,40,10,{isStatic:true,render:{fillStyle:'${wallColor}'},angle:-0.25})]);
const grp2=Matter.Body.nextGroup(true)
for(let i=0;i<80;i++){Composite.add(world,Bodies.circle(280+Math.random()*240,20+Math.random()*80,6+Math.random()*3,{render:{fillStyle:['${primary}','${accent}','${light}'][Math.floor(Math.random()*3)]},collisionFilter:{group:grp2},restitution:0.15,density:0.002}));}`;
      break;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:800px;height:500px;background:${bgColor};overflow:hidden}
</style></head><body>
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
<script>
(function(){
const{E,Render,Runner,Bodies,Composite,Constraint,Matter}=Matter;
const e=E.create(),w=e.world;
const r=Render.create({element:document.body,engine:e,options:{width:800,height:500,wireframes:false,background:'${bgColor}',pixelRatio:1}});
${bodiesCode}
Render.run(r);const rn=Runner.create();Runner.run(rn,e);
setTimeout(()=>{Runner.stop(rn);Render.stop(r);window.__matter_rendered=true;},2500);
setTimeout(()=>{if(!window.__matter_rendered){Runner.stop(rn);Render.stop(r);window.__matter_rendered=true;}},6000);
})();
</script></body></html>`;

  const buffer = await renderWithRetry(async (page) => {
    await page.setViewport({ width: 800, height: 500, deviceScaleFactor: 1 });
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      () => (window as unknown as Record<string, unknown>).__matter_rendered === true,
      { timeout: 10000 },
    );
    return Buffer.from(await page.screenshot({ type: "png" }));
  });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
