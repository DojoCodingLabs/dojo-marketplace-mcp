import { logger } from "../utils/logger.js";

// ── Types ──────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  rating: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  itemCount: number;
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface InstalledItem {
  id: string;
  name: string;
  version: string;
  installedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}

export interface MarketplaceSearchResult {
  name: string;
  description: string;
  category: string;
  install_count: number;
  slug: string;
  is_verified: boolean;
  author_name: string;
}

export interface SearchResponse {
  items: MarketplaceSearchResult[];
  total: number;
  hasMore: boolean;
}

export interface SearchParams {
  query: string;
  category?: string;
  tag?: string;
  limit?: number;
}

export interface PublishParams {
  name: string;
  description: string;
  version: string;
  category: string;
}

// ── Service ────────────────────────────────────────────

export class MarketplaceService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      process.env.DOJO_API_BASE_URL ??
      "https://api.dojocoding.io";
  }

  // Browse
  async search(params: SearchParams): Promise<SearchResponse> {
    const { query, category, tag, limit = 10 } = params;

    const url = new URL(`${this.baseUrl}/api/marketplace/items`);
    url.searchParams.set("query", query);
    if (category) url.searchParams.set("category", category);
    if (tag) url.searchParams.set("tag", tag);
    url.searchParams.set("limit", String(limit));

    const apiKey = process.env.DOJO_API_KEY ?? "";
    logger.debug("MarketplaceService.search", { url: url.toString(), limit });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      logger.error("marketplace search request failed", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      items: MarketplaceSearchResult[];
      total: number;
    };

    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      hasMore: (data.total ?? 0) > (data.items?.length ?? 0),
    };
  }

  async listCategories(): Promise<MarketplaceCategory[]> {
    logger.debug("MarketplaceService.listCategories (stub)");
    return []; // TODO (DOJ-2008)
  }

  async getDetails(itemId: string): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.getDetails (stub)", { itemId });
    return null; // TODO (DOJ-2009)
  }

  async getReviews(itemId: string): Promise<MarketplaceReview[]> {
    logger.debug("MarketplaceService.getReviews (stub)", { itemId });
    return []; // TODO (DOJ-2009)
  }

  // Install
  async install(itemId: string): Promise<InstalledItem | null> {
    logger.debug("MarketplaceService.install (stub)", { itemId });
    return null; // TODO (DOJ-2010)
  }

  async uninstall(itemId: string): Promise<boolean> {
    logger.debug("MarketplaceService.uninstall (stub)", { itemId });
    return false; // TODO (DOJ-2012)
  }

  async listInstalled(): Promise<InstalledItem[]> {
    logger.debug("MarketplaceService.listInstalled (stub)");
    return []; // TODO (DOJ-2011)
  }

  // Publish
  async publish(params: PublishParams): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.publish (stub)", params);
    return null;
  }

  async updateListing(
    itemId: string,
    updates: Partial<PublishParams>,
  ): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.updateListing (stub)", {
      itemId,
      updates,
    });
    return null;
  }

  async deprecate(itemId: string): Promise<boolean> {
    logger.debug("MarketplaceService.deprecate (stub)", { itemId });
    return false;
  }

  // Account
  async getProfile(): Promise<UserProfile | null> {
    logger.debug("MarketplaceService.getProfile (stub)");
    return null;
  }

  async getPurchases(): Promise<MarketplaceItem[]> {
    logger.debug("MarketplaceService.getPurchases (stub)");
    return [];
  }
}
