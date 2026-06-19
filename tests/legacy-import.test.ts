import { describe, expect, it } from "vitest";
import { normalizeAsset } from "../src/lib/assets/schema";
import { parseFrontmatter } from "../src/lib/assets/registry";
import {
  legacyCardToAssetMarkdown,
  legacySkillToArchiveMarkdown
} from "../src/lib/legacy/import";

const legacyCard = `---
name: pre-push-quality-gate
description: "Run local gates before pushing."
metadata:
  id: "pre-push-quality-gate"
  type: "engineering"
  title: "Pre-push verification gates"
  summary_zh: "push 前先跑本地门禁"
  tags: "quality-gate,ci"
  status: "valid"
  context_cost: "low"
  verify_command: "npm run check"
  verify_expected: "All gates pass."
  verify_failure_next: "Fix failures before push."
---

## Trigger

Before push.
`;

const legacySkill = `---
name: lihan-cards
description: Consult captured experience.
allowed-tools: Bash Read
---

# lihan-cards

Single entry skill.
`;

describe("legacy import transforms", () => {
  it("converts legacy card metadata into the current asset schema", () => {
    const markdown = legacyCardToAssetMarkdown({
      sourceRelativePath: "ai/cards/pre-push-quality-gate.md",
      text: legacyCard
    });
    const asset = normalizeAsset(
      parseFrontmatter(markdown),
      "ai/cards/legacy/pre-push-quality-gate.md"
    );

    expect(asset).toMatchObject({
      id: "pre-push-quality-gate",
      kind: "card",
      domain: "coding",
      visibility: "team",
      title: "Pre-push verification gates",
      summary_zh: "push 前先跑本地门禁",
      tags: ["quality-gate", "ci", "legacy-card"],
      routes: ["codex", "claude-code"]
    });
  });

  it("archives the legacy lihan-cards skill outside the installable skill registry", () => {
    const markdown = legacySkillToArchiveMarkdown({
      sourceRelativePath: "skills/lihan-cards/SKILL.md",
      text: legacySkill
    });

    expect(() => parseFrontmatter(markdown)).toThrow(/missing YAML frontmatter/);
    expect(markdown).toContain("active runtime skill is `ai/skills/workflow-home/SKILL.md`");
    expect(markdown).toContain("Single entry skill.");
  });
});
