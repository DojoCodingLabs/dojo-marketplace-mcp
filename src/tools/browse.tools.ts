import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";
import { formatItemDetailMarkdown } from "../utils/format-detail.js";

export function registerBrowseTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const search = server.tool(
    "marketplace_search",
    "Search the Dojo marketplace for skills, plugins, and tools",
    {
      query: z.string().describe("Search term"),
      category: z
        .enum(["skill", "plugin", "tool"])
        .optional()
        .describe("Filter by category"),
      tag: z.string().optional().describe("Filter by tag slug"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Maximum number of results to return"),
    },
    async (args) => {
      try {
        const response = await service.search(args);

        if (response.items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No marketplace items found for query: "${args.query}". Try broader search terms or a different category.`,
              },
            ],
          };
        }

        const lines: string[] = [JSON.stringify(response.items, null, 2)];
        if (response.hasMore) {
          lines.push(
            `\n(Showing ${response.items.length} of ${response.total} results. Increase 'limit' to see more.)`,
          );
        }

        return {
          content: [{ type: "text" as const, text: lines.join("") }],
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

  const getItemDetail = server.tool(
    "marketplace_detail",
    "Get full details for a marketplace item by its slug, including description, installation instructions, config snippet, and version history",
    {
      slug: z
        .string()
        .describe(
          "The slug identifier of the marketplace item (e.g. 'my-awesome-tool')",
        ),
    },
    async (args) => {
      try {
        const detail = await service.getItemDetail(args.slug);
        if (!detail) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Marketplace item not found: "${args.slug}". Check the slug and try again, or use marketplace_search to find available items.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: formatItemDetailMarkdown(detail),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting item details: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return [search, listCategories, getDetails, getReviews, getItemDetail];
}
