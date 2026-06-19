---
id: lihan-cards-github-required-check-card-automerge
kind: card
domain: coding
visibility: team
status: valid
title: GitHub required checks for card PR auto-merge
summary: When GitHub auto-merge depends on CI, keep the required workflow
  unfiltered and put branch/path eligibility inside the job; merge card PRs only
  after the required check is green.
summary_zh: required check 别用 paths,放 job 内 guard
tags:
  - ci
  - git-workflow
  - quality-gate
  - agent-protocol
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: "Manual/state check: required workflow has an unfiltered pull_request
    trigger, card/* eligibility is enforced inside the job with
    --card-only-strict, repo allow_auto_merge=true, and main requires the
    validate check."
  expected: Every PR reports the required validate check; card/* PRs fail validate
    if paths escape ai/cards/**, static/ai/registry.json, static/ai/stats.json;
    post-green gh pr merge --squash --auto can publish a card PR.
  failure_next: Remove pull_request.paths from the required workflow, add an
    in-job card/* --card-only-strict guard, enable repository auto-merge, and
    require the validate status check on main.
---

> Imported from lihan3238.github.io ai/cards/github-required-check-card-automerge.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Need GitHub to auto-merge a narrow class of PRs after CI while keeping the same
required check usable for every PR.

## Diagnosis

- GitHub required status checks are branch-level; if the required workflow is
  hidden behind `pull_request.paths`, some PRs may never report that check.
- A missing required check blocks merge even when the PR should be unrelated.
- Path/branch eligibility belongs inside the always-reporting job, not in the
  event trigger for the required workflow.

## Fix

- Make the required workflow run on every `pull_request`.
- Keep any `push: main` path filters if they are only an optimization.
- Add an internal guard step:
  - `if: startsWith(github.head_ref, 'card/')`
  - compute `git diff --name-only origin/<base>...HEAD`
  - run `python scripts/ai/guard_changed_paths.py --card-only-strict "${paths[@]}"`
- Configure repository auto-merge and branch protection:
  - `allow_auto_merge=true`
  - `main` requires strict `validate`
  - no required human reviews for the card lane
- For card publication, wait for `validate` to pass, then run:
  `gh pr merge <pr> --squash --auto`.
- Do not arm `gh pr merge --auto` before required checks are green; GitHub can
  reject pre-green auto-merge arming.
- Expensive steps inside the required job MAY be gated with step-level `if:`
  (e.g. run community validators only when the PR touches `skills/**`) —
  skipped steps still pass the required check, so the check keeps reporting
  on every PR while card PRs skip the cost. Keep such conditions fail-open
  for non-PR events.

## Reuse Rule

Load when designing or debugging GitHub Actions required checks, auto-merge, or
branch/path eligibility for a narrow PR class such as `card/*`.
