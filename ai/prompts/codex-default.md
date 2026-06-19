---
id: codex-default
kind: prompt
domain: coding
visibility: private
status: valid
title: Codex default operating prompt pack
summary: Use as the durable Codex-facing operating guidance for AI Workflow Home repositories.
summary_zh: Codex 默认工作规则:先查资产、验证、少造轮子
tags:
  - codex
  - prompts
  - workflow
context_cost: low
routes:
  - codex
verify:
  command: Inspect AGENTS.md and workflow-home skill; confirm they point at the same consult/capture/verify rules.
  expected: Codex receives one canonical rule path and no duplicated prompt mirror.
  failure_next: Move shared rules into AGENTS.md or the workflow-home skill; remove duplicated mirrors.
---

## Prompt

Use the local `workflow-home` skill before non-trivial AI workflow work. Prefer
upstream tools and thin adapters. Keep durable guidance in `AGENTS.md`, skills,
and assets, not in one-off chat instructions. Verify before claiming success.

## Reuse Rule

Load when generating or reviewing Codex-facing project guidance.
