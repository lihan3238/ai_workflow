---
id: lihan-cards-align-with-remote-before-consult
kind: card
domain: coding
visibility: team
status: valid
title: Refresh local source before consulting cards (this WSL host)
summary: Before consulting lihan-cards on this WSL host, fast-forward the local
  blog clone (local-first reads lag after a merge) and verify cc-switch hasn't
  reverted the ~/.claude/CLAUDE.md & ~/.codex/AGENTS.md symlinks to empty files.
summary_zh: 本机 consult 前先 git pull 刷新本地卡库(本地读会滞后),并确认 cc-switch 没把
  CLAUDE.md/AGENTS.md 软链打回空文件
tags:
  - wsl
  - claude-code
  - codex
  - git-workflow
  - registry
  - agent-protocol
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: From the blog repo root run `git fetch -q && git status -sb | head -1`;
    and run `ls -ld ~/.claude/CLAUDE.md ~/.codex/AGENTS.md`.
  expected: status line is `## main...origin/main` with no `behind`; both ls lines
    are symlinks `-> .../agents/user-AGENTS.md` (NOT `-rw...` 0-byte regular
    files).
  failure_next: "Behind remote → `git pull --ff-only`; clone unavailable → fall
    back to the public registry URL for this consult and report the sync issue.
    Symlink reverted to a regular/empty file → cc-switch clobbered it: `bash
    scripts/install.sh`, delete any 0-byte `*.bak.*`, and disable cc-switch's
    skill / user-prompt (用户提示词) management in its GUI."
---

> Imported from lihan3238.github.io ai/cards/align-with-remote-before-consult.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

- Starting a lihan-cards consult/capture — or any session that relies on the
  user-level agent config — on this WSL host.
- Prevents two failure modes: acting on **stale local cards** after a recent
  merge, and acting on an **empty user config** because a symlink got clobbered.

## Symptoms

- `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md` is a 0-byte regular file
  instead of a symlink → user config silently empty (no language routing,
  proxy, or principle essence reaches the agent).
- A local registry/reference read disagrees with the live site shortly after
  a PR merge.

## Diagnosis

Two source-of-truth drifts on this host:

1. **cc-switch** (a running tray daemon, `~/.cc-switch/`, autostarts on Windows
   boot via WSLg) re-deploys tool config and **overwrites the symlinks** that
   `scripts/install.sh` created at `~/.claude/CLAUDE.md` and
   `~/.codex/AGENTS.md`. It is the old pointer-copy flow `install.sh` was meant
   to replace, still installed.
2. The runtime is **local-first** (skill references + on-disk cards/registry),
   so the local clone IS the consult source — and it can lag `origin/main`
   after a PR merge.

## Fix

Do this pre-consult, **every time**:

1. **Refresh the local source.** `git fetch && git status -sb`; `git pull
   --ff-only` if behind. Local-first stands: the public registry URL
   (`https://lihan3238.github.io/ai/registry.json`) is the fallback when the
   clone is unavailable — report the sync issue rather than silently
   switching a routine consult to remote fetching.
2. **Verify the two config symlinks** (see `verify`). If clobbered:
   `bash scripts/install.sh`, then remove any 0-byte `*.bak.*` junk.
3. **Durable fix:** disable cc-switch's skill / user-prompt (用户提示词)
   management in its GUI. That toggle lives in `cc-switch.db`, not
   `settings.json`, so it can't be confirmed from config files — the only proof
   it held is the symlinks not reverting.

## Reuse Rule

- **Load when**: at the start of a lihan-cards consult/capture on this WSL
  host, or whenever the user config looks empty or local cards look stale.
- **Do not load when**: consulting on a host without cc-switch, or in a
  project unrelated to this blog's config sync.
