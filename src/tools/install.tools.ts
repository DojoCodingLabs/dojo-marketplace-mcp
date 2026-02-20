import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";

export function registerInstallTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const install = server.tool(
    "marketplace_install",
    "Install a marketplace item by slug. Downloads the item ZIP, verifies integrity via SHA256, and extracts to the appropriate local directory (~/.claude/skills|plugins|tools/{slug}/). Returns config snippet and setup instructions.",
    {
      slug: z
        .string()
        .describe("Item slug identifier (e.g. 'my-cool-skill')"),
      version: z
        .string()
        .optional()
        .describe(
          "Specific version to install (e.g. '1.2.0'). Defaults to latest if omitted.",
        ),
    },
    async (args) => {
      try {
        const result = await service.install(args.slug, args.version);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
          ...(result.success ? {} : { isError: true }),
        };
      } catch (err) {
        const errorResponse = {
          success: false,
          error: `Error installing item: ${(err as Error).message}`,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(errorResponse, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  const uninstall = server.tool(
    "marketplace_uninstall",
    "Uninstall a previously installed marketplace item. Idempotent — re-uninstalling returns success.",
    {
      itemId: z.string().describe("The unique ID of the item to uninstall"),
    },
    async (args) => {
      try {
        const result = await service.uninstall(args.itemId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error uninstalling item: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const listInstalled = server.tool(
    "marketplace_list_installed",
    "List all currently installed marketplace items",
    async () => {
      try {
        const items = await service.listInstalled();
        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No marketplace items are currently installed. Use marketplace_search to browse available items and marketplace_install to install one.",
              },
            ],
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(items, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing installed items: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return [install, uninstall, listInstalled];
}
