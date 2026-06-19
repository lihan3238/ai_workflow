---
id: model-decoupled-workflow-home
kind: card
domain: principle
visibility: team
status: valid
title: Build AI Workflow Home around durable assets
summary: Use when deciding whether an AI workflow feature creates durable value beyond a specific model or coding agent.
summary_zh: 把价值押在资产、验证、接口和备份上,不要押单一模型
tags:
  - model-decoupled
  - workflow
  - guardrail
context_cost: low
routes:
  - codex
  - claude-code
  - hermes
  - openclaw
verify:
  command: Fill rows for substitution-risk, durable-substrate, agent-interface, model-upgrade-dividend, and verification-loop.
  expected: The feature still has value if Codex, Hermes, OpenClaw, or Claude is replaced by a stronger model/tool.
  failure_next: Rescope around owned workflow assets, validation, backups, interfaces, or operator habits.
---

## Trigger

Use before adding a feature to AI Workflow Home, especially when the feature
looks like a wrapper around one current model, coding agent, or hosted product.

## Fix

- Keep durable assets in Markdown/YAML/JSON, not inside a model chat history.
- Keep model/tool integrations as adapters.
- Prefer validation commands, restore drills, and registry contracts over
  hidden prompt behavior.
- If a feature would become useless when the current model improves or is
  replaced, shrink it or drop it.

## Reuse Rule

Load when scoping new AI workflow, prompt, skill, connector, or automation work.
Do not load for ordinary styling or content edits.
