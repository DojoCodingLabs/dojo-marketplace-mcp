import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";

export function registerInstallTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const install = server.tool(
    "marketplace_install",
    "Install a marketplace item by its ID",
    {
      itemId: z.string().describe("The unique ID of the item to install"),
    },
    async (args) => {
      try {
        const result = await service.install(args.itemId);
        if (!result) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Failed to install item: ${args.itemId}`,
              },
            ],
            isError: true,
          };
        }
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
              text: `Error installing item: ${(err as Error).message}`,
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
