---
id: agents-md-as-cross-tool-project-memory
kind: card
domain: principle
visibility: team
status: valid
title: Use AGENTS.md + one-line CLAUDE.md @-import as cross-tool project memory
summary: When a project needs the same rules across multiple AI tools (Codex, Cursor, Copilot, Claude Code), make AGENTS.md the single source of truth and replace CLAUDE.md with one line `@AGENTS.md` — same rules everywhere, no duplication or drift.
summary_zh: 多个 AI 工具要共用项目规则时:AGENTS.md 作唯一真相,CLAUDE.md 只留一行 @import,不漂移
tags:
  - agents-md
  - codex
  - claude-code
  - legacy-card
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: From a fresh Claude Code session in a project with CLAUDE.md = `@AGENTS.md` and AGENTS.md = full rules, run /memory and confirm AGENTS.md content is loaded.
  expected: /memory lists CLAUDE.md and shows AGENTS.md expanded inline at the @-import point.
  failure_next: Check the @-import is at column 0 of CLAUDE.md; path resolves relative to CLAUDE.md's directory; recursive depth cap is 5.
---

## Display / Runtime Route

- Blog role: display/sync/bootstrap representation of the cross-tool memory principle.
- Local runtime route: `skills/lihan-cards/SKILL.md` with `principle_essence`, then `AGENTS.md` / one-line `CLAUDE.md` verification.
- Runtime status: principle essence may be near-always loaded through user/project guidance; the full card is opened only when changing runtime guides.

## Trigger

Apply this pattern when:

- The project will be touched by 2+ AI coding assistants (Claude Code
  plus Codex / Cursor / Copilot / Gemini CLI / Aider / Windsurf / etc.).
- You are about to duplicate project rules into both `CLAUDE.md` and
  `AGENTS.md`, or you already have a "mirror these two files" note in
  one of them.

Skip when:

- Only one tool will ever touch the project — just use that tool's
  native file.
- The tool-specific rules genuinely do not generalize (Claude Code
  skill paths, Cursor `.mdc` conditional rules) — keep those in the
  tool-specific file and let AGENTS.md hold the shared core.

## Fix

1. Put **all** shared project rules into `AGENTS.md` at the repo root.
2. Replace `CLAUDE.md` with a single line:

   ```
   @AGENTS.md
   ```

3. Update the `AGENTS.md` header to declare it the canonical source,
   e.g.:

   > Canonical project instructions, readable by any AGENTS.md-aware
   > tool (Claude Code, Codex, Cursor, Gemini CLI). `CLAUDE.md` is a
   > one-line `@AGENTS.md` import — edit here only.

4. Verify with `/memory` in Claude Code — `AGENTS.md` content should
   appear inline at the `@`-import point.

## Why It Works

- **AGENTS.md** is the de-facto open standard since 2025-08,
  stewarded by the Linux Foundation's Agentic AI Foundation. Read
  natively by Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf,
  Zed, Factory, Jules, and 20+ other tools. 60,000+ repos adopted.
- **Claude Code `@path` import** inlines the referenced file into
  the system prompt at session start. Recursive imports allowed up
  to depth 5. Works with relative paths, absolute paths, and
  `~/...` paths.
- One file edited → all tools see the same rules, no mirror drift.

## Caveats

- `@`-import does **not** reduce context usage; content is expanded
  inline and counts against the active window.
- Paths resolve relative to the importing file's directory; use
  absolute or `~/...` paths if you need to import from outside the
  repo.
- Some Cursor configurations still read `.cursorrules` or
  `.cursor/rules/` — keep tool-specific instructions in the
  tool-specific file, and let AGENTS.md hold the shared core only.
- Anthropic's SKILL.md is a separate, complementary spec for
  packaged reusable skills with YAML frontmatter — not a substitute
  for AGENTS.md.
- For monorepos, nest one `AGENTS.md` per package and let agents
  walk from the working file up to the repo root; the nearest one
  wins.

## Reuse Rule

- **Load when**: setting up project-level memory for a repo that
  will be touched by multiple AI coding assistants, OR refactoring
  away from a "keep CLAUDE.md and AGENTS.md in sync" mirror note.
- **Do not load when**: single-tool project, or when the tool-specific
  file is genuinely tool-specific.

## References

- <https://agents.md/> — official site
- <https://developers.openai.com/codex/guides/agents-md> — Codex guide
- <https://docs.anthropic.com/en/docs/claude-code/memory> — Claude Code memory + `@`-import
