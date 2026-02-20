import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MarketplaceService } from "../services/marketplace.service.js";
import { registerInstallTools } from "./install.tools.js";

describe("marketplace_uninstall", () => {
  let service: MarketplaceService;
  let server: McpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toolHandler: (args: { slug: string }) => Promise<any>;

  beforeEach(() => {
    service = new MarketplaceService("https://fake.api");
    server = new McpServer({ name: "test", version: "0.0.0" });

    // Spy on server.tool to capture the handler callback for marketplace_uninstall
    const originalTool = server.tool.bind(server);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolSpy = vi.fn(function (this: any, ...toolArgs: any[]) {
      const name = toolArgs[0] as string;
      if (name === "marketplace_uninstall") {
        // Handler is always the last argument
        toolHandler = toolArgs[toolArgs.length - 1] as typeof toolHandler;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalTool.apply(server, toolArgs as any);
    });
    server.tool = toolSpy as typeof server.tool;

    registerInstallTools(server, service);
  });

  describe("service layer", () => {
    it("returns a structured UninstallResult", async () => {
      const result = await service.uninstall("my-skill-slug");
      expect(result).toEqual({
        success: true,
        item_name: "my-skill-slug",
        removal_instructions: expect.any(String),
      });
    });

    it("is idempotent — calling twice returns success both times", async () => {
      const first = await service.uninstall("already-uninstalled");
      const second = await service.uninstall("already-uninstalled");
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
    });
  });

  describe("tool handler", () => {
    it("returns JSON-serialized UninstallResult on success", async () => {
      const response = await toolHandler({ slug: "my-skill" });
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed).toEqual({
        success: true,
        item_name: "my-skill",
        removal_instructions: expect.any(String),
      });
    });

    it("does not set isError on success", async () => {
      const response = await toolHandler({ slug: "anything" });
      expect(response.isError).toBeUndefined();
    });

    it("returns isError when service throws", async () => {
      vi.spyOn(service, "uninstall").mockRejectedValueOnce(
        new Error("Network timeout"),
      );
      const response = await toolHandler({ slug: "fail-slug" });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("Network timeout");
    });

    it("includes removal_instructions in response", async () => {
      const response = await toolHandler({ slug: "my-tool" });
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed).toHaveProperty("removal_instructions");
      expect(typeof parsed.removal_instructions).toBe("string");
    });
  });
});
