---
id: lihan-cards-user-repo-modes-profile
kind: profile
domain: environment
visibility: private
status: valid
title: Legacy lihan-cards repo mode lock profile snapshot
summary: Private migration snapshot of the old per-repository lihan-cards mode lock map.
summary_zh: 旧 lihan-cards 仓库模式锁私有快照
tags:
  - lihan-cards
  - mode-lock
  - migration
context_cost: high
routes:
  - codex
  - claude-code
verify:
  command: Manual inspection confirms this imported profile is a migration snapshot only and contains no API keys, passwords, bearer tokens, cookies, private keys, or raw credentials.
  expected: The profile is private, source-preserving, and used only for migration/reference.
  failure_next: Remove or redact the offending value, rotate any leaked credential, then rebuild the registry.
---

> Imported from `lihan3238.github.io/agents/user-repo-modes.yaml` as a private migration snapshot. The active runtime source remains this repository plus host-local config.

## Source Snapshot

~~~~text
schema_version: "1.0.0"
last_verified: "2026-06-12"
sync_policy: "non_secret_user_config"

mode_lock_policy:
  description: "Per-repo lihan-cards mode is sticky across Codex and Claude sessions."
  resolution_order:
    - "Explicit manual mode-change request in the current user message."
    - "Nearest AGENTS.md / CLAUDE.md line such as `lihan-cards mode: research`."
    - "This user-level repo path map."
    - "First-run inference, persisted here immediately with `inferred: true` and a one-line reason."
  manual_change_rule: "Only change a stored non-inferred mode when Lihan explicitly asks to switch or reset mode; Lihan corrects an inferred entry by editing its line."

repos:
  "/mnt/c/lihan_work/github_repos/lihan3238.github.io":
    mode: "engineering"
    reason: "Blog, cards, skill, Spec Kit, validation, and site automation work."
  "/mnt/c/lihan_work/ai_workplace/science_ai":
    mode: "research"
    reason: "AI safety research workspace, papers, notes, experiments, and manuscript work."
  "/mnt/c/lihan_work/ai_workplace/codex_specify_superpower":
    mode: "engineering"
    reason: "speckit-superpowers bridge plugin: Spec Kit workflow, CI, releases. AGENTS.md lock line is primary; this entry is the third-layer fallback."
  "/mnt/c/lihan_work/NWPU/Grade_1/无人机网络基础与应用":
    mode: "engineering"
    inferred: true
    reason: "Graduate course lab repository; task is code implementation, isolated environment setup, and submission-oriented reports."
  "/home/lihan/work/ai_workflow":
    mode: "engineering"
    inferred: true
    reason: "AI workflow system design involving Codex, Claude Code, MCP, skills, agents, prompts, sync, and deployment architecture."
  "/home/lihan/work/xubinyi-blog":
    mode: "engineering"
    inferred: true
    reason: "Astro blog feature, deployment, verification, and GitHub synchronization work."

~~~~
