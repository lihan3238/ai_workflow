import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

interface LegacyInput {
  sourceRelativePath: string;
  text: string;
}

interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMarkdown(text: string): ParsedMarkdown {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error("legacy markdown is missing YAML frontmatter");
  }

  const parsed = parseYaml(match[1]);
  if (!isRecord(parsed)) {
    throw new Error("legacy frontmatter must parse to a mapping");
  }

  return {
    frontmatter: parsed,
    body: text.slice(match[0].length).trimStart()
  };
}

function yamlBlock(value: Record<string, unknown>): string {
  return `---\n${stringifyYaml(value, { lineWidth: 0 }).trimEnd()}\n---\n\n`;
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`legacy field '${key}' must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`legacy field '${key}' must be a string when present`);
  }
  return value.trim();
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function kebab(value: string): string {
  return value
    .trim()
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function uniqueTags(tags: string[], extra: string): string[] {
  const seen = new Set<string>();
  const normalized = [...tags.map(kebab), extra]
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    });
  return normalized.length > 0 ? normalized : [extra];
}

function ymd(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) {
    throw new Error(`legacy date must contain YYYY-MM-DD, got '${text}'`);
  }
  return match[0];
}

function boolValue(value: unknown): boolean {
  return value === true || value === "true";
}

function sourceDirName(sourceRelativePath: string): string {
  const parts = sourceRelativePath.split(/[\\/]/).filter(Boolean);
  return parts.at(-2) ?? parts.at(-1) ?? "legacy";
}

function normalizeLegacyMarkdownBody(body: string): string {
  return body.replace(/^```sshconfig\b/gm, "```text");
}

function rewriteRelativeAssetLinks(body: string, slug: string): string {
  return body.replace(/(!\[[^\]]*\]\()((?!https?:\/\/|\/|#)[^)]+)(\))/g, (_match, prefix, target, suffix) => {
    return `${prefix}/legacy/${slug}/${String(target).trim()}${suffix}`;
  });
}

export function outputSlugFromLegacyPost(sourceRelativePath: string, text: string): string {
  const { frontmatter } = parseMarkdown(text);
  const slugSource = optionalString(frontmatter, "slug") ?? sourceDirName(sourceRelativePath);
  const slug = kebab(slugSource);
  if (!slug) {
    throw new Error(`could not derive slug for ${sourceRelativePath}`);
  }
  return `legacy-${slug}`;
}

export function legacyPostToAstroMarkdown(input: LegacyInput): string {
  const { frontmatter, body } = parseMarkdown(input.text);
  const slug = outputSlugFromLegacyPost(input.sourceRelativePath, input.text);
  const title = requireString(frontmatter, "title");
  const description = optionalString(frontmatter, "description") ?? title;
  const visibility =
    boolValue(frontmatter.hidden) || boolValue(frontmatter.draft) || frontmatter.password
      ? "private"
      : "public";

  const nextFrontmatter = {
    title,
    description,
    date: ymd(frontmatter.date),
    tags: uniqueTags(stringList(frontmatter.tags), "legacy-blog"),
    visibility
  };

  const nextBody = rewriteRelativeAssetLinks(normalizeLegacyMarkdownBody(body), slug);
  return `${yamlBlock(nextFrontmatter)}> 迁移自旧 Hugo 博客：\`${input.sourceRelativePath}\`。这是迁移快照，用于验证新工作流系统的内容链路。\n\n${nextBody.trimEnd()}\n`;
}

function legacyDomain(value: unknown): string {
  switch (value) {
    case "principle":
      return "principle";
    case "research":
      return "research";
    case "environment":
      return "environment";
    case "engineering":
    default:
      return "coding";
  }
}

export function legacyCardToAssetMarkdown(input: LegacyInput): string {
  const { frontmatter, body } = parseMarkdown(input.text);
  const metadata = frontmatter.metadata;
  if (!isRecord(metadata)) {
    throw new Error("legacy card must contain metadata mapping");
  }

  const id = requireString(metadata, "id");
  const nextFrontmatter = {
    id,
    kind: "card",
    domain: legacyDomain(metadata.type),
    visibility: "team",
    status: optionalString(metadata, "status") ?? "valid",
    title: optionalString(metadata, "title") ?? requireString(frontmatter, "name"),
    summary: requireString(frontmatter, "description"),
    summary_zh: optionalString(metadata, "summary_zh"),
    tags: uniqueTags(stringList(metadata.tags), "legacy-card"),
    context_cost: optionalString(metadata, "context_cost") ?? "low",
    routes: ["codex", "claude-code"],
    verify: {
      command: requireString(metadata, "verify_command"),
      expected: requireString(metadata, "verify_expected"),
      failure_next: requireString(metadata, "verify_failure_next")
    }
  };

  return `${yamlBlock(nextFrontmatter)}${body.trimEnd()}\n`;
}

export function legacySkillToSkillMarkdown(input: LegacyInput): string {
  const { frontmatter, body } = parseMarkdown(input.text);
  const description = requireString(frontmatter, "description");
  const nextFrontmatter = {
    name: "lihan-cards-legacy",
    description: `${description} Imported as a non-default AI Workflow Home migration snapshot.`,
    metadata: {
      id: "lihan-cards-legacy",
      kind: "skill",
      domain: "coding",
      visibility: "team",
      status: "valid",
      title: "Legacy lihan-cards skill snapshot",
      summary_zh: "旧博客 lihan-cards 技能迁移快照",
      tags: "skills,lihan-cards,legacy-skill",
      context_cost: "medium",
      routes: "codex,claude-code",
      verify_command: "npm run validate && npm run check:registry",
      verify_expected: "Legacy skill snapshot validates as an AI Workflow Home skill asset.",
      verify_failure_next: "Fix transformed metadata before using the snapshot for migration tests."
    }
  };

  return `${yamlBlock(nextFrontmatter)}> Migration snapshot from \`${input.sourceRelativePath}\`. The active runtime remains \`workflow-home\`; this skill is imported for compatibility testing and reference.\n\n${body.trimEnd()}\n`;
}
