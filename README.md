# Claude Skills — 专业可视化工具集

内置 6 种专业 Web 可视化工具的 MCP Server，为 PPT 生成、数据报告、前端演示等场景提供图表渲染、3D 场景和物理动画能力。

---

## 架构总览

```
claude-skills/
├── chart-mcp/          ← MCP Server：数据图表 + 地图渲染（7 个 tools）
├── scene-mcp/          ← MCP Server：3D 场景 + 动画渲染（10 个 tools）
└── ppt-to-video/       ← PPT 视频转换
```

两个 MCP Server 均采用 **TypeScript + Puppeteer + MCP stdio** 架构，通过 CDN 加载前端库到浏览器页 → 渲染 → 高清截图 → PNG@2x。

---

## chart-mcp — 数据图表 & 地图

### 工具列表（7 个）

| Tool | 功能 |
|------|------|
| `preview_chart_types` | 根据数据特征推荐最佳图表类型，附带缩略图预览 |
| `preview_color_schemes` | 生成 3 种配色方案（模板主色/暖色调/对比色） |
| `preview_final_chart` | 生成 1:1 预览图供用户最终确认 |
| `render_echarts` | 渲染 echarts 图表为高清 PNG（@2x） |
| `preview_map_styles` | 生成 3 种 Mapbox 地图风格预览 |
| `render_mapbox` | 渲染 Mapbox 静态地图为高清 PNG（@2x） |
| `validate_chart_data` | 校验图表数据格式 |

### 支持的图表类型

柱状图 · 折线图 · 饼图 · 散点图 · 雷达图 · 漏斗图 · 热力图

### 支持的 Mapbox 风格

亮色街道 · 暗色街道 · 卫星混合 · 卫星纯图 · 户外

### 核心能力

- **模板色板自动适配** — 从 PPT 模板 `detail.json` 提取 `theme_colors`，生成 echarts theme
- **数据智能推荐** — 根据数据特征（时间序列/占比/对比维度）自动推荐最合适的 chart type
- **Puppeteer 渲染** — 浏览器实例复用，首渲 ~3s，后续 ~1s
- **自动重试** — 失败后重启浏览器重试 1 次

### 快速开始

```bash
cd chart-mcp
npm install
npx tsx src/index.ts    # 启动 MCP server (stdio)
```

### MCP 配置

```json
{
  "mcpServers": {
    "chart-mcp": {
      "command": "npx",
      "args": ["tsx", "/path/to/claude-skills/chart-mcp/src/index.ts"],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "${MAPBOX_ACCESS_TOKEN}"
      }
    }
  }
}
```

