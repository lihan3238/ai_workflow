---
id: lihan-cards-low-token-high-trigger-card-authoring
kind: card
domain: principle
visibility: team
status: valid
title: Author cards/skills for low token cost and high trigger accuracy
summary: "In a card or Skill, the description/registry summary is the
  load-bearing trigger surface AND an always-loaded token cost: state what it
  does + when to load it, keep the actual fix in the body, put key sections at
  the body's ends. Load when authoring or editing a card or SKILL.md."
summary_zh: 写卡/skill:summary 既是触发面也是常驻成本,写清'做什么+何时用',fix 留正文,要点放首尾
tags:
  - asset-design
  - context-management
  - skills
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: "Take the card/skill being authored: (1) read ONLY its
    description/registry summary and decide load-or-skip without opening the
    body; (2) check the description is third person, <=1024 chars, and does NOT
    spell out the full fix/workflow; (3) check the body's Trigger and Reuse Rule
    sit at the top and bottom, not buried mid-body."
  expected: From the summary alone you can decide load vs skip; the description
    carries what+when but not the step-by-step fix; Trigger/Reuse-Rule are at
    the body's two ends.
  failure_next: Had to open the body to know when it applies -> tighten the
    summary's when-clause. Summary already contains the whole fix -> move the
    fix into the body (and confirm the consult protocol still forces
    open+verify). Key guidance buried mid-body -> move it to an end.
---

> Imported from lihan3238.github.io ai/cards/low-token-high-trigger-card-authoring.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

About to author or edit a card (`ai/cards/<id>.md`) or a Skill (`SKILL.md`):
choosing its `description`/registry `summary`, deciding what goes in the body
vs stays out, or judging whether it will trigger and what it costs to keep
around.

## Why (the empirical anchor)

Context is a finite **attention budget**; it degrades **non-uniformly** as it
fills (Anthropic, *Effective context engineering*). Two robust effects:

- **Context rot** (Chroma, 18 models): recall drops as input grows — *all*
  models, gradient not cliff. Focused ~300-token prompts beat ~113k-token full
  prompts across families.
- **Lost-in-the-middle** (Liu et al., TACL 2024): U-shaped — beginning AND end
  strong, **middle drops 20–30 pts**, even in long-context models.

So: front-load only lightweight discovery metadata, load detail on demand.

## Fix

**A. The trigger surface = the one field that decides selection.**
For a Skill it's `description`; for a card it's the registry `summary`
(+ `title` + `tags`). It is the *only* thing a loading agent sees before
deciding to open the body.

| Rule | Why |
|---|---|
| State **what it does + when to load it** | selection is made from this alone |
| **Third person**, ≤1024 chars | injected into system prompt; POV drift hurts discovery |
| Use concrete trigger keywords (error strings, symptoms, tool names) | that's what a future query matches |
| Give the rule **gist**, NOT the step-by-step fix/workflow | a workflow-summary becomes a shortcut the agent follows *instead of* reading + verifying the body (CSO trap) |

**B. Token budget = 3-level progressive disclosure.**

| Level | Content | In context | Cost |
|---|---|---|---|
| L1 | `name`+`description` / registry summary | **always** | ~80–100 tok each — the real resting cost |
| L2 | body / `SKILL.md` | on trigger | keep dense; SKILL.md target <500 lines |
| L3 | bundled files/scripts | on read/exec | 0 until read |

Resting cost ≈ **N × summary length**, not N. Tighten each summary; body size
is nearly free because it loads on demand.

**C. Body density + ordering.**
- Write for machines: bullets / tables / key-value; no ceremonial prose; one
  excellent example, not many; consistent terminology; no time-sensitive lines.
- Put `## Trigger` at the top and `## Reuse Rule` at the bottom — the U-shape's
  strong ends. Don't bury the load/apply decision mid-body.
- One card/skill open at a time; references one level deep.

**D. Two myths — refuted in verification, don't follow.**
- ✗ "Front-load critical info at the very start." U-shape means **both ends**
  work; pure front-loading is unsupported. Real rule: *don't bury it in the
  middle*.
- ✗ "Decay is caused by n² pairwise attention." The effect is real; that tidy
  mechanism did **not** survive verification — don't cite it.

Applies equally to Skill `description`s. The goal — a card decidable from its
registry entry alone — is the consult-side counterpart of this authoring rule;
for the CI/format traps when this lands as a real `SKILL.md`, see
`agent-skills-validator-gotchas`.

## Reuse Rule

- **Load when**: writing or revising a card/skill — its summary/description,
  its body scope, or its token footprint; reviewing existing summaries for
  trigger accuracy.
- **Do not load when**: consulting/applying an existing card (that's the
  consult loop), or doing non-asset work.
