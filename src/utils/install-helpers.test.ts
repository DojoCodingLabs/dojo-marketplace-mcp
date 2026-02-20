import { describe, it, expect } from "vitest";
import { computeSha256, getInstallDir } from "./install-helpers.js";

describe("computeSha256", () => {
  it("computes correct SHA256 hex digest", () => {
    const buf = Buffer.from("hello world");
    expect(computeSha256(buf)).toBe(
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
  });

  it("returns different hashes for different input", () => {
    const a = computeSha256(Buffer.from("aaa"));
    const b = computeSha256(Buffer.from("bbb"));
    expect(a).not.toBe(b);
  });

  it("returns consistent hash for same input", () => {
    const buf = Buffer.from("test data");
    expect(computeSha256(buf)).toBe(computeSha256(buf));
  });
});

describe("getInstallDir", () => {
  it("maps skill category to ~/.claude/skills/{slug}", () => {
    const dir = getInstallDir("skill", "my-skill");
    expect(dir).toMatch(/\.claude\/skills\/my-skill$/);
  });

  it("maps plugin category to ~/.claude/plugins/{slug}", () => {
    const dir = getInstallDir("plugin", "my-plugin");
    expect(dir).toMatch(/\.claude\/plugins\/my-plugin$/);
  });

  it("maps tool category to ~/.claude/tools/{slug}", () => {
    const dir = getInstallDir("tool", "my-tool");
    expect(dir).toMatch(/\.claude\/tools\/my-tool$/);
  });

  it("throws on path traversal slugs", () => {
    expect(() => getInstallDir("skill", "../../.ssh")).toThrow(
      "path traversal detected",
    );
    expect(() => getInstallDir("plugin", "../../../etc")).toThrow(
      "path traversal detected",
    );
  });
});
