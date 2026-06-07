# scene-mcp

MCP server for 3D scene + animation rendering for PPT generation.

**Tools:** three.js (3D WebGL), Spline (3D design embed), rive (vector animation), matter.js (2D physics)

**Output:** PNG @2x for .pptx, HTML snippet for frontend-slides

**Pattern:** Mirrors chart-mcp architecture — Puppeteer singleton, template color palette auto-extraction, preview→select→confirm→render user loop.
