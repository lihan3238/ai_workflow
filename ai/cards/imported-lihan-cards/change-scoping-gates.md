---
id: lihan-cards-change-scoping-gates
kind: card
domain: principle
visibility: team
status: valid
title: Gate any candidate code change before writing code
summary: Before taking on any code change (bug fix, feature, refactor, external
  contribution), walk 5 sequential gates — eligibility, collision, reality,
  clarity, scope — rejecting as early as possible; don't retry a rejected
  candidate without new evidence; conservatism scales with blast radius.
summary_zh: 动代码前先过五道闸:资格、冲突、现实、清晰、范围;没有新证据不重试,保守程度看影响面
tags:
  - guardrail
  - git-workflow
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: Pick a candidate change (issue, refactor target, new feature idea);
    walk through the 5 gates without skipping; reject at the first gate that
    fails.
  expected: Either the candidate clears all 5 gates and earns code-writing time,
    OR it's rejected at a specific gate with a one-sentence reason.
  failure_next: Retrying a rejected candidate with no new evidence → stop.
    Rejecting cheap, reversible, branch-confined work on absolutist grounds →
    re-check the cost asymmetry instead of defaulting to no.
---

> Imported from lihan3238.github.io ai/cards/change-scoping-gates.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

About to decide whether to take on a code change — a bug fix, a feature
addition, a refactor, an external contribution. The decision is "should
I write code for this?", not "how should I write the code?".

## Fix

Walk the 5 gates in order. Stop at the first failure.

| # | Gate | The question |
|---|---|---|
| 0 | **Eligibility** | Is this in-scope for the project / contract / authorization I have? |
| 1 | **Collision** | Is someone else already doing this? Is there an open PR / WIP issue? |
| 2 | **Reality** | Does the problem actually exist as described? Can I reproduce it? |
| 3 | **Clarity** | Are the requirements unambiguous? Will I know I'm done? |
| 4 | **Scope** | Is the proposed solution one right-sized, separable, reviewable increment — or a creeping refactor? |

Reject as early as possible. The cheapest rejection is at Gate 0 (a
quick read of the project's contract), before any code is opened. The
most expensive is at Gate 4 (you've already started coding and
discover scope is bigger than expected).

**Conservatism scales with blast radius, not absolutism.** For
irreversible or outward-facing surfaces (published assets, public
posts, governance, anything auto-merged), keep the conservative
default: better to miss a good change than start a bad one. For cheap,
reversible, branch-confined work behind existing gates, a failed
attempt costs tokens while a missed good change loses compounding
value — try it rather than rejecting on principle.

**Rejection is of the candidate as stated, with the evidence at
hand.** Don't retry without new evidence. With new evidence — a
reproduction, an unblocked dependency, a clarified requirement —
re-walking the gates is the system working, not perseveration.

## Reuse Rule

- **Load when**: picking up a new issue, deciding whether to refactor,
  evaluating an external contribution to merge, choosing what to do
  next in a coding session.
- **Do not load when**: you're already mid-task — gates apply
  before-code, not during. Mid-task scope creep gets caught by the
  pre-push-quality-gate's Change Hygiene step, not here.
