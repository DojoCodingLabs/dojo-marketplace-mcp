import type { MarketplaceItemDetail } from "../services/marketplace.service.js";

function formatInstallationSection(detail: MarketplaceItemDetail): string {
  const category = detail.category.toLowerCase();

  if (category === "skill" || category === "skills") {
    return [
      "### Installation (Skill)",
      "",
      "Copy the `.md` file into your project's skills directory:",
      "",
      "```bash",
      `curl -o .claude/skills/${detail.slug}.md <skill-url>`,
      "```",
      "",
      detail.installation_instructions,
    ].join("\n");
  }

  if (category === "plugin" || category === "plugins") {
    return [
      "### Installation (Plugin)",
      "",
      "Add the following to your `settings.json`:",
      "",
      "```json",
      JSON.stringify(detail.config_snippet, null, 2),
      "```",
      "",
      detail.installation_instructions,
    ].join("\n");
  }

  return [
    "### Installation (Tool)",
    "",
    "```bash",
    detail.installation_instructions,
    "```",
  ].join("\n");
}

export function formatItemDetailMarkdown(
  detail: MarketplaceItemDetail,
): string {
  const verified = detail.is_verified ? " [Verified]" : "";
  const lines: string[] = [];

  lines.push(`# ${detail.name}${verified}`);
  lines.push("");

  lines.push(
    [
      `**Author:** ${detail.author_name}`,
      `**Category:** ${detail.category}`,
      `**Version:** ${detail.latest_version}`,
      `**Installs:** ${detail.install_count.toLocaleString()}`,
    ].join(" | "),
  );
  lines.push("");

  if (detail.tags.length > 0) {
    lines.push(`**Tags:** ${detail.tags.join(", ")}`);
    lines.push("");
  }

  lines.push("## Description");
  lines.push("");
  lines.push(detail.description);
  lines.push("");

  lines.push(formatInstallationSection(detail));
  lines.push("");

  if (detail.config_snippet && Object.keys(detail.config_snippet).length > 0) {
    lines.push("### MCP Configuration");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(detail.config_snippet, null, 2));
    lines.push("```");
    lines.push("");
  }

  const linkLines: string[] = [];
  if (detail.repo_url) {
    linkLines.push(`- **Repository:** ${detail.repo_url}`);
  }
  if (detail.homepage_url) {
    linkLines.push(`- **Homepage:** ${detail.homepage_url}`);
  }
  if (linkLines.length > 0) {
    lines.push("### Links");
    lines.push("");
    lines.push(...linkLines);
    lines.push("");
  }

  if (detail.version_history.length > 0) {
    lines.push("### Version History");
    lines.push("");
    const recent = detail.version_history.slice(0, 5);
    for (const v of recent) {
      lines.push(`- **${v.version}** (${v.releasedAt}): ${v.changelog}`);
    }
    if (detail.version_history.length > 5) {
      lines.push(
        `- ... and ${detail.version_history.length - 5} earlier versions`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
