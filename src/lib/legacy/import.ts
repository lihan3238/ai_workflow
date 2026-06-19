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

export function legacySkillToArchiveMarkdown(input: LegacyInput): string {
  const { body } = parseMarkdown(input.text);
  return `# Legacy lihan-cards skill source snapshot

> Migration snapshot from \`${input.sourceRelativePath}\`. The active runtime skill is \`ai/skills/workflow-home/SKILL.md\`; this file is reference material only and is intentionally outside \`ai/skills\`.

${body.trimEnd()}
`;
}
