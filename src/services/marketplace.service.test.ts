import { describe, it, expect } from "vitest";
import { MarketplaceService } from "./marketplace.service.js";

describe("MarketplaceService.listInstalled", () => {
  it("returns an array of InstalledItem objects", async () => {
    const service = new MarketplaceService();
    const items = await service.listInstalled();

    expect(Array.isArray(items)).toBe(true);
  });

  it("returns items with all required fields", async () => {
    const service = new MarketplaceService();
    const items = await service.listInstalled();

    for (const item of items) {
      expect(typeof item.name).toBe("string");
      expect(typeof item.slug).toBe("string");
      expect(typeof item.category).toBe("string");
      expect(typeof item.version_installed).toBe("string");
      expect(typeof item.installed_at).toBe("string");
      expect(typeof item.is_verified).toBe("boolean");
      expect(typeof item.has_update).toBe("boolean");
    }
  });

  it("returns items sorted by installed_at descending", async () => {
    const service = new MarketplaceService();
    const items = await service.listInstalled();

    for (let i = 1; i < items.length; i++) {
      const prev = new Date(items[i - 1].installed_at).getTime();
      const curr = new Date(items[i].installed_at).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("returns installed_at as valid ISO 8601 strings", async () => {
    const service = new MarketplaceService();
    const items = await service.listInstalled();

    for (const item of items) {
      const date = new Date(item.installed_at);
      expect(isNaN(date.getTime())).toBe(false);
    }
  });
});
