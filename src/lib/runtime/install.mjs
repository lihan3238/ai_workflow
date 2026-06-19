import path from "node:path";

/**
 * @typedef {"link" | "skip" | "blocked-external-symlink" | "backup-and-link"} InstallAction
 * @typedef {{ manageGlobalGuides?: boolean }} InstallOptions
 * @typedef {{ label: string, source: string, target: string }} InstallTarget
 * @typedef {{ kind: "symlink", linkTarget: string } | { kind: "file" } | { kind: "directory" }} ExistingTarget
 * @typedef {InstallTarget & { action: InstallAction }} InstallStep
 */

/**
 * @param {string} repoRoot
 * @param {string} homeDir
 * @param {InstallOptions} [options]
 * @returns {InstallTarget[]}
 */
export function installTargets(repoRoot, homeDir, options = {}) {
  const skillSource = path.join(repoRoot, "ai", "skills", "workflow-home");
  const agentsSource = path.join(repoRoot, "runtime", "adapters", "common", "AGENTS.md");
  const targets = [
    {
      label: "Codex workflow-home skill",
      source: skillSource,
      target: path.join(homeDir, ".codex", "skills", "workflow-home")
    },
    {
      label: "Claude Code workflow-home skill",
      source: skillSource,
      target: path.join(homeDir, ".claude", "skills", "workflow-home")
    }
  ];

  if (!options.manageGlobalGuides) {
    return targets;
  }

  return [
    ...targets,
    {
      label: "Codex user AGENTS.md",
      source: agentsSource,
      target: path.join(homeDir, ".codex", "AGENTS.md")
    },
    {
      label: "Claude Code user CLAUDE.md",
      source: agentsSource,
      target: path.join(homeDir, ".claude", "CLAUDE.md")
    }
  ];
}

/**
 * @param {InstallTarget[]} targets
 * @param {Record<string, ExistingTarget>} currentState
 * @returns {InstallStep[]}
 */
export function planInstall(targets, currentState) {
  return targets.map((target) => {
    const state = currentState[target.target];
    if (!state) {
      return { ...target, action: "link" };
    }
    if (state.kind === "symlink" && state.linkTarget === target.source) {
      return { ...target, action: "skip" };
    }
    if (state.kind === "symlink") {
      return { ...target, action: "blocked-external-symlink" };
    }
    return { ...target, action: "backup-and-link" };
  });
}
