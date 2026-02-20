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
  name: string;
  slug: string;
  category: string;
  version_installed: string;
  installed_at: string;
  is_verified: boolean;
  has_update: boolean;
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
    // TODO (DOJ-2011): Replace with real get_user_marketplace_installs RPC call.
    // Real implementation: fetch installs, compare version_installed against
    // latest available version to derive has_update, sort by installed_at desc.
    const items: InstalledItem[] = [
      {
        name: "Dojo TypeScript Snippets",
        slug: "dojo-ts-snippets",
        category: "snippets",
        version_installed: "1.2.0",
        installed_at: "2026-02-15T10:30:00Z",
        is_verified: true,
        has_update: true,
      },
      {
        name: "React Component Generator",
        slug: "react-component-gen",
        category: "generators",
        version_installed: "2.0.1",
        installed_at: "2026-02-10T08:00:00Z",
        is_verified: true,
        has_update: false,
      },
      {
        name: "ESLint Config Dojo",
        slug: "eslint-config-dojo",
        category: "configs",
        version_installed: "0.9.0",
        installed_at: "2026-01-28T14:00:00Z",
        is_verified: false,
        has_update: false,
      },
    ];
    return items;
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
