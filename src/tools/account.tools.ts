import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MarketplaceService } from "../services/marketplace.service.js";

export function registerAccountTools(
  server: McpServer,
  service: MarketplaceService,
) {
  const getProfile = server.tool(
    "marketplace_get_profile",
    "Get the authenticated user's marketplace profile",
    async () => {
      try {
        const profile = await service.getProfile();
        if (!profile) {
          return {
            content: [
              { type: "text" as const, text: "Profile not found" },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(profile, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting profile: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const getPurchases = server.tool(
    "marketplace_get_purchases",
    "List all marketplace items purchased by the authenticated user",
    async () => {
      try {
        const purchases = await service.getPurchases();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(purchases, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting purchases: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return [getProfile, getPurchases];
}
