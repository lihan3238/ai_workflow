---
id: lihan-cards-user-agents-profile
kind: profile
domain: environment
visibility: private
status: valid
title: Legacy lihan-cards user AGENTS profile snapshot
summary: Private migration snapshot of the old user-level AGENTS.md canonical guidance from lihan3238.github.io.
summary_zh: 旧 lihan-cards 用户级 AGENTS 配置私有快照
tags:
  - agents-md
  - codex
  - claude-code
  - migration
context_cost: high
routes:
  - codex
  - claude-code
verify:
  command: Manual inspection confirms this imported profile is a migration snapshot only and contains no API keys, passwords, bearer tokens, cookies, private keys, or raw credentials.
  expected: The profile is private, source-preserving, and used only for migration/reference.
  failure_next: Remove or redact the offending value, rotate any leaked credential, then rebuild the registry.
---

> Imported from `lihan3238.github.io/agents/user-AGENTS.md` as a private migration snapshot. The active runtime source remains this repository plus host-local config.

## Source Snapshot

~~~~text
# User-level agent config (canonical)

Canonical user-level guidance for Lihan, readable by any AGENTS.md-aware
tool. This single file is the source of truth: `~/.codex/AGENTS.md` and
`~/.claude/CLAUDE.md` are symlinks to it (run `scripts/install.sh`), so
the two former byte-identical copies can never drift again.

Validated against Agent Skills spec: agentskills.io (2026-06).

## User-Facing Language Routing

- Detect language from the latest user message's dominant script (CJK
  Han/Kana/Hangul → that language; otherwise English) — inferred from the
  message already in context, with no separate detection step and no restating
  the user's words, so it is deterministic per message and costs ~0 extra tokens.
- Translate user intent to English internally before planning, tool use,
  subagent prompts, delegated agent instructions, and implementation reasoning.
- Keep internal prompts, delegated agent instructions, code comments unless
  otherwise appropriate, commit messages, command IDs, paths, schema fields,
  and logs in English.
- Translate ALL user-facing output to the detected language. The two that
  always matter: (1) **every turn's final reply to the user**, and (2) **option
  lists / choices presented for selection (AskUserQuestion)**; status, progress,
  and completion reports too. Only internal reasoning, tool calls, and committed
  artifacts (code, commits, schema, logs) stay in English/default.
- If the user explicitly requests a response language, that explicit request
  overrides automatic detection.
- Preserve literal code, commands, filenames, JSON/YAML keys, quoted source
  text, and API names without translation.
- In Chinese-facing explanations, when an important English technical term,
  paper concept, or model/tool name is kept in English, add a concise Chinese
  gloss on first mention where useful, e.g. `activation steering（激活转向）`.
  Do not repeat the gloss for common abbreviations or terms already explained
  in the same answer.
- For mixed Chinese/English messages, respond in the language used for the main
  request; if unclear, prefer the user's last sentence language.

## Environment — WSL on this host

- **HTTP/HTTPS outbound proxy**: `http://10.77.0.11:10808` (Windows-side proxy
  forwarded into WSL). Required for any outbound network call from WSL —
  `git push/fetch`, `gh`, `curl`, `pip install`, `npm install`, and any
  `WebFetch` / `WebSearch` that touches the wider internet.
- **When to use**: a `git push` / `gh` / `curl` call returns
  `GnuTLS recv error`, `Couldn't connect to server`, or `Failed to connect ... port 443`.
- **How to apply for a one-shot command** (preferred, doesn't pollute repo
  config):
  ```bash
  https_proxy=http://10.77.0.11:10808 http_proxy=http://10.77.0.11:10808 git push ...
  ```
- **How to apply session-wide** (if running many network ops in one shell):
  ```bash
  export https_proxy=http://10.77.0.11:10808 http_proxy=http://10.77.0.11:10808
  ```
- **`gh` CLI**: honors the same env vars; no separate config required.
- **Do NOT**: set `git config --global http.proxy` — that bakes the proxy
  into git config and breaks on machines where the proxy is unreachable.
  Env-var-per-call keeps the setting per-shell.
- **Verification it's up**: `curl -sI --proxy http://10.77.0.11:10808 https://github.com | head -1`
  should return `HTTP/2 200` or similar.

## Principle cards (always-loaded essence)

The 1–2 line gist of each governing principle is mirrored here for near-always
loading. Where a parenthetical id is shown, a full `principle` card (detail +
verify) lives in the registry — load it before acting when that rule bites. The
ones without an id are governance that lives only here and in the constitution;
there is no separate card to load.

- **Build model-decoupled projects** — treat frontier models as a rising
  external capability, not the moat; anchor durable value in owned data,
  workflows, evaluations, interfaces, and institutions that get *more*
  valuable as models improve. (`model-decoupled-project-philosophy`)
- **AI assets are tools, not homework** — every card must be decidable from
  its registry entry alone; if an agent must read the full body just to know
  whether it applies, the summary is too vague or the card does too much.
- **Keep the AI-asset system light** — default to NOT building infra; prefer
  hand-authored cards + a static registry; one knowledge base, one query
  entrypoint, one write-back entrypoint, one runtime-guide pair — new surface
  displaces the old, never accumulates.
- **Personal-layer files are read-only** — never modify anything under
  `content/post/**` unless the user names a specific entry and asks for the
  edit; new posts only on explicit request.
- **AGENTS.md is cross-tool project memory** — make `AGENTS.md` the single
  source of truth and reduce `CLAUDE.md` to a one-line `@AGENTS.md` import, so
  every tool reads the same rules with no mirror drift.
  (`agents-md-as-cross-tool-project-memory`)
- **Gate any change before writing code** — walk the 5 sequential gates
  (eligibility → collision → reality → clarity → scope), reject at the first
  failure, and don't retry a rejected candidate without new evidence;
  conservatism scales with blast radius — strict for public/irreversible
  surfaces, lighter for cheap reversible work. (`change-scoping-gates`)

## Science AI Routing

- Per-repo mode is sticky: check the nearest `AGENTS.md` / `CLAUDE.md` mode
  lock, then `~/.config/lihan-cards/repo-modes.yaml`, before inferring. Only
  switch or reset a stored mode when Lihan explicitly asks. The full
  lock/persist protocol lives in lihan-cards `references/modes.md`.
- Science-shaped work (`science_ai`, `SafeAct-Steer`, papers, experiments,
  benchmarks, Obsidian research notes, paper/PDF downloads, GPU servers, LLM
  judges) → lihan-cards **research mode** first: `references/research.md`
  routes on to the task-scoped science references.
- Stable workflow belongs in `lihan-cards`; fixed/private facts belong in the
  user research profile (`~/.config/lihan-cards/research_profile.yaml`,
  override via `LIHAN_RESEARCH_PROFILE`) — load only the section the task
  needs. Non-secret config (paths, LAN IPs, ports, env var names) may sync
  through the profile; secrets (keys, passwords, tokens, cookies, private
  keys) stay in local-only `~/.config/lihan-cards/secrets.env` and are never
  synchronized.
- No new science skills or entrypoints; project-local science skill symlinks
  are compatibility shims over this single route.

~~~~
