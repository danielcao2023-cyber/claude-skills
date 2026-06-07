#!/usr/bin/env npx tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { closeBrowser } from "./browser-pool.js";

import { previewChartTypesTool } from "./tools/preview-chart-types.js";
import { previewColorSchemesTool } from "./tools/preview-color-schemes.js";
import { previewFinalChartTool } from "./tools/preview-final-chart.js";
import { renderEchartsTool } from "./tools/render-echarts.js";
import { previewMapStylesTool } from "./tools/preview-map-styles.js";
import { renderMapboxTool } from "./tools/render-mapbox.js";
import { validateChartDataTool } from "./tools/validate-chart-data.js";

const tools = [
  previewChartTypesTool,
  previewColorSchemesTool,
  previewFinalChartTool,
  renderEchartsTool,
  previewMapStylesTool,
  renderMapboxTool,
  validateChartDataTool,
];

const server = new Server(
  { name: "chart-mcp", version: "0.1.0" },
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
console.error("chart-mcp server running on stdio");
