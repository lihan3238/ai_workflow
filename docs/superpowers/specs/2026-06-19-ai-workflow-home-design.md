# AI Workflow Home Design

## Goal

Build a lightweight, model-decoupled AI workflow home for a small trusted
operator group. The first real users are Lihan and his retired programmer
father. Non-programmer family members can read normal blog posts, but they do
not need AI runtime controls.

The blog is only the display and interaction window. The durable system is the
asset runtime: cards, prompts, skills, profiles, runtime adapters, device
inventories, validation, Git, and backups.

## Users

- **Primary operators**: Lihan and father. They can read and change AI assets,
  install local agent runtime adapters, run validations, inspect device drift,
  and manage deployment.
- **Non-programmer readers**: family members who only need read-only blog
  access through the chosen network boundary.
- **Future collaborators**: small trusted programmer group. This extends the
  operator path through Git access and the same restore procedure, not through a
  SaaS/multi-tenant account model.

## Non-Goals

- No custom account system in the MVP. Access is handled by firewall/VPN or
  mature upstream access control such as Cloudflare Access, Authelia,
  authentik, Tailscale, or WireGuard.
- No separate Family page, Photos page, or `dist-family` artifact.
- No self-built photo service in this project. A future photo service should be
  independent and backed up with its own official process.
- No default MCP server, vector database, transcript ingestion daemon,
  browser-triggered remote execution, or always-on watcher.
- No Hugo Stack migration. The new UI is a purpose-built Astro window.
- No model lock-in. Codex, Claude Code, Hermes, OpenClaw, and future tools are
  adapters over the same assets.

## Architecture

The system has three runtime layers:

1. **Web Window**: Astro static/content-driven site. It renders Home, Blog,
   Search, AI Assets, and Runtime. `operator` is the only supported build mode.
   The Runtime page displays device inventory and repo-baseline drift. Private
   prompt/profile details are redacted from static HTML; full details stay in
   CLI output.
2. **Local AI Runtime**: a single `workflow-home` skill plus documented Codex
   and Claude Code adapter paths. It is installed locally on programmer
   machines and reads the same registry/assets as the web window.
3. **Service Runtime**: Linux server now, NAS later. It hosts the static site,
   optional Git mirror, and restic backup jobs/checks. NAS support is an
   operations migration path, not a separate product mode.

## Tech Stack

- Astro + TypeScript + MDX/content collections for the web window.
- Markdown/YAML/JSON for durable assets.
- TypeScript validation modules and Vitest tests.
- Static JSON search index and client-side search UI.
- GitHub first; optional Forgejo/Gitea mirror later.
- restic for encrypted backups.
- Mature network/auth boundaries outside the app.

## Asset Model

AI assets use three axes:

- `kind`: `card`, `prompt`, `skill`, `connector`, `profile`.
- `domain`: `coding`, `research`, `writing`, `environment`, `principle`.
- `visibility`: `public`, `team`, `private`, `local-only`.

There is no `workflow` asset kind. Workflow-shaped operating state such as
managed projects, device state, and baseline drift belongs in Runtime
inventory. A reusable workflow lesson can be a `card`; executable behavior
belongs in scripts/adapters.

Callable assets carry a verification trio:

- `verify.command`
- `verify.expected`
- `verify.failure_next`

The registry is generated from source assets and is the cross-surface discovery
index. It is not a database and not a second source of truth.

## Runtime Inventory

Runtime compares:

- GitHub/repo baseline: `runtime/baseline/assets.json`
- Device snapshots: `runtime/devices/*.json`

Each device snapshot records:

- user-level `AGENTS.md` status;
- user-level `CLAUDE.md` status;
- Codex/Claude skill status;
- managed project list and status;
- managed AI asset hashes/content for CLI diff.

Sync direction for MVP:

```text
GitHub/repo baseline -> device checkout
```

The web page shows summary and safe diff output. The CLI owns full diff and
write operations:

```bash
npm run runtime:baseline
npm run runtime:inspect -- --device my-host --label "My Host" --ip 10.81.2.18
npm run runtime:diff -- --device runtime/devices/my-host.json
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo --apply
```

Local-to-GitHub changes stay professional Git workflow: `git diff`, commit,
push, and PR when appropriate.

## MVP Scope

MVP-1.5 includes:

- Astro web window with Home, Blog, Search, AI Assets, and Runtime pages.
- Source assets for cards, prompts, skills, profiles, and connectors.
- Generated `ai/registry/assets.json`.
- Validation scripts and tests for asset schema, secret checks, registry build,
  site modes, artifact audit, legacy import, runtime inventory, and redaction.
- Single `operator` artifact: `dist-operator`.
- Static search page and `search-index.json`.
- `workflow-home` entry skill source.
- Installer script that links/copies runtime assets for Codex and Claude Code
  without touching unrelated files. It installs skill links by default and only
  manages global guide files when explicitly opted in.
- Runtime baseline/inspect/diff/sync CLI.
- Linux server deployment notes and future NAS migration notes.

Deferred:

- MCP server.
- Custom auth.
- Visual CMS.
- Vector search.
- Automated transcript ingestion.
- Browser-triggered remote writes.

## Design Direction

The UI should feel like a focused operator console, not a landing page:
restrained navigation, dense but readable panels, clear status blocks, and
visible CLI commands for professional operations. Blog posts keep human voice;
repeatable, verifiable guidance becomes AI assets.

## Acceptance Criteria

- `npm run test` verifies schema, registry, search, artifact, installer,
  runtime, and import behavior.
- `npm run validate` validates all AI assets and rejects malformed or
  secret-like content.
- `npm run build:registry` regenerates `ai/registry/assets.json`.
- `npm run build` builds the Astro window.
- `npm run check:artifacts` builds and audits `dist-operator`.
- `npm run runtime:diff -- --device runtime/devices/father-linux.json` shows
  device drift.
- `npm run runtime:sync -- --device runtime/devices/father-linux.json
  --target-root /tmp/ai-workflow-sync-dry-run` dry-runs without writing.
- Playwright verifies desktop and mobile pages render non-empty without obvious
  overlap.
