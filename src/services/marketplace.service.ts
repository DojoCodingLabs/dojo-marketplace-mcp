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

export interface VersionHistoryEntry {
  version: string;
  releasedAt: string;
  changelog: string;
}

export interface MarketplaceItemDetail {
  slug: string;
  name: string;
  description: string;
  category: string;
  author_name: string;
  install_count: number;
  is_verified: boolean;
  repo_url: string | null;
  homepage_url: string | null;
  config_snippet: Record<string, unknown>;
  installation_instructions: string;
  latest_version: string;
  version_history: VersionHistoryEntry[];
  tags: string[];
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

export interface SearchParams {
  query: string;
  category?: string;
  page?: number;
  pageSize?: number;
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
  async search(params: SearchParams): Promise<MarketplaceItem[]> {
    logger.debug("MarketplaceService.search (stub)", params);
    return []; // TODO (DOJ-2008)
  }

  async listCategories(): Promise<MarketplaceCategory[]> {
    logger.debug("MarketplaceService.listCategories (stub)");
    return []; // TODO (DOJ-2008)
  }

  async getDetails(itemId: string): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.getDetails (stub)", { itemId });
    return null; // TODO (DOJ-2009)
  }

  async getItemDetail(slug: string): Promise<MarketplaceItemDetail | null> {
    logger.debug("MarketplaceService.getItemDetail (stub)", { slug });
    return null; // TODO (DOJ-2009): call backend get_marketplace_item_detail RPC
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
