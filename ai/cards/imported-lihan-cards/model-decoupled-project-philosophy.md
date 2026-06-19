---
id: lihan-cards-model-decoupled-project-philosophy
kind: card
domain: principle
visibility: team
status: valid
title: Build model-decoupled projects
summary: When making project or strategy decisions, treat frontier models as a
  rising external capability and build durable value in data, workflows,
  evaluations, interfaces, and institutions that improve as models improve.
summary_zh: 做项目/战略决策时:把前沿模型当会涨的外部能力,价值押在数据、流程、评测、接口上
tags:
  - project-philosophy
  - research
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: "For the candidate project, fill five rows: substitution-risk,
    durable-substrate, agent-interface, model-upgrade-dividend,
    verification-loop."
  expected: The project has a durable substrate outside the model layer and at
    least one clear path where stronger general models make it more valuable.
  failure_next: If the value collapses when a frontier agent gets better, re-scope
    around proprietary data, workflow ownership, evaluation, trust,
    distribution, or physical/institutional execution.
---

> Imported from lihan3238.github.io ai/cards/model-decoupled-project-philosophy.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Use when choosing, scoping, or reviewing a research/development
project in the AI era, especially when the project might become "just
a prompt", "just a wrapper", or a workflow that a frontier agent will
soon perform directly.

## Evidence Basis

- Capability: Stanford AI Index 2026 reports accelerating frontier
  capabilities, SWE-bench Verified nearing saturation, OSWorld agent
  task success rising to about 66%, and expanding AI-for-science
  coverage.
- Software: Bain's 2025 SaaS analysis frames agentic AI as automating
  tasks and replicating workflows; high-risk workflows lack
  proprietary data depth, switching/network friction, standards
  control, and regulatory/certification barriers.
- Platforms: MCP and agent-to-agent protocols make tools and data
  easier for general agents to access, so "we integrated X" is not
  enough unless the integration exposes an owned substrate.
- Science: AI Scientist, AI Scientist-v2, AlphaEvolve, and agentic
  science work show ideation, experiment execution, manuscript
  drafting, algorithm discovery, and evaluator-driven loops becoming
  automatable.
- Theory: Sutton's bitter lesson says scalable general methods tend to
  overtake hand-built special cases; complementary-assets strategy
  says value capture moves to scarce assets around a commoditizing
  technology.

## Fix

- First assumption: the model layer is a rising external capability,
  not the moat. Do not bet on today's model weakness, missing tool
  use, context limit, price, or latency as the reason the project will
  matter.
- Run the substitution test: "If a frontier agent with browsing,
  code execution, APIs, memory, and cheap inference can do 80% of this
  workflow, what value remains here?"
- Identify at least one durable substrate:
  - Earned data: proprietary logs, annotations, failure cases,
    negative results, lab records, user traces, or domain corpora with
    rights and provenance.
  - Workflow ownership: approvals, handoffs, incentives, procurement,
    review norms, community, distribution, or customer relationships.
  - Verification loop: gold sets, tests, simulators, benchmarks,
    physical assays, peer review, audit trails, or outcome metrics
    that can reject bad model output.
  - Execution control plane: secure write-back, permissions, APIs,
    MCP/agent surfaces, observability, rollback, and human override
    around systems the project owns.
  - Physical/institutional position: instruments, wet labs, clinical
    access, regulated processes, supply chain, field operations, or
    trusted institutional role.
- Convert model progress into a dividend:
  - Keep model providers swappable behind thin adapters.
  - Store intermediate artifacts as structured data, not only chat
    transcripts.
  - Expose agent-readable tools and schemas, not only human UI.
  - Let models propose; let owned evaluators, tests, users, or
    physical reality select.
  - Make every model upgrade reduce cost, expand coverage, improve
    recall, or increase throughput without rewriting the core project.
- Prefer project shapes where general agents help rather than replace:
  - Data flywheels that get better through real use.
  - Evaluator/orchestrator systems where search is cheap and
    verification is scarce.
  - Research infrastructure that connects models to unique data,
    instruments, simulations, and reproducibility checks.
  - Agent-native workflow layers around owned organizations, not
    generic chat frontends.
  - Trust, provenance, safety, redaction, compliance, and audit layers
    that become more necessary as agents gain autonomy.
- Reject or re-scope when the value is mostly:
  - A generic LLM call over generic public input.
  - A UI around another company's model with no owned data, workflow,
    distribution, or evaluator.
  - A hand-coded expert system likely to be absorbed by stronger
    search/learning.
  - A benchmark demo with no path to real write-back, adoption, or
    measured outcome.

## Project Review Template

Fill this before starting a serious project:

| Row | Required answer |
| --- | --- |
| Substitution risk | What can the next frontier agent replace? |
| Durable substrate | What scarce asset remains outside the model layer? |
| Agent interface | How will stronger agents use or extend this system? |
| Model-upgrade dividend | What improves automatically as models improve? |
| Verification loop | What rejects false, unsafe, shallow, or non-novel output? |
| Ownership moat | What data/workflow/trust/institution/distribution is hard to copy? |
| Decision | Green / yellow / red; continue, re-scope, or kill. |

Decision rule:

- **Green**: durable substrate + agent interface + model-upgrade
  dividend + verification loop are all credible.
- **Yellow**: one column is weak; prototype only after naming the
  missing substrate or evaluator.
- **Red**: the project depends mainly on current model limitations or
  generic prompt/UI assembly; do not build as-is.

## Sources

- Stanford HAI, "The 2026 AI Index Report":
  https://hai.stanford.edu/ai-index/2026-ai-index-report
- Rich Sutton, "The Bitter Lesson":
  https://bitterlesson.ai/
- Bain & Company, "Will Agentic AI Disrupt SaaS?":
  https://www.bain.com/insights/will-agentic-ai-disrupt-saas-technology-report-2025/
- Anthropic, "Introducing the Model Context Protocol":
  https://www.anthropic.com/news/model-context-protocol
- Xin, Kitchin, and Kulik, "Towards agentic science for advancing
  scientific discovery":
  https://www.nature.com/articles/s42256-025-01110-x
- Lu et al., "The AI Scientist":
  https://arxiv.org/abs/2408.06292
- Yamada et al., "The AI Scientist-v2":
  https://arxiv.org/abs/2504.08066
- Google DeepMind, "AlphaEvolve":
  https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/

## Reuse Rule

- **Load when**: evaluating whether a research/development idea will
  remain useful as frontier models and general agents get stronger; or
  when turning a model-wrapper idea into a durable system.
- **Do not load when**: the task is a narrow implementation detail
  where the project strategy is already fixed and no AI-era
  substitution risk is being considered.
