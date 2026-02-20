import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import AdmZip from "adm-zip";
import type { ItemCategory } from "../services/marketplace.service.js";
import { logger } from "./logger.js";

/**
 * Compute SHA256 hex digest of a Buffer.
 */
export function computeSha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

const CATEGORY_DIR_MAP: Record<ItemCategory, string> = {
  skill: "skills",
  plugin: "plugins",
  tool: "tools",
};

/**
 * Determine the install directory based on item category and slug.
 *   skill  -> ~/.claude/skills/{slug}/
 *   plugin -> ~/.claude/plugins/{slug}/
 *   tool   -> ~/.claude/tools/{slug}/
 */
export function getInstallDir(category: ItemCategory, slug: string): string {
  const baseDir = join(homedir(), ".claude", CATEGORY_DIR_MAP[category]);
  const installDir = resolve(baseDir, slug);
  if (!installDir.startsWith(baseDir + "/") && installDir !== baseDir) {
    throw new Error(`Invalid slug: path traversal detected in "${slug}"`);
  }
  return installDir;
}

/**
 * Download a file from a URL and return the raw bytes as a Buffer.
 * Uses Node 18+ built-in fetch.
 */
export async function downloadFile(url: string): Promise<Buffer> {
  logger.debug("Downloading file", { url });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed: HTTP ${response.status} ${response.statusText}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract a ZIP buffer into a target directory.
 * Creates the target directory (and parents) if it does not exist.
 * Overwrites existing files for idempotent re-installs.
 */
export async function extractZip(
  zipBuffer: Buffer,
  targetDir: string,
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(targetDir, true);
  logger.debug("ZIP extracted", { targetDir, entries: zip.getEntries().length });
}
