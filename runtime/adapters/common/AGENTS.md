# AI Workflow Home User Runtime

Use `workflow-home` as the single local entry skill for this repository family.

## Rules

- Consult AI assets before non-trivial AI workflow, prompt, skill, deployment,
  or backup changes.
- Prefer mature upstream tools and thin adapters over bespoke infrastructure.
- Keep model providers swappable; durable value belongs in assets, validation,
  backups, and workflows.
- Verify before claiming success.
- Do not store secrets, raw transcripts, private keys, tokens, or cookies in the
  repository.

## Current Scope

- Programmer machines may install Codex and Claude Code runtime links.
- Non-programmer readers use the web window read-only.
- Access control is handled by network/firewall or mature upstream auth, not by
  custom code in this project.