> **Mapbox Token**: 在 [mapbox.com](https://www.mapbox.com) 免费注册获取。不设置不影响 echarts 图表功能。

---

## scene-mcp — 3D 场景 & 动画

### 工具列表（10 个）

| 类别 | Tool | 功能 |
|------|------|------|
| 推荐 | `recommend_scene_type` | 根据 slide role 推荐最合适的 3D/动画工具 |
| three.js | `preview_three_presets` | 生成 5 种 3D 场景缩略图预览 |
| three.js | `render_three_scene` | 渲染 three.js 3D 场景为高清 PNG（WebGL@2x） |
| Spline | `preview_spline_scene` | 验证并预览 Spline 场景 |
| Spline | `render_spline_scene` | 渲染 Spline 场景为高清 PNG |
| rive | `preview_rive_animation` | 加载 .riv 动画并预览首帧 |
| rive | `render_rive_animation` | 渲染 rive 动画指定帧为 PNG |
| matter.js | `preview_physics_presets` | 生成 5 种物理场景缩略图预览 |
| matter.js | `render_physics_scene` | 运行物理模拟并截图高清 PNG（Canvas@2x） |
| 校验 | `validate_scene_params` | 校验场景参数合法性 |

### three.js 预设场景（5 种）

| 场景 | 效果 |
|------|------|
| 粒子星空 | 2000 个彩色光点三维旋转，深邃科技感 |
| 几何抽象 | 二十面体+环结+方块+十二面体组合，现代艺术风 |
| 产品展台 | 圆柱展台 + 中心旋转物体 + 发光装饰环 |
| 波形平面 | 顶点位移波浪网格 + 透明线框，流动数据感 |
| 3D 文字 | Canvas 贴图大标题 + 浮动装饰几何体 + 粒子背景 |

### matter.js 预设场景（5 种）

| 场景 | 效果 |
|------|------|
| 重力掉落 | 彩色方块从天而降，在底部堆积 |
| 碰撞球 | 5 球牛顿摆式碰撞，能量传递 |
| 多摆系统 | 6 个钟摆联动，节奏韵律感 |
| 布料模拟 | 30×20 粒子网格模拟软体飘动 |
| 流体模拟 | 150 个粒子流经漏斗障碍物 |

### Spline 支持

用户提供 Spline 场景分享链接（`my.spline.com/...`），scene-mcp 通过 `<spline-viewer>` Web Component 嵌入 → Puppeteer 截图。

### rive 支持

用户提供 `.riv` 文件 URL，scene-mcp 通过 rive-wasm runtime 加载 → Canvas 渲染 → 截取指定帧（或首帧）。

### 快速开始

```bash
cd scene-mcp
npm install
npx tsx src/index.ts    # 启动 MCP server (stdio)
```

### MCP 配置

```json
{
  "mcpServers": {
    "scene-mcp": {
      "command": "npx",
      "args": ["tsx", "/path/to/claude-skills/scene-mcp/src/index.ts"]
    }
  }
}
```

> 无需任何 API Key。three.js、Spline、rive、matter.js 全部通过 CDN 加载。

---

## 技术栈

| 技术 | chart-mcp | scene-mcp |
|------|-----------|-----------|
| 运行环境 | Node.js + TypeScript (`tsx`) | 同 |
| 协议 | MCP stdio | 同 |
| 浏览器引擎 | Puppeteer (headless Chromium) | 同，加上 `--use-gl=swiftshader --enable-webgl` |
| 前端库 | echarts@5.5.1 (CDN) | three@0.160.0 / spline-viewer@1.9.0 / rive-canvas@2.21.0 / matter-js@0.20.0 |
| API 依赖 | Mapbox Static Images API (需 Token) | 无（全部 CDN） |
| 数据校验 | Zod | 同 |
| 模板色板 | `detail.json` → HSL 色板生成 | 同（复用相同算法） |
| 输出格式 | PNG@2x (3840×2160) | 同 |

### 为什么用 CDN 而非 npm？

echarts/three.js 等在 Puppeteer 的 `data:text/html` URL 中执行。importmap + ES module 在 data URL 场景下不稳定，全局构建版本（`*.min.js`）更可靠。

---

## 用户交互模式

两个 MCP Server 采用统一的 **四步决策循环**：

```
preview（生成缩略图预览）
  → select（用户在多个选项中点击选择）
    → confirm（生成 1:1 预览确认）
      → render（最终高清渲染输出 PNG）
```

所有决策节点都会明确询问用户，不会自动跳过。

---

## 集成方式

### ppt-generator skill

在 PPT 制作流程的 **Phase 4.5** 自动检测需要可视化的内容：

- 📊 数据表格 → 触发 chart-mcp
- 🗺️ 地理数据 → 触发 chart-mcp (mapbox)
- 🎨 3D/动画需求 → 触发 scene-mcp

生成的高清 PNG 自动插入到 `.pptx` 对应页面的图片占位符。

### frontend-slides skill

在网页版 PPT 中，chart-mcp 和 scene-mcp 还能输出 **HTML 嵌入片段**（echarts option JSON / three.js scene code / Spline viewer / rive canvas），实现交互式图表和动画。

---

## 设计原则

1. **Fat Server, Thin Skill** — 渲染逻辑、参数校验、智能推荐全部在 MCP Server 中完成，Skill 层只负责对话编排
2. **自包含** — 两个 Server 各自独立，共享工具代码按需复制（不引入跨项目依赖）
3. **渐进式复杂度** — 最简单的操作用默认参数一键渲染，高级操作用覆盖参数精细控制
4. **兜底优先** — 模板色板不可用时用通用色板，CDN 加载失败触发超时回调，不阻塞流程

---

## 许可

MIT License

---

## 相关资源

- [PPT 可视化工具使用指南（Word）](docs/PPT可视化工具使用指南.docx)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [echarts 文档](https://echarts.apache.org/)
- [Mapbox Static Images API](https://docs.mapbox.com/api/maps/static-images/)
- [three.js 文档](https://threejs.org/)
- [Spline](https://spline.design/)
- [rive](https://rive.app/)
- [matter.js](https://brm.io/matter-js/)
