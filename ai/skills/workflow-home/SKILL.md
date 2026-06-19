---
name: workflow-home
description: "Use to consult, capture, validate, and install AI Workflow Home assets for Codex/Claude/Hermes/OpenClaw machines; local runtime first, web window second."
metadata:
  id: "workflow-home"
  kind: "skill"
  domain: "coding"
  visibility: "team"
  status: "valid"
  title: "AI Workflow Home entry skill"
  summary_zh: "AI Workflow Home 唯一入口:查资产、写草稿、装运行时、做验证"
  tags: "skills,codex,claude-code,workflow"
  context_cost: "medium"
  routes: "codex,claude-code,hermes,openclaw"
  verify_command: "npm run validate && npm run check:registry"
  verify_expected: "All AI assets validate and the registry is current."
  verify_failure_next: "Fix asset schema or regenerate registry before installing this skill."
---

# workflow-home

Single entry skill for AI Workflow Home. The web site is the display window;
runtime behavior lives in local assets, prompts, and adapters.

## Consult

1. Read `ai/registry/assets.json`.
2. Select from metadata first: `kind`, `domain`, `visibility`, `tags`, `summary`,
   `routes`, and `context_cost`.
3. Open the smallest matching asset body.
4. Run or inspect its verification trio before applying guidance.
5. Report selected assets and verification state.

## Capture

Create a draft card only when a lesson has both:

- recurring trigger;
- meaningful verification command, inspection step, or state smoke test.

Drafts stay local until a programmer explicitly publishes them through Git/PR.

## Install

Use `node scripts/install-runtime.mjs --dry-run` before applying local links.
The installer may manage only the documented Codex/Claude paths and must back up
real files instead of deleting them.

## Reuse Rule

Load when working on AI Workflow Home setup, asset consult/capture, runtime
installation, or model/tool adapter behavior.
