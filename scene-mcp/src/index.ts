#!/usr/bin/env npx tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { closeBrowser } from "./browser-pool.js";

import { recommendSceneTypeTool } from "./tools/recommend-scene-type.js";
import { previewThreePresetsTool } from "./tools/preview-three-presets.js";
import { renderThreeSceneTool } from "./tools/render-three-scene.js";
import { previewSplineSceneTool } from "./tools/preview-spline-scene.js";
import { renderSplineSceneTool } from "./tools/render-spline-scene.js";
import { previewRiveAnimationTool } from "./tools/preview-rive-animation.js";
import { renderRiveAnimationTool } from "./tools/render-rive-animation.js";
import { previewPhysicsPresetsTool } from "./tools/preview-physics-presets.js";
import { renderPhysicsSceneTool } from "./tools/render-physics-scene.js";
import { validateSceneParamsTool } from "./tools/validate-scene-params.js";

const tools = [
  recommendSceneTypeTool,
  previewThreePresetsTool,
  renderThreeSceneTool,
  previewSplineSceneTool,
  renderSplineSceneTool,
  previewRiveAnimationTool,
  renderRiveAnimationTool,
  previewPhysicsPresetsTool,
  renderPhysicsSceneTool,
  validateSceneParamsTool,
];

const server = new Server(
  { name: "scene-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  try {
    return await tool.handler(request.params.arguments ?? {});
  } catch (e) {
    return {
      content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
      isError: true,
    };
  }
});

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("scene-mcp server running on stdio");
