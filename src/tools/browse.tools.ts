import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";

export function registerBrowseTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const search = server.tool(
    "marketplace_search",
    "Search the Dojo marketplace for items by query, category, or filters",
    {
      query: z.string().describe("Search query string"),
      category: z.string().optional().describe("Filter by category ID"),
      page: z.number().optional().default(1).describe("Page number"),
      pageSize: z
        .number()
        .optional()
        .default(20)
        .describe("Results per page"),
    },
    async (args) => {
      try {
        const results = await service.search(args);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(results, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching marketplace: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const listCategories = server.tool(
    "marketplace_list_categories",
    "List all available marketplace categories",
    async () => {
      try {
        const categories = await service.listCategories();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing categories: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const getDetails = server.tool(
    "marketplace_get_details",
    "Get detailed information about a specific marketplace item",
    {
      itemId: z.string().describe("The unique ID of the marketplace item"),
    },
    async (args) => {
      try {
        const details = await service.getDetails(args.itemId);
        if (!details) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Item not found: ${args.itemId}`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(details, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting details: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const getReviews = server.tool(
    "marketplace_get_reviews",
    "Get reviews for a specific marketplace item",
    {
      itemId: z.string().describe("The unique ID of the marketplace item"),
    },
    async (args) => {
      try {
        const reviews = await service.getReviews(args.itemId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(reviews, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting reviews: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return [search, listCategories, getDetails, getReviews];
}
