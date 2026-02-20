import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../utils/logger.js";

export async function connectStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  logger.info("Starting stdio transport");
  await server.connect(transport);
  logger.info("MCP server connected via stdio");
}
