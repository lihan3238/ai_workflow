import { describe, expect, it } from "vitest";
import { normalizeAsset } from "../src/lib/assets/schema";
import { parseFrontmatter } from "../src/lib/assets/registry";
import {
  legacyCardToAssetMarkdown,
  legacyPostToAstroMarkdown,
  legacySkillToSkillMarkdown,
  outputSlugFromLegacyPost
} from "../src/lib/legacy/import";

const legacyPost = `---
title: AI 时代人机协作工作流博客 V4 说明
description: 这个博客如何变成工作接口。
slug: blog_v4_ai_collaboration
date: 2026-05-13 20:50:00+0800
tags:
  - ai
  - workflow
hidden: false
draft: false
---

## 先说结论

博客是窗口，运行时是核心。
`;

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
  it("normalizes legacy Hugo posts into Astro content frontmatter", () => {
    expect(outputSlugFromLegacyPost("AI时代人机协作工作流博客V4说明", legacyPost)).toBe(
      "legacy-blog-v4-ai-collaboration"
    );

    const markdown = legacyPostToAstroMarkdown({
      sourceRelativePath: "content/post/AI时代人机协作工作流博客V4说明/index.md",
      text: legacyPost
    });

    const frontmatter = parseFrontmatter(markdown);
    expect(frontmatter).toMatchObject({
      title: "AI 时代人机协作工作流博客 V4 说明",
      description: "这个博客如何变成工作接口。",
      date: "2026-05-13",
      visibility: "public",
      tags: ["ai", "workflow", "legacy-blog"]
    });
    expect(markdown).toContain("迁移自旧 Hugo 博客");
    expect(markdown).toContain("博客是窗口，运行时是核心。");
  });

  it("normalizes unsupported legacy code fences for Astro rendering", () => {
    const markdown = legacyPostToAstroMarkdown({
      sourceRelativePath: "content/post/codex-remote-to-windows-via-wsl-ssh/index.md",
      text: legacyPost.replace("博客是窗口，运行时是核心。", "```sshconfig\nHost example\n```\n")
    });

    expect(markdown).toContain("```text\nHost example");
    expect(markdown).not.toContain("```sshconfig");
  });

  it("rewrites relative legacy image links to public legacy assets", () => {
    const markdown = legacyPostToAstroMarkdown({
      sourceRelativePath: "content/post/poem/index.md",
      text: legacyPost.replace("博客是窗口，运行时是核心。", "![山](imgs/mountain.jpg)\n")
    });

    expect(markdown).toContain("![山](/legacy/legacy-blog-v4-ai-collaboration/imgs/mountain.jpg)");
  });

  it("marks hidden or draft legacy posts private", () => {
    const markdown = legacyPostToAstroMarkdown({
      sourceRelativePath: "content/post/private/index.md",
      text: legacyPost.replace("hidden: false", "hidden: true")
    });

    expect(parseFrontmatter(markdown).visibility).toBe("private");
  });

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

  it("wraps the legacy lihan-cards skill as a non-default skill asset", () => {
    const markdown = legacySkillToSkillMarkdown({
      sourceRelativePath: "skills/lihan-cards/SKILL.md",
      text: legacySkill
    });
    const asset = normalizeAsset(parseFrontmatter(markdown), "ai/skills/lihan-cards-legacy/SKILL.md");

    expect(asset).toMatchObject({
      id: "lihan-cards-legacy",
      kind: "skill",
      domain: "coding",
      visibility: "team",
      title: "Legacy lihan-cards skill snapshot",
      tags: ["skills", "lihan-cards", "legacy-skill"]
    });
    expect(markdown).toContain("name: lihan-cards-legacy");
    expect(markdown).toContain("Single entry skill.");
  });
});
