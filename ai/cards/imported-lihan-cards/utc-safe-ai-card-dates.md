---
id: lihan-cards-utc-safe-ai-card-dates
kind: card
domain: coding
visibility: team
status: valid
title: Use UTC-safe dates in AI cards
summary: When setting created/last_verified dates in AI card frontmatter, use
  UTC (`date -u +%F`); local next-day dates can otherwise fail GitHub Actions as
  future dates.
summary_zh: 写卡片日期时用 date -u +%F;本地次日日期会被 GitHub Actions 当未来日期判错
tags:
  - asset-design
  - ci
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: date -u +%F && python -m unittest discover -s tests && python
    scripts/ai/validate_assets.py
  expected: The card frontmatter dates are not later than UTC today, and
    repository card validation reports no future-date errors.
  failure_next: If validation says 'created' or 'last_verified' is a future date,
    replace the frontmatter dates with `date -u +%F`, rebuild registry, and
    rerun tests.
---

> Imported from lihan3238.github.io ai/cards/utc-safe-ai-card-dates.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Use when creating or editing `ai/cards/*.md`, especially from WSL or any
machine east of UTC after local midnight and before UTC midnight. The
symptom is local validation passing but GitHub Actions failing with
`'created' must not be a future date` or `'last_verified' must not be a
future date`.

## Diagnosis

The card schema forbids future `created` and `last_verified` values. Local
machines may use Asia/Shanghai or another non-UTC timezone, while GitHub
Actions runners validate against UTC. During the local-next-day / UTC-previous-
day window, a locally correct date can be a future date in CI.

## Fix

Use UTC for card frontmatter dates:

```bash
date -u +%F
```

Set both fields to that UTC date unless there is a specific reason not to:

```yaml
created: <output of date -u +%F>
last_verified: <output of date -u +%F>
```

If the local calendar date matters, put it in prose, not in frontmatter:

```markdown
Verified on 2026-06-03 UTC from WSL (2026-06-04 Asia/Shanghai).
```

Before presenting or committing the card, run:

```bash
python -m unittest discover -s tests
python scripts/ai/redact.py --self-test
python scripts/ai/validate_assets.py
python scripts/ai/build_registry.py
git diff --check
```

If a PR check already failed, amend the card source date, rebuild the mirror
and registry, push a follow-up commit, then wait for GitHub Actions to pass
before merging.

## Reuse Rule

- **Load when**: authoring or fixing AI cards, registry mirror files, or
  GitHub Actions failures involving future `created` / `last_verified`
  dates.
- **Do not load when**: editing ordinary blog posts or project docs that do
  not use AI card frontmatter validation.
