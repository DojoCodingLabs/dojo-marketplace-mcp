import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";

export function registerPublishTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const publish = server.tool(
    "marketplace_publish",
    "Publish a new item to the Dojo marketplace",
    {
      name: z.string().describe("Name of the item"),
      description: z.string().describe("Description of the item"),
      version: z.string().describe("Semantic version (e.g. 1.0.0)"),
      category: z.string().describe("Category ID to publish under"),
    },
    async (args) => {
      try {
        const result = await service.publish(args);
        if (!result) {
          return {
            content: [
              { type: "text" as const, text: "Failed to publish item" },
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
              text: `Error publishing item: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const updateListing = server.tool(
    "marketplace_update_listing",
    "Update an existing marketplace listing",
    {
      itemId: z.string().describe("The unique ID of the item to update"),
      name: z.string().optional().describe("Updated name"),
      description: z.string().optional().describe("Updated description"),
      version: z.string().optional().describe("Updated version"),
      category: z.string().optional().describe("Updated category ID"),
    },
    async (args) => {
      try {
        const { itemId, ...updates } = args;
        const result = await service.updateListing(itemId, updates);
        if (!result) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Failed to update item: ${itemId}`,
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
              text: `Error updating listing: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const deprecate = server.tool(
    "marketplace_deprecate",
    "Deprecate a marketplace item so it is no longer available for installation",
    {
      itemId: z.string().describe("The unique ID of the item to deprecate"),
    },
    async (args) => {
      try {
        const success = await service.deprecate(args.itemId);
        return {
          content: [
            {
              type: "text" as const,
              text: success
                ? `Successfully deprecated item: ${args.itemId}`
                : `Failed to deprecate item: ${args.itemId}`,
            },
          ],
          ...(success ? {} : { isError: true }),
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deprecating item: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return [publish, updateListing, deprecate];
}
