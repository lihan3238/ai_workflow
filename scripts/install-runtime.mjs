#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installTargets, planInstall } from "../src/lib/runtime/install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;
const manageGlobalGuides = process.argv.includes("--manage-global-guides");

if (!process.env.HOME) {
  console.error("error: HOME is not set; refusing to plan runtime installation.");
  process.exit(1);
}

async function inspectTarget(target) {
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink()) {
      return { kind: "symlink", linkTarget: await fs.readlink(target) };
    }
    return { kind: stat.isDirectory() ? "directory" : "file" };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function backupPath(target) {
  let candidate = `${target}.bak`;
  let index = 1;
  while (true) {
    try {
      await fs.lstat(candidate);
      candidate = `${target}.bak.${index}`;
      index += 1;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return candidate;
      }
      throw error;
    }
  }
}

async function applyStep(step) {
  if (step.action === "skip") {
    return;
  }
  if (step.action === "blocked-external-symlink") {
    throw new Error(
      `refusing to replace external symlink at ${step.target}; update the global guide manually or remove the link yourself`
    );
  }

  await fs.mkdir(path.dirname(step.target), { recursive: true });
  if (step.action === "backup-and-link") {
    const backup = await backupPath(step.target);
    await fs.rename(step.target, backup);
    console.log(`backup ${step.target} -> ${backup}`);
  }

  await fs.symlink(step.source, step.target);
}

const targets = installTargets(repoRoot, process.env.HOME ?? "", { manageGlobalGuides });
for (const target of targets) {
  try {
    await fs.lstat(target.source);
  } catch (error) {
    console.error(`error: install source missing for ${target.label}: ${target.source}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
const state = {};
for (const target of targets) {
  const inspected = await inspectTarget(target.target);
  if (inspected) {
    state[target.target] = inspected;
  }
}

const plan = planInstall(targets, state);

console.log(dryRun ? "Runtime install dry-run:" : "Runtime install apply:");
if (!manageGlobalGuides) {
  console.log("Global AGENTS.md/CLAUDE.md guides are not managed by default. Pass --manage-global-guides to opt in.");
}
for (const step of plan) {
  console.log(`${step.action.padEnd(15)} ${step.target} -> ${step.source}`);
}

const blocked = plan.filter((step) => step.action === "blocked-external-symlink");
if (blocked.length > 0) {
  console.log("\nBlocked external symlinks:");
  for (const step of blocked) {
    console.log(`- ${step.target}`);
  }
  console.log("No changes made to blocked paths. Remove or edit those links manually if intentional.");
  if (apply) {
    process.exit(1);
  }
}

if (apply) {
  for (const step of plan) {
    await applyStep(step);
  }
  console.log("Runtime install complete.");
} else {
  console.log("No changes made. Re-run with --apply to install.");
}
