import { logger } from "../utils/logger.js";
import {
  computeSha256,
  downloadFile,
  extractZip,
  getInstallDir,
} from "../utils/install-helpers.js";

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

/** Category determines the install directory under ~/.claude/ */
export type ItemCategory = "skill" | "plugin" | "tool";

/** Version record returned by the API for a specific item version */
export interface VersionRecord {
  id: string;
  item_id: string;
  version: string;
  file_url: string;
  file_hash: string;
  file_size_bytes: number;
  config_snippet: Record<string, unknown>;
  instructions: string;
  post_install_notes: string;
  created_at: string;
}

/** Resolved item metadata returned by slug lookup */
export interface ResolvedItem {
  id: string;
  slug: string;
  name: string;
  category: ItemCategory;
  latest_version: string;
}

/** Structured response from the install flow */
export interface InstallResult {
  success: boolean;
  item_name: string;
  version_installed: string;
  config_snippet: Record<string, unknown>;
  instructions: string;
  post_install_notes: string;
  file_hash: string;
  error?: string;
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

  private async resolveSlug(
    slug: string,
    apiKey: string,
  ): Promise<ResolvedItem> {
    const url = `${this.baseUrl}/api/marketplace/items/${encodeURIComponent(slug)}`;
    logger.debug("resolveSlug", { url });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to resolve slug "${slug}": HTTP ${res.status}`);
    }
    return (await res.json()) as ResolvedItem;
  }

  private async getVersionRecord(
    itemId: string,
    version: string,
    apiKey: string,
  ): Promise<VersionRecord> {
    const url = `${this.baseUrl}/api/marketplace/items/${encodeURIComponent(itemId)}/versions/${encodeURIComponent(version)}`;
    logger.debug("getVersionRecord", { url });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch version "${version}": HTTP ${res.status}`);
    }
    return (await res.json()) as VersionRecord;
  }

  private async incrementDownloadCount(
    itemId: string,
    apiKey: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/marketplace/rpc/increment_marketplace_download`;
    logger.debug("incrementDownloadCount", { itemId });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (!res.ok) {
      logger.warn("Failed to increment download count", {
        itemId,
        status: res.status,
      });
    }
  }

  async install(
    slug: string,
    version?: string,
    apiKey?: string,
  ): Promise<InstallResult> {
    const key = apiKey ?? process.env.DOJO_API_KEY ?? "";
    logger.info("marketplace_install starting", { slug, version });

    // Step 1: Resolve slug -> item metadata
    const item = await this.resolveSlug(slug, key);
    const targetVersion = version ?? item.latest_version;

    // Step 2: Get version record (file_url, file_hash, etc.)
    const versionRecord = await this.getVersionRecord(
      item.id,
      targetVersion,
      key,
    );

    // Step 3: Download ZIP from Supabase Storage
    const zipBuffer = await downloadFile(versionRecord.file_url);

    // Step 4: SHA256 verification
    const computedHash = computeSha256(zipBuffer);
    if (computedHash !== versionRecord.file_hash) {
      logger.error("SHA256 mismatch", {
        expected: versionRecord.file_hash,
        computed: computedHash,
      });
      return {
        success: false,
        item_name: item.name,
        version_installed: targetVersion,
        config_snippet: {},
        instructions: "",
        post_install_notes: "",
        file_hash: computedHash,
        error: "Integrity check failed \u2014 file hash mismatch",
      };
    }

    // Step 5: Extract ZIP to ~/.claude/{category_plural}/{slug}/
    const installDir = getInstallDir(item.category, item.slug);
    await extractZip(zipBuffer, installDir);

    // Step 6: Increment download count (fire-and-forget)
    this.incrementDownloadCount(item.id, key).catch((err) => {
      logger.warn("incrementDownloadCount background error", {
        error: (err as Error).message,
      });
    });

    // Step 7: Return structured result
    logger.info("marketplace_install complete", {
      slug,
      version: targetVersion,
      installDir,
    });

    return {
      success: true,
      item_name: item.name,
      version_installed: targetVersion,
      config_snippet: versionRecord.config_snippet,
      instructions: versionRecord.instructions,
      post_install_notes: versionRecord.post_install_notes,
      file_hash: computedHash,
    };
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
