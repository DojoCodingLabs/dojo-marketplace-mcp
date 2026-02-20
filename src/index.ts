#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MarketplaceService } from "./services/marketplace.service.js";
import { getApiKeyFromEnv, validateApiKey } from "./auth/api-key.js";
import { logger } from "./utils/logger.js";
import { connectStdio } from "./transports/stdio.js";
import { startHttpServer } from "./transports/http.js";
import { registerBrowseTools } from "./tools/browse.tools.js";
import { registerInstallTools } from "./tools/install.tools.js";
import { registerPublishTools } from "./tools/publish.tools.js";
import { registerAccountTools } from "./tools/account.tools.js";

// ── Toolset configuration ─────────────────────────────

type ToolsetName = "browse" | "install" | "publish" | "account";

const ALL_TOOLSETS: ToolsetName[] = ["browse", "install", "publish", "account"];
const DEFAULT_TOOLSETS: ToolsetName[] = ["browse", "install"];

function parseEnabledToolsets(): Set<ToolsetName> {
  const envVal = process.env.DOJO_TOOLSETS;
  if (!envVal) return new Set(DEFAULT_TOOLSETS);

  const requested = envVal.split(",").map((s) => s.trim().toLowerCase());
  const valid = new Set<ToolsetName>();

  for (const name of requested) {
    if (ALL_TOOLSETS.includes(name as ToolsetName)) {
      valid.add(name as ToolsetName);
    } else {
      logger.warn(`Unknown toolset "${name}" in DOJO_TOOLSETS, ignoring`);
    }
  }

  if (valid.size === 0) {
    logger.warn("No valid toolsets specified, falling back to defaults");
    return new Set(DEFAULT_TOOLSETS);
  }

  return valid;
}

// ── Main ───────────────────────────────────────────────

async function main() {
  const transportMode = process.env.TRANSPORT_MODE ?? "stdio";

  // Validate API key early in stdio mode
  if (transportMode === "stdio") {
    const authCtx = validateApiKey(getApiKeyFromEnv());
    if (!authCtx.isValid) {
      logger.error("DOJO_API_KEY is required. Set it in your environment.");
      process.exit(1);
    }
  }

  const server = new McpServer({
    name: "dojo-marketplace",
    version: "0.1.0",
  });

  const service = new MarketplaceService();
  const enabledToolsets = parseEnabledToolsets();
  logger.info("Enabled toolsets", { toolsets: [...enabledToolsets] });

  // Register ALL tools before connect (SDK requirement),
  // then disable toolsets that are not enabled.
  const toolsetRegistry: Record<
    ToolsetName,
    ReturnType<typeof registerBrowseTools>
  > = {
    browse: registerBrowseTools(server, service),
    install: registerInstallTools(server, service),
    publish: registerPublishTools(server, service),
    account: registerAccountTools(server, service),
  };

  for (const [name, tools] of Object.entries(toolsetRegistry)) {
    if (!enabledToolsets.has(name as ToolsetName)) {
      for (const tool of tools) {
        tool.disable();
      }
      logger.debug(`Disabled toolset: ${name}`);
    }
  }

  // Start transport
  if (transportMode === "http") {
    await startHttpServer(server);
  } else {
    await connectStdio(server);
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down");
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error("Fatal error", {
    error: (err as Error).message,
    stack: (err as Error).stack,
  });
  process.exit(1);
});
