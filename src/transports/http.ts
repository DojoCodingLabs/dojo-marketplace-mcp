import express from "express";
import type { Request, Response, NextFunction } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";
import { getApiKeyFromHeader, validateApiKey } from "../auth/api-key.js";
import { logger } from "../utils/logger.js";

// Extend Express Request to carry the validated API key per-request
declare global {
  namespace Express {
    interface Request {
      dojoApiKey?: string;
    }
  }
}

export async function startHttpServer(
  server: McpServer,
  _service: MarketplaceService,
): Promise<void> {
  const app = express();
  app.use(express.json());

  const port = parseInt(process.env.MCP_PORT ?? "3000", 10);

  // Auth middleware — validate API key per request and attach to req
  app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
    const apiKey = getApiKeyFromHeader(req.headers.authorization);
    const authCtx = validateApiKey(apiKey);
    if (!authCtx.isValid) {
      res.status(401).json({ error: "Invalid or missing API key" });
      return;
    }
    // Store on request object — no shared-state mutation
    req.dojoApiKey = authCtx.apiKey;
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
