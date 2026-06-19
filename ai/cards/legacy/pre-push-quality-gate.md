---
id: pre-push-quality-gate
kind: card
domain: coding
visibility: team
status: valid
title: Pre-push verification gates
summary: Run format / lint / type / test / coverage / change-hygiene locally before any git push or PR creation; CI would catch this, but locally is 3x faster.
summary_zh: push/PR 前先本地跑格式、lint、类型、测试、覆盖率、改动卫生,比等 CI 快 3 倍
tags:
  - quality-gate
  - ci
  - legacy-card
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: Before pushing, run the project's documented gate suite (per its AGENTS.md / CLAUDE.md / README); confirm every gate exits 0; only then run git push.
  expected: Local gate set passes; subsequent CI is a re-run of the same checks, not a new failure surface.
  failure_next: If a local gate fails, fix and re-run before push. If CI fails after local passes, the gate set is incomplete — add the missing check to the local suite first.
---

## Trigger

About to run `git push` to a shared branch / fork OR about to run
`gh pr create`. The change is "done" in the sense that the work
intent is satisfied; the question is whether it's CI-safe.

## Symptoms

- Tempted to skip a check because "it always passes anyway".
- Pushed something with a TODO / debugging print left in.
- Pushed, then immediately had to push a follow-up "fix lint".
- CI broke on a check that exists locally but you didn't run.

## Fix

Run **the 5 gates in order**. Stop at the first failure; fix; re-run
from gate 1. Do NOT proceed to `git push` until all 5 are green.

1. **Change Hygiene** — what's actually in the diff?
   - `git diff --stat` (size sanity)
   - `git diff` (every change defensible? no debug prints, no commented
     code, no AI-generated junk left behind?)
   - No file outside the intended scope touched (no
     `content/post/**` changes on an AI-layer task, etc.)
2. **Format** — language-specific formatter (prettier / black /
   gofmt / cargo fmt / etc.) reports zero diff.
3. **Lint** — language-specific linter exits 0.
4. **Type** — type checker (mypy / tsc --noEmit / cargo check)
   exits 0.
5. **Tests + Coverage** — full test suite passes; if the project
   has a coverage gate, it's met.

For a specific repo, run the gate set its runtime guide documents (this
blog: [`AGENTS.md`](AGENTS.md) → `## Pre-completion checks`). Do NOT
copy the command list into other docs or cards — embedded copies drift
when the suite changes; the runtime guide is the single source.

**Iron Law:** *If CI would catch it, you should have caught it
first.* A 30-second local check beats a 5-minute CI round-trip
every time.

## Reuse Rule

- **Load when**: about to push code, about to open a PR, finalizing
  a feature / bugfix / refactor for review, OR after a CI failure
  to confirm local == CI.
- **Do not load when**: still in exploratory work — pre-push gates
  are an end-of-task check, not a per-edit constraint.
