---
id: lihan-cards-research-metrics-from-current-sota
kind: card
domain: research
visibility: team
status: valid
title: Research metrics come from current SOTA, never self-invented
summary: For any research evaluation, use metrics drawn from the current SOTA
  literature of that subfield (re-derived from recent papers each time), never
  self-invented custom metrics.
summary_zh: 科研评测用当下SOTA论文的通用指标,别自造(指标会演进,每次重查)
tags:
  - research
  - paper-reading
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: For each reported metric, cite >=1 recent SOTA paper in the subfield
    that uses it; confirm it is not a homemade proxy and reuses the repo's
    metric impl where present.
  expected: Every reported metric traces to a current SOTA paper or standard tool;
    no self-invented metric appears in the evidence.
  failure_next: Replace the custom metric with the current SOTA-standard one
    (re-derived from recent papers), reuse repo impl if any, and re-run.
---

> Imported from lihan3238.github.io ai/cards/research-metrics-from-current-sota.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

- Defining or reporting metrics for any research evaluation (benchmark, ablation,
  paper-facing result).
- Tempted to invent a proxy because the standard metric is inconvenient or unavailable.

## Fix

- Use the metric set that is standard in the **current SOTA papers** of that exact
  subfield. **Re-derive it from recent top-venue work each time** — do NOT hardcode a
  permanent list; the standard set evolves and better metrics keep appearing.
- Procedure (metric-agnostic, survives metric churn):
  1. Name the metric by pointing to >=1-2 recent SOTA papers using it. Can't cite one
     → it is probably custom → reconsider.
  2. Reuse the reproduction repo's existing metric implementation if present.
  3. Only build a new metric as a justified last resort, defended against the standard one.
- Illustrative examples ONLY, **as of 2026 (will change — re-check before using)**:
  LLM-safety attack-success via Llama-Guard / HarmBench / StrongREJECT; utility/fluency
  via perplexity / MMLU-retention / MT-Bench / a reward model (HelpSteer / QRM).

## Reuse Rule

- Load when planning any eval, or before reporting numbers as evidence.
- Origin: 2026-06 anchor-emergence text experiment — invented `URc` (coherence-gated
  unsafe-and-coherent rate) and a `distinct-2 / degenerate%` fluency proxy; flagged as
  reinventing the wheel. Custom metrics are not comparable, reviewable, or trustworthy
  even when the qualitative result is right.
