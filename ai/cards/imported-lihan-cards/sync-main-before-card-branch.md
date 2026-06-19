---
id: lihan-cards-sync-main-before-card-branch
kind: card
domain: coding
visibility: team
status: valid
title: Sync origin/main before card work; regenerate registry on conflict
summary: static/ai/registry.json is generated and the ratified card lane
  auto-merges often, so branch any card/registry/spec work from a
  freshly-fetched origin/main; resolve registry.json merge conflicts by
  re-running build_registry.py, never by hand.
summary_zh: 动卡片/registry/spec 前先 fetch 最新 origin/main 再开分支(card lane
  常自动合并);registry.json 冲突用 build_registry.py 重生成解决,别手动 merge
tags:
  - git-workflow
  - registry
  - ci
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: "From the blog repo root: `git fetch -q origin main && git rev-list
    --left-right --count HEAD...origin/main`; after any registry.json conflict,
    `python scripts/ai/build_registry.py && grep -c '^<<<<<<<'
    static/ai/registry.json`."
  expected: Before branching the right-side (behind) count is 0. After
    regenerating, grep returns 0 conflict markers and `python
    scripts/ai/build_registry.py --check` prints 'registry is current'.
  failure_next: Behind origin/main → branch from origin/main (or `git pull
    --ff-only` first). registry.json conflict markers present → run `python
    scripts/ai/build_registry.py` to rebuild from the card set, `git add
    static/ai/registry.json`, then re-run `validate_assets.py` +
    `build_registry.py --check`; never hand-merge the generated JSON.
---

> Imported from lihan3238.github.io ai/cards/sync-main-before-card-branch.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Starting any card / registry / spec work that will regenerate
`static/ai/registry.json`, OR hitting a merge/rebase conflict in that file.

## Symptoms

- A PR shows `CONFLICTING` / `mergeStateStatus: DIRTY`, with the conflict only
  in `static/ai/registry.json`.
- `pull_request` CI never starts (GitHub can't build the merge ref while the PR
  is conflicting), so checks look "missing", not failed.
- A concurrently-merged card-lane PR added/changed cards while your branch was open.

## Diagnosis

`static/ai/registry.json` is a GENERATED file that is committed, and the ratified
**card lane auto-merges on green CI** — so `origin/main` frequently gains a new
card plus a regenerated registry. Branching from a stale local `main`, or working
while another card PR lands, makes two independently-regenerated registries collide.

## Fix

1. **Before branching**: `git fetch origin main` and branch from `origin/main`,
   not a stale local `main`. (`git rev-list --left-right --count HEAD...origin/main`
   right-side count must be 0.)
2. **On a registry.json conflict**: do NOT hand-merge the JSON — the conflict is
   only in the generated view. Take both card sets, then
   `python scripts/ai/build_registry.py` to rebuild from all `ai/cards/*.md`,
   `git add static/ai/registry.json`, and re-run `validate_assets.py` +
   `build_registry.py --check`.
3. If `origin/main` added a card during your branch, also confirm that card's
   `type` fits the current closed-set taxonomy before regenerating.

## Reuse Rule

- **Load when**: opening a branch / PR that touches `ai/cards/**` or
  `static/ai/registry.json`, or resolving a conflict in the registry.
- **Do not load when**: work that never regenerates the registry.

## Related

- `align-with-remote-before-consult` — the read-side twin (refresh local cards
  before a consult); this card is the write/PR-side rule.
