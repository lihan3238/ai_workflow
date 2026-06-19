import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  legacyCardToAssetMarkdown,
  legacySkillToArchiveMarkdown
} from "../src/lib/legacy/import";

const DEFAULT_SOURCE = "/mnt/c/lihan_work/github_repos/lihan3238.github.io";

const LEGACY_CARDS = [
  "ai/cards/model-decoupled-project-philosophy.md",
  "ai/cards/prefer-upstream-tools-over-bespoke-plumbing.md",
  "ai/cards/agents-md-as-cross-tool-project-memory.md",
  "ai/cards/pre-push-quality-gate.md"
];

const LEGACY_SKILL = "skills/lihan-cards/SKILL.md";

const LEGACY_SKILL_REFERENCES = [
  "skills/lihan-cards/references/modes.md",
  "skills/lihan-cards/references/boundary.md",
  "skills/lihan-cards/references/capture.md",
  "skills/lihan-cards/references/classification.md",
  "skills/lihan-cards/references/debugging.md",
  "skills/lihan-cards/references/failure-modes.md",
  "skills/lihan-cards/references/proactive.md",
  "skills/lihan-cards/references/research.md",
  "skills/lihan-cards/references/science-claims.md",
  "skills/lihan-cards/references/science-compute.md",
  "skills/lihan-cards/references/science-notes.md"
];

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

async function readSource(sourceRoot: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(sourceRoot, relativePath), "utf8");
}

async function writeFile(target: string, content: string, apply: boolean): Promise<void> {
  if (!apply) {
    console.log(`would write ${target}`);
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
  console.log(`wrote ${target}`);
}

async function main(): Promise<void> {
  const sourceRoot = argValue("--source", DEFAULT_SOURCE);
  const apply = process.argv.includes("--apply");
  const repoRoot = process.cwd();

  for (const relativePath of LEGACY_CARDS) {
    const text = await readSource(sourceRoot, relativePath);
    await writeFile(
      path.join(repoRoot, "ai", "cards", "legacy", path.basename(relativePath)),
      legacyCardToAssetMarkdown({ sourceRelativePath: relativePath, text }),
      apply
    );
  }

  const skillText = await readSource(sourceRoot, LEGACY_SKILL);
  await writeFile(
    path.join(repoRoot, "docs", "legacy", "lihan-cards-skill", "SKILL.md"),
    legacySkillToArchiveMarkdown({ sourceRelativePath: LEGACY_SKILL, text: skillText }),
    apply
  );

  for (const relativePath of LEGACY_SKILL_REFERENCES) {
    const text = await readSource(sourceRoot, relativePath);
    await writeFile(
      path.join(
        repoRoot,
        "docs",
        "legacy",
        "lihan-cards-skill",
        "references",
        path.basename(relativePath)
      ),
      text,
      apply
    );
  }

  if (!apply) {
    console.log("No files written. Re-run with --apply to import the legacy snapshot.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
