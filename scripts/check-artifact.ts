import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { auditArtifactFiles } from "../src/lib/site-artifact";
import { parseSiteMode } from "../src/lib/site-mode";

const args = process.argv.slice(2);

function argValue(name: string, fallback: string): string {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function collectFiles(root: string, current = root): Promise<Record<string, string>> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: Record<string, string> = {};
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(root, fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".html") || entry.name.endsWith(".json"))) {
      files[toPosix(path.relative(root, fullPath))] = await fs.readFile(fullPath, "utf8");
    }
  }
  return files;
}

const mode = parseSiteMode(argValue("--mode", "operator"));
const dir = argValue("--dir", "dist-operator");

try {
  const files = await collectFiles(dir);
  const findings = auditArtifactFiles(mode, files);
  if (findings.length > 0) {
    console.error(`Artifact check failed for ${mode} build at ${dir}:`);
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }
  console.log(`Artifact check passed for ${mode} build at ${dir}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
