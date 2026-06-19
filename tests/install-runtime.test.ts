import { describe, expect, it } from "vitest";
import { installTargets, planInstall } from "../src/lib/runtime/install.mjs";

describe("runtime installer planning", () => {
  it("targets only the named Codex and Claude Code skill paths by default", () => {
    const targets = installTargets("/repo", "/home/lihan");

    expect(targets.map((target) => target.target)).toEqual([
      "/home/lihan/.codex/skills/workflow-home",
      "/home/lihan/.claude/skills/workflow-home"
    ]);
  });

  it("targets global guide paths only when explicitly requested", () => {
    const targets = installTargets("/repo", "/home/lihan", { manageGlobalGuides: true });

    expect(targets.map((target) => target.target)).toEqual([
      "/home/lihan/.codex/skills/workflow-home",
      "/home/lihan/.claude/skills/workflow-home",
      "/home/lihan/.codex/AGENTS.md",
      "/home/lihan/.claude/CLAUDE.md"
    ]);
  });

  it("backs up real files, skips already-correct symlinks, and blocks external symlinks", () => {
    const targets = installTargets("/repo", "/home/lihan", { manageGlobalGuides: true });
    const plan = planInstall(targets, {
      "/home/lihan/.codex/skills/workflow-home": {
        kind: "symlink",
        linkTarget: "/repo/ai/skills/workflow-home"
      },
      "/home/lihan/.codex/AGENTS.md": {
        kind: "symlink",
        linkTarget: "/repo/agents/user-AGENTS.md"
      },
      "/home/lihan/.claude/CLAUDE.md": {
        kind: "file"
      }
    });

    expect(plan.find((step) => step.target.endsWith(".codex/skills/workflow-home"))?.action).toBe(
      "skip"
    );
    expect(plan.find((step) => step.target.endsWith(".codex/AGENTS.md"))?.action).toBe(
      "blocked-external-symlink"
    );
    expect(plan.find((step) => step.target.endsWith(".claude/CLAUDE.md"))?.action).toBe(
      "backup-and-link"
    );
  });
});
