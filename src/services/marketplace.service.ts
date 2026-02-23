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
  name: string;
  slug: string;
  description: string;
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

export interface UninstallResult {
  success: boolean;
  item_name: string;
  removal_instructions: string;
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
  private apiKey: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      process.env.DOJO_API_BASE_URL ??
      "https://api.dojocoding.io";
    this.apiKey = process.env.DOJO_API_KEY ?? "";
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  // ── Internal API caller ───────────────────────────────

  private async callApi(
    action: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const url = `${this.baseUrl}/functions/v1/marketplace-mcp-api`;
    logger.debug("callApi", { action, params });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ action, ...params }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as Record<string, string>).error ||
          `API error: ${response.status}`,
      );
    }

    return response.json();
  }

  // ── Browse ────────────────────────────────────────────

  async search(params: SearchParams): Promise<SearchResponse> {
    logger.info("MarketplaceService.search", { params });

    const data = (await this.callApi("search", {
      query: params.query,
      category: params.category,
      tag: params.tag,
      limit: params.limit ?? 10,
    })) as { items: MarketplaceSearchResult[]; total: number };

    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      hasMore: (data.total ?? 0) > (data.items?.length ?? 0),
    };
  }

  async listCategories(): Promise<MarketplaceCategory[]> {
    logger.info("MarketplaceService.listCategories");
    const data = (await this.callApi("list_categories")) as string[];

    const CATEGORY_DISPLAY: Record<
      string,
      { name: string; description: string }
    > = {
      skill: {
        name: "Skills",
        description: "Reusable skill files for AI coding assistants",
      },
      plugin: {
        name: "Plugins",
        description: "MCP server plugins that extend assistant capabilities",
      },
      tool: {
        name: "Tools",
        description:
          "Standalone developer tools and CLI utilities",
      },
    };

    return data.map((slug) => {
      const display = CATEGORY_DISPLAY[slug] ?? {
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        description: "",
      };
      return { name: display.name, slug, description: display.description };
    });
  }

  async getDetails(itemId: string): Promise<MarketplaceItem | null> {
    logger.info("MarketplaceService.getDetails", { itemId });
    const data = await this.callApi("detail", { slug: itemId });
    return (data as MarketplaceItem) ?? null;
  }

  async getItemDetail(slug: string): Promise<MarketplaceItemDetail | null> {
    logger.info("MarketplaceService.getItemDetail", { slug });
    const data = await this.callApi("detail", { slug });
    return (data as MarketplaceItemDetail) ?? null;
  }

  async getReviews(itemId: string): Promise<MarketplaceReview[]> {
    logger.debug("MarketplaceService.getReviews (stub)", { itemId });
    return []; // TODO: Not supported by Edge Function yet
  }

  // ── Install ───────────────────────────────────────────

  private async resolveSlug(slug: string): Promise<ResolvedItem> {
    const url = `${this.baseUrl}/api/marketplace/items/${encodeURIComponent(slug)}`;
    logger.debug("resolveSlug", { url });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to resolve slug "${slug}": HTTP ${res.status}`);
    }
    return (await res.json()) as ResolvedItem;
  }

  private async getVersionRecord(
    itemId: string,
    version: string,
  ): Promise<VersionRecord> {
    const url = `${this.baseUrl}/api/marketplace/items/${encodeURIComponent(itemId)}/versions/${encodeURIComponent(version)}`;
    logger.debug("getVersionRecord", { url });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch version "${version}": HTTP ${res.status}`,
      );
    }
    return (await res.json()) as VersionRecord;
  }

  private async incrementDownloadCount(itemId: string): Promise<void> {
    const url = `${this.baseUrl}/api/marketplace/rpc/increment_marketplace_download`;
    logger.debug("incrementDownloadCount", { itemId });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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

  async install(slug: string, version?: string): Promise<InstallResult> {
    logger.info("marketplace_install starting", { slug, version });

    // Step 1: Resolve slug -> item metadata
    const item = await this.resolveSlug(slug);
    const targetVersion = version ?? item.latest_version;

    // Step 2: Get version record (file_url, file_hash, etc.)
    const versionRecord = await this.getVersionRecord(item.id, targetVersion);

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
        error: "Integrity check failed — file hash mismatch",
      };
    }

    // Step 5: Extract ZIP to ~/.claude/{category_plural}/{slug}/
    const installDir = getInstallDir(item.category, item.slug);
    await extractZip(zipBuffer, installDir);

    // Step 6: Increment download count (fire-and-forget)
    this.incrementDownloadCount(item.id).catch((err) => {
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

  async uninstall(itemId: string): Promise<UninstallResult> {
    logger.info("MarketplaceService.uninstall", { itemId });
    const data = (await this.callApi("uninstall", {
      slug: itemId,
    })) as UninstallResult;
    return data;
  }

  async listInstalled(): Promise<InstalledItem[]> {
    logger.info("MarketplaceService.listInstalled");
    const data = (await this.callApi("list_installed")) as InstalledItem[];
    return data ?? [];
  }

  // ── Publish (stubs — not yet supported by Edge Function) ──

  async publish(params: PublishParams): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.publish (stub)", params);
    return null; // TODO: implement when Edge Function supports publish
  }

  async updateListing(
    itemId: string,
    updates: Partial<PublishParams>,
  ): Promise<MarketplaceItem | null> {
    logger.debug("MarketplaceService.updateListing (stub)", {
      itemId,
      updates,
    });
    return null; // TODO: implement when Edge Function supports update
  }

  async deprecate(itemId: string): Promise<boolean> {
    logger.debug("MarketplaceService.deprecate (stub)", { itemId });
    return false; // TODO: implement when Edge Function supports deprecate
  }

  // ── Account (stubs — not yet supported by Edge Function) ──

  async getProfile(): Promise<UserProfile | null> {
    logger.debug("MarketplaceService.getProfile (stub)");
    return null; // TODO: implement when Edge Function supports profile
  }

  async getPurchases(): Promise<MarketplaceItem[]> {
    logger.debug("MarketplaceService.getPurchases (stub)");
    return []; // TODO: implement when Edge Function supports purchases
  }
}
