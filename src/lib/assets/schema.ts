export const ASSET_SCHEMA_VERSION = "1.0.0";

export const KIND_VALUES = ["card", "prompt", "skill", "connector", "profile"] as const;
export const DOMAIN_VALUES = [
  "coding",
  "research",
  "writing",
  "environment",
  "principle"
] as const;
export const VISIBILITY_VALUES = ["public", "team", "private", "local-only"] as const;
export const STATUS_VALUES = ["valid", "stale", "retired", "draft"] as const;
export const CONTEXT_COST_VALUES = ["low", "medium", "high"] as const;

export type AssetKind = (typeof KIND_VALUES)[number];
export type AssetDomain = (typeof DOMAIN_VALUES)[number];
export type AssetVisibility = (typeof VISIBILITY_VALUES)[number];
export type AssetStatus = (typeof STATUS_VALUES)[number];
export type ContextCost = (typeof CONTEXT_COST_VALUES)[number];

export interface VerifyBlock {
  command: string;
  expected: string;
  failure_next: string;
}

export interface AiAsset {
  id: string;
  kind: AssetKind;
  domain: AssetDomain;
  visibility: AssetVisibility;
  status: AssetStatus;
  title: string;
  summary: string;
  summary_zh?: string;
  tags: string[];
  context_cost: ContextCost;
  routes: string[];
  verify: VerifyBlock;
  path: string;
}

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_FIELD_NAMES = new Set([
  "id",
  "kind",
  "domain",
  "visibility",
  "status",
  "title",
  "summary",
  "summary_zh",
  "description",
  "tags",
  "context_cost",
  "routes",
  "verify",
  "verify_command",
  "verify_expected",
  "verify_failure_next"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function fieldSource(raw: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(raw.metadata)) {
    return raw;
  }

  return {
    ...raw.metadata,
    name: raw.name,
    description: raw.description,
    summary: raw.summary ?? raw.description ?? raw.metadata.summary
  };
}

function assertKnownKeys(source: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) {
      throw new Error(`unknown ${label} '${key}'`);
    }
  }
}

function assertKnownAssetFields(raw: Record<string, unknown>): void {
  if (isRecord(raw.metadata)) {
    assertKnownKeys(raw.metadata, ASSET_FIELD_NAMES, "asset metadata field");
    return;
  }

  assertKnownKeys(raw, ASSET_FIELD_NAMES, "asset field");
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Asset field '${key}' must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Asset field '${key}' must be a string when present`);
  }
  return value.trim();
}

function requireEnum<T extends readonly string[]>(
  source: Record<string, unknown>,
  key: string,
  values: T
): T[number] {
  const value = requireString(source, key);
  if (!values.includes(value)) {
    throw new Error(`Asset field '${key}' must be one of ${values.join(", ")}, got '${value}'`);
  }
  return value as T[number];
}

function parseStringList(value: unknown, key: string): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item !== "string" || item.trim() === "") {
        throw new Error(`Asset field '${key}' must contain only non-empty strings`);
      }
      return item.trim();
    });
    if (items.length === 0) {
      throw new Error(`Asset field '${key}' must contain at least one item`);
    }
    return items;
  }

  if (typeof value === "string") {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) {
      throw new Error(`Asset field '${key}' must contain at least one item`);
    }
    return items;
  }

  throw new Error(`Asset field '${key}' must be a string array or comma-separated string`);
}

function parseVerify(source: Record<string, unknown>): VerifyBlock {
  const nested = isRecord(source.verify) ? source.verify : undefined;
  const command = nested?.command ?? source.verify_command;
  const expected = nested?.expected ?? source.verify_expected;
  const failureNext = nested?.failure_next ?? source.verify_failure_next;

  const verifySource = {
    "verify.command": command,
    "verify.expected": expected,
    "verify.failure_next": failureNext
  };

  for (const [key, value] of Object.entries(verifySource)) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Asset field '${key}' must be a non-empty string`);
    }
  }

  return {
    command: String(command).trim(),
    expected: String(expected).trim(),
    failure_next: String(failureNext).trim()
  };
}

function assertKebab(value: string, field: string): void {
  if (!KEBAB_RE.test(value)) {
    throw new Error(`Asset field '${field}' must be kebab-case, got '${value}'`);
  }
}

function assertTags(tags: string[]): void {
  for (const tag of tags) {
    assertKebab(tag, "tags");
  }
}

export function normalizeAsset(raw: Record<string, unknown>, filePath: string): AiAsset {
  assertKnownAssetFields(raw);
  const source = fieldSource(raw);
  const path = normalizedPath(filePath);
  const id = optionalString(source, "id") ?? optionalString(source, "name");
  if (!id) {
    throw new Error("Asset field 'id' must be a non-empty string");
  }
  assertKebab(id, "id");

  const tags = parseStringList(source.tags, "tags");
  assertTags(tags);

  const routes = source.routes === undefined ? [] : parseStringList(source.routes, "routes");

  return {
    id,
    kind: requireEnum(source, "kind", KIND_VALUES),
    domain: requireEnum(source, "domain", DOMAIN_VALUES),
    visibility: requireEnum(source, "visibility", VISIBILITY_VALUES),
    status: requireEnum(source, "status", STATUS_VALUES),
    title: requireString(source, "title"),
    summary: optionalString(source, "summary") ?? requireString(source, "description"),
    summary_zh: optionalString(source, "summary_zh"),
    tags,
    context_cost: requireEnum(source, "context_cost", CONTEXT_COST_VALUES),
    routes,
    verify: parseVerify(source),
    path
  };
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["OpenAI-style secret token", /\bsk-[A-Za-z0-9_-]{10,}\b/g],
  ["Bearer token", /\bBearer\s+[A-Za-z0-9._~+/=-]{10,}\b/gi],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/g],
  ["sensitive field assignment", /\b(?:password|passwd|token|secret|cookie|private[_-]?key|restic_password|cloudflare_api_token)\b\s*[:=]\s*["']?[^\s"']{4,}/gi]
];

export function secretFindings(text: string): string[] {
  const findings: string[] = [];
  for (const [name, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      findings.push(name);
    }
  }
  return findings;
}
