import { promises as fs } from "node:fs";
import path from "node:path";
import {
  comparableRegistry,
  parseExistingRegistry,
  registryFromAssets,
  validateRepository,
  writeRegistry,
  type AiAssetRegistry
} from "../src/lib/assets/registry";

const checkOnly = process.argv.includes("--check");
const root = process.cwd();
const registryPath = path.join(root, "ai", "registry", "assets.json");

const validation = await validateRepository(root);
if (validation.errors.length > 0) {
  console.error("Cannot build registry; AI asset validation failed:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (checkOnly) {
  const expected = registryFromAssets(validation.assets);
  let existing: AiAssetRegistry | undefined;
  try {
    existing = parseExistingRegistry(JSON.parse(await fs.readFile(registryPath, "utf8")));
  } catch (error) {
    console.error(`Registry missing or unreadable at ${path.relative(root, registryPath)}.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!existing) {
    console.error("Registry missing or unreadable.");
    process.exit(1);
  }

  if (JSON.stringify(comparableRegistry(existing)) !== JSON.stringify(comparableRegistry(expected))) {
    console.error("Registry is out of date. Run `npm run build:registry`.");
    process.exit(1);
  }

  console.log(`Registry is current with ${existing.assets.length} assets.`);
} else {
  const registry = await writeRegistry(root);
  console.log(`Wrote ai/registry/assets.json with ${registry.assets.length} assets.`);
}
