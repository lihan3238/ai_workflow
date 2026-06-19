---
id: lihan-cards-agent-skills-validator-gotchas
kind: card
domain: coding
visibility: team
status: valid
title: Agent Skills validators (skills-ref / skill-validator) fail CI on subtle
  SKILL.md format issues
summary: "Community Agent Skills validators fail CI on subtle SKILL.md format:
  skills-ref rejects flow-style allowed-tools; skill-validator wants the bundled
  dir named references/ and treats ANY warning as failure (exit 2)."
summary_zh: 校验 SKILL.md 时:allowed-tools 用空格串(别用 [a,b])、bundled 目录叫
  references/、warning 也算失败(exit 2)
tags:
  - skills
  - ci
  - quality-gate
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: skills-ref validate skills/lihan-cards; echo sr=$?; skill-validator
    check skills/lihan-cards; echo sv=$?
  expected: sr=0 and sv=0. skill-validator exits 2 if ANY warning fires (e.g. a
    non-standard bundled dir), exit 1 on a hard error; a CI `run:` step fails on
    either.
  failure_next: "Apply ## Fix: space-delimited allowed-tools, rename bundled dir
    to references/, resolve every warning. Re-run the validators at the SAME
    pinned versions CI uses, checking $? directly (a trailing pipe masks the
    exit code)."
---

> Imported from lihan3238.github.io ai/cards/agent-skills-validator-gotchas.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

A CI `validate` job (or a local pre-push check) that runs the community
Agent Skills validators on a `SKILL.md` — `skills-ref validate <dir>`
and/or `agent-ecosystem/skill-validator check <dir>` — fails, while the
rest of the gate (hugo build, unit tests) is green.

## Symptoms

- **skills-ref**: `Invalid YAML in frontmatter ... Found ugly disallowed
  JSONesque flow mapping` pointing at `allowed-tools: [Bash, Read]`.
- **skill-validator**: `⚠ unknown directory: reference/ (...) should this
  be references/ or assets/?` → process exits **2** → the CI step fails
  (it treats warnings as a non-zero result).
- Locally it looked "fine" because a pipe (`skill-validator ... | tail`)
  reported the pipe's exit code (0), not the validator's (2).

## Fix

- **`allowed-tools`** → use the spec-preferred **space-delimited string**:
  `allowed-tools: Bash Read`. A YAML block list also passes skills-ref;
  the **flow form `[Bash, Read]` does NOT** (skills-ref rejects it). The
  string form satisfies both validators.
- **Bundled files dir** → name it **`references/`** (or `assets/`), never
  `reference/` — skill-validator only recognizes the standard names.
- **Warnings == failures** → skill-validator exits **2** on ANY warning
  and a CI `run:` step fails on non-zero. Resolve every warning, or
  deliberately whitelist with `--allow-dirs <name>` / `--allow-flat-layouts`.
- **Verify honestly** → run both validators at the **same pinned versions**
  CI uses and read `$?` directly; don't trust a piped tail.

## Reuse Rule

- **Load when**: authoring or validating an Agent Skill `SKILL.md`, or
  when a CI `skills-ref` / `skill-validator` step goes red.
- **Do not load when**: the failure is an unrelated YAML / CI / build
  problem with no skill validator in the stack.
