---
id: programmer-onboarding
kind: card
domain: coding
visibility: team
status: valid
title: Onboard a programmer machine into AI Workflow Home
summary: Use when setting up Lihan's or his father's machine to use the shared AI workflow assets with Codex and Claude Code.
summary_zh: 给程序员电脑安装共享 AI 工作流资产
tags:
  - onboarding
  - codex
  - claude-code
  - runtime
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: npm run validate && node scripts/install-runtime.mjs --dry-run
  expected: Assets validate and installer reports only named Codex/Claude paths.
  failure_next: Fix asset schema errors or installer target paths before touching the machine.
---

## Trigger

A trusted programmer machine needs access to shared cards, prompts, skills, and
runtime guidance.

## Steps

1. Clone this repository.
2. Run `npm install`.
3. Run `npm run validate`.
4. Run `node scripts/install-runtime.mjs --dry-run`.
5. Review the target paths.
6. Run `node scripts/install-runtime.mjs --apply`.
7. Start a fresh Codex/Claude Code session and ask it to consult
   `workflow-home`.
8. Use `--manage-global-guides` only for machines without an existing canonical
   `AGENTS.md` / `CLAUDE.md` setup.

## Reuse Rule

Load when setting up or repairing a programmer machine. Runtime inventory, not
asset kind, owns project lists and device sync state.
