import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarketplaceService } from "./marketplace.service.js";

// ── install tests ──────────────────────────────────────

vi.mock("../utils/install-helpers.js", () => ({
  computeSha256: vi.fn(() => "abc123hash"),
  downloadFile: vi.fn(() => Promise.resolve(Buffer.from("fake-zip"))),
  extractZip: vi.fn(() => Promise.resolve()),
  getInstallDir: vi.fn(() => "/tmp/test-install"),
}));

function makeResolvedItemResponse(overrides = {}) {
  return new Response(
    JSON.stringify({
      id: "item-1",
      slug: "test-skill",
      name: "Test Skill",
      category: "skill",
      latest_version: "1.0.0",
      ...overrides,
    }),
    { status: 200 },
  );
}

function makeVersionRecordResponse(overrides = {}) {
  return new Response(
    JSON.stringify({
      id: "ver-1",
      item_id: "item-1",
      version: "1.0.0",
      file_url: "https://storage.test/file.zip",
      file_hash: "abc123hash",
      file_size_bytes: 1024,
      config_snippet: { mcpServers: {} },
      instructions: "Run it",
      post_install_notes: "Enjoy",
      created_at: "2025-01-01",
      ...overrides,
    }),
    { status: 200 },
  );
}

describe("MarketplaceService.install", () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService("https://fake-api.test");
    service.setApiKey("fake-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success with correct fields on happy path", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResolvedItemResponse())
      .mockResolvedValueOnce(makeVersionRecordResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await service.install("test-skill");

    expect(result.success).toBe(true);
    expect(result.item_name).toBe("Test Skill");
    expect(result.version_installed).toBe("1.0.0");
    expect(result.file_hash).toBe("abc123hash");
    expect(result.config_snippet).toEqual({ mcpServers: {} });
    expect(result.instructions).toBe("Run it");
    expect(result.post_install_notes).toBe("Enjoy");
    expect(result.error).toBeUndefined();
  });

  it("uses specified version instead of latest", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResolvedItemResponse())
      .mockResolvedValueOnce(
        makeVersionRecordResponse({ version: "2.0.0" }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await service.install("test-skill", "2.0.0");

    expect(result.success).toBe(true);
    expect(result.version_installed).toBe("2.0.0");

    // Verify the version was passed in the URL
    const versionFetchCall = mockFetch.mock.calls[1];
    expect(versionFetchCall[0]).toContain("versions/2.0.0");
  });

  it("returns success: false on SHA256 mismatch", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResolvedItemResponse())
      .mockResolvedValueOnce(
        makeVersionRecordResponse({ file_hash: "DIFFERENT_HASH" }),
      );

    const result = await service.install("test-skill");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(result.file_hash).toBe("abc123hash");
  });

  it("throws when slug resolution fails (404)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );

    await expect(
      service.install("nonexistent"),
    ).rejects.toThrow(/Failed to resolve slug/);
  });

  it("throws when version fetch fails", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResolvedItemResponse())
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      service.install("test-skill", "9.9.9"),
    ).rejects.toThrow(/Failed to fetch version/);
  });
});

// ── callApi-based method tests ────────────────────────

describe("MarketplaceService.listInstalled", () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService("https://fake-api.test");
    service.setApiKey("fake-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls list_installed action and returns the result", async () => {
    const mockItems = [
      {
        name: "Test Skill",
        slug: "test-skill",
        category: "skill",
        version_installed: "1.0.0",
        installed_at: "2026-02-15T10:30:00Z",
        is_verified: true,
        has_update: false,
      },
    ];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockItems), { status: 200 }),
    );

    const items = await service.listInstalled();

    expect(items).toEqual(mockItems);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://fake-api.test/functions/v1/marketplace-mcp-api",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "list_installed" }),
      }),
    );
  });

  it("returns empty array when API returns null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("null", { status: 200 }),
    );

    const items = await service.listInstalled();
    expect(items).toEqual([]);
  });
});

describe("MarketplaceService.search", () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService("https://fake-api.test");
    service.setApiKey("fake-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls search action with params and returns formatted result", async () => {
    const mockData = {
      items: [{ name: "Skill A", slug: "skill-a" }],
      total: 1,
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 }),
    );

    const result = await service.search({ query: "test", limit: 5 });

    expect(result.items).toEqual(mockData.items);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

describe("MarketplaceService.listCategories", () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService("https://fake-api.test");
    service.setApiKey("fake-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps category slugs to full category objects", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(["skill", "plugin", "tool"]), {
        status: 200,
      }),
    );

    const categories = await service.listCategories();

    expect(categories).toEqual([
      {
        name: "Skills",
        slug: "skill",
        description: "Reusable skill files for AI coding assistants",
      },
      {
        name: "Plugins",
        slug: "plugin",
        description: "MCP server plugins that extend assistant capabilities",
      },
      {
        name: "Tools",
        slug: "tool",
        description: "Standalone developer tools and CLI utilities",
      },
    ]);
  });

  it("handles unknown categories gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(["skill", "unknown"]), { status: 200 }),
    );

    const categories = await service.listCategories();

    expect(categories[1]).toEqual({
      name: "Unknown",
      slug: "unknown",
      description: "",
    });
  });
});

describe("MarketplaceService.uninstall", () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService("https://fake-api.test");
    service.setApiKey("fake-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls uninstall action with slug", async () => {
    const mockResult = {
      success: true,
      item_name: "test-skill",
      removal_instructions: "Removed.",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResult), { status: 200 }),
    );

    const result = await service.uninstall("test-skill");

    expect(result).toEqual(mockResult);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://fake-api.test/functions/v1/marketplace-mcp-api",
      expect.objectContaining({
        body: JSON.stringify({ action: "uninstall", slug: "test-skill" }),
      }),
    );
  });
});
