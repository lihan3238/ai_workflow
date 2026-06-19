---
id: lihan-cards-prefer-upstream-tools-over-bespoke-plumbing
kind: card
domain: principle
visibility: team
status: valid
title: Prefer mature upstream tools over bespoke plumbing
summary: When deciding whether to build a tool or reuse an existing one, prefer
  mature upstream tools and thin adapters over bespoke plumbing — unless no
  adequate option exists and a one-day MVP serves a repeated, high-frequency
  workflow.
summary_zh: 要不要自己造工具时:优先复用成熟上游+薄适配,除非没得选且一天能出 MVP
tags:
  - project-philosophy
  - guardrail
  - speckit
  - agent-protocol
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: "For a candidate tool/workflow, fill rows: problem,
    mature-upstream-options, adapter-boundary, missing-capability,
    repeat-frequency, one-day-MVP, decoupling-plan, decision."
  expected: Reuse an upstream/community solution or add only a thin adapter unless
    a repeated high-frequency workflow has no adequate mature option and can
    ship as a one-day MVP.
  failure_next: If the decision depends on vague control, convenience, or current
    tool unfamiliarity, stop building; survey upstream options, narrow to a thin
    adapter, or drop the work.
---

> Imported from lihan3238.github.io ai/cards/prefer-upstream-tools-over-bespoke-plumbing.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Choosing whether to build, extend, or replace engineering plumbing for a
practical goal, especially:

- agent tooling, skill/runtime surfaces, MCP, bridges, workflow engines,
  validators, indexing/search layers, CI automation, or repo automation;
- AI-era tooling where upstream practice changes quickly;
- non-hobby work where the objective is shipping useful work, not learning by
  rebuilding the tool.

## Local Basis

- Constitution Principle IV: lean on the community; do not build the perfect
  tool.
- `lihan-cards` engineering mode: Spec Kit plus the speckit-superpowers bridge
  is the canonical engineering workflow; `lihan-cards` coordinates around it,
  not over it.
- No-agent-sprawl hard floor: one knowledge base, one query entrypoint, one
  write-back entrypoint, one runtime-guide pair.

## Fix

Default to reuse:

- Survey current mature upstream/community options before proposing custom
  tooling.
- Prefer the clean upstream engine plus a thin adapter over a bespoke parallel
  stack.
- Keep boundaries swappable: stable file formats, CLI/API adapters, generated
  artifacts, and validation gates instead of hidden state.
- Displace or extend the existing surface when changing workflow behavior; do
  not add another entrypoint, runtime guide, daemon, watcher, or knowledge base.
- Treat tool churn as expected: captured judgment should outlive any specific
  product, model, framework, or plugin.

Build only when every row is green:

| Row | Required answer |
| --- | --- |
| Problem | What concrete work is blocked or repeatedly slowed? |
| Mature upstream options | Which current community/off-the-shelf tools were checked? |
| Adapter boundary | Can the need be solved with a thin adapter over one of them? |
| Missing capability | What essential capability is genuinely absent upstream? |
| Repeat frequency | Is this a repeated high-frequency personal workflow? |
| One-day MVP | Can the custom piece ship as an MVP in one focused day? |
| Decoupling plan | How can the custom layer be replaced when upstream improves? |
| Decision | Reuse / thin adapter / build MVP / drop. |

Decision rule:

- **Reuse**: upstream tool covers the workflow with acceptable friction.
- **Thin adapter**: upstream tool is right but needs local routing, sync,
  format, or guardrail glue.
- **Build MVP**: no adequate upstream option, repeated high-frequency need,
  one-day MVP, and replacement boundary are all credible.
- **Drop**: the reason is vague control, convenience, novelty, or unfamiliarity
  with current tools.

## Reuse Rule

- **Load when**: deciding whether to build custom agent/tooling infrastructure,
  especially around Spec Kit, Superpowers, MCP, skills, validators, indexing,
  CI, local runtime, or workflow bridges.
- **Do not load when**: the work is explicitly for personal learning, a hobby
  rebuild, or a narrow implementation detail after the reuse/build decision is
  already fixed.
