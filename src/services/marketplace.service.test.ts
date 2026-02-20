import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarketplaceService } from "./marketplace.service.js";

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

    const result = await service.install("test-skill", undefined, "fake-key");

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

    const result = await service.install("test-skill", "2.0.0", "fake-key");

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

    const result = await service.install("test-skill", undefined, "fake-key");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(result.file_hash).toBe("abc123hash");
  });

  it("throws when slug resolution fails (404)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );

    await expect(
      service.install("nonexistent", undefined, "fake-key"),
    ).rejects.toThrow(/Failed to resolve slug/);
  });

  it("throws when version fetch fails", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResolvedItemResponse())
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      service.install("test-skill", "9.9.9", "fake-key"),
    ).rejects.toThrow(/Failed to fetch version/);
  });
});
