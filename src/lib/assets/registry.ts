import { promises as fs } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { ASSET_SCHEMA_VERSION, type AiAsset, normalizeAsset, secretFindings } from "./schema";

export interface AiAssetRegistry {
  schema_version: string;
  generated_at: string;
  assets: AiAsset[];
}

export interface RepositoryValidation {
  assets: AiAsset[];
  errors: string[];
}

const ASSET_DIRS = ["cards", "prompts", "connectors", "profiles"];
const KIND_ORDER = ["card", "prompt", "skill", "connector", "profile"];
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const REGISTRY_FIELDS = new Set(["schema_version", "generated_at", "assets"]);
const DIRECTORY_KIND: Record<string, AiAsset["kind"]> = {
  "ai/cards/": "card",
  "ai/prompts/": "prompt",
  "ai/connectors/": "connector",
  "ai/profiles/": "profile",
  "ai/skills/": "skill"
};

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function markdownFilesIn(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFilesIn(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function collectAssetFiles(root: string): Promise<string[]> {
  const aiRoot = path.join(root, "ai");
  const files: string[] = [];
  for (const dir of ASSET_DIRS) {
    files.push(...(await markdownFilesIn(path.join(aiRoot, dir))));
  }

  const skillsRoot = path.join(aiRoot, "skills");
  if (await pathExists(skillsRoot)) {
    const skillFiles = await markdownFilesIn(skillsRoot);
    files.push(...skillFiles.filter((file) => path.basename(file) === "SKILL.md"));
  }

  return files.sort((a, b) => toPosix(path.relative(root, a)).localeCompare(toPosix(path.relative(root, b))));
}

export async function validateRepository(root = process.cwd()): Promise<RepositoryValidation> {
  const files = await collectAssetFiles(root);
  const assets: AiAsset[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const relativePath = toPosix(path.relative(root, file));
    const text = await fs.readFile(file, "utf8");
    const findings = secretFindings(text);
    if (findings.length > 0) {
      errors.push(`${relativePath}: secret-like content found: ${findings.join(", ")}`);
      continue;
    }

    try {
      assets.push(normalizeAsset(parseFrontmatter(text), relativePath));
    } catch (error) {
      errors.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  errors.push(...validateAssets(assets));
  return { assets, errors };
}

export function validateAssets(assets: AiAsset[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const asset of assets) {
    const previous = seen.get(asset.id);
    if (previous) {
      errors.push(`duplicate asset id '${asset.id}' in ${previous} and ${asset.path}`);
    } else {
      seen.set(asset.id, asset.path);
    }

    const expectedKind = expectedKindForPath(asset.path);
    if (expectedKind && asset.kind !== expectedKind) {
      errors.push(`${asset.path}: kind '${asset.kind}' does not match directory kind '${expectedKind}'`);
    }
  }

  return errors;
}

function expectedKindForPath(assetPath: string): AiAsset["kind"] | undefined {
  for (const [prefix, kind] of Object.entries(DIRECTORY_KIND)) {
    if (assetPath.startsWith(prefix)) {
      return kind;
    }
  }
  return undefined;
}

export function parseFrontmatter(text: string): Record<string, unknown> {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error("missing YAML frontmatter delimited by ---");
  }

  const parsed = parseYaml(match[1]);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("frontmatter must parse to a mapping");
  }
  return parsed as Record<string, unknown>;
}

export function registryFromAssets(assets: AiAsset[], generatedAt = new Date().toISOString()): AiAssetRegistry {
  return {
    schema_version: ASSET_SCHEMA_VERSION,
    generated_at: generatedAt,
    assets: [...assets].sort((a, b) => {
      const kindDelta = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
      return kindDelta === 0 ? a.id.localeCompare(b.id) : kindDelta;
    })
  };
}

export function comparableRegistry(registry: AiAssetRegistry): Omit<AiAssetRegistry, "generated_at"> {
  return {
    schema_version: registry.schema_version,
    assets: registry.assets
  };
}

export function parseExistingRegistry(value: unknown): AiAssetRegistry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("registry must be an object");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!REGISTRY_FIELDS.has(key)) {
      throw new Error(`unknown registry field '${key}'`);
    }
  }
  if (record.schema_version !== ASSET_SCHEMA_VERSION) {
    throw new Error(`registry schema_version must be ${ASSET_SCHEMA_VERSION}`);
  }
  if (typeof record.generated_at !== "string" || record.generated_at.trim() === "") {
    throw new Error("registry generated_at must be a non-empty string");
  }
  if (!Array.isArray(record.assets)) {
    throw new Error("registry assets must be an array");
  }
  return record as unknown as AiAssetRegistry;
}

export function registryWithStableTimestamp(
  assets: AiAsset[],
  previous: AiAssetRegistry | undefined,
  generatedAt = new Date().toISOString()
): AiAssetRegistry {
  const next = registryFromAssets(assets, generatedAt);
  if (
    previous &&
    JSON.stringify(comparableRegistry(previous)) === JSON.stringify(comparableRegistry(next))
  ) {
    return { ...next, generated_at: previous.generated_at };
  }
  return next;
}

async function readExistingRegistry(root: string): Promise<AiAssetRegistry | undefined> {
  try {
    const registryPath = path.join(root, "ai", "registry", "assets.json");
    return parseExistingRegistry(JSON.parse(await fs.readFile(registryPath, "utf8")));
  } catch {
    return undefined;
  }
}

export async function writeRegistry(root = process.cwd()): Promise<AiAssetRegistry> {
  const validation = await validateRepository(root);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }

  const previous = await readExistingRegistry(root);
  const registry = registryWithStableTimestamp(validation.assets, previous);
  const registryDir = path.join(root, "ai", "registry");
  await fs.mkdir(registryDir, { recursive: true });
  await fs.writeFile(
    path.join(registryDir, "assets.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  );
  return registry;
}
