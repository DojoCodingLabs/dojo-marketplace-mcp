import express from "express";
import type { Request, Response, NextFunction } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getApiKeyFromHeader, validateApiKey } from "../auth/api-key.js";
import { logger } from "../utils/logger.js";

export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  const port = parseInt(process.env.MCP_PORT ?? "3000", 10);

  // Auth middleware
  app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
    const authCtx = validateApiKey(
      getApiKeyFromHeader(req.headers.authorization),
    );
    if (!authCtx.isValid) {
      res.status(401).json({ error: "Invalid or missing API key" });
      return;
    }
    next();
  });

  // Stateless: new transport per request
  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close().catch(() => {});
    });
  });

  app.listen(port, () => {
    logger.info(`MCP HTTP server listening on port ${port}`);
  });
}
