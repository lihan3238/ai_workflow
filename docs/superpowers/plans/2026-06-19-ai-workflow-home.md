# AI Workflow Home Implementation Plan

> Current plan after the runtime-first correction. The earlier split
> family/photos artifact plan is superseded.

**Goal:** Build the first stable AI Workflow Home MVP: an Astro window, typed AI
asset registry, local runtime skill source, installer, runtime inventory CLI,
and deploy/backup documentation.

**Architecture:** Durable assets live as Markdown/YAML-like frontmatter under
`ai/`; TypeScript schema code parses and validates them, generates a static
registry, and feeds an Astro UI. Runtime inventory compares the GitHub/repo
baseline to device snapshots. The local AI runtime remains model-decoupled
through one `workflow-home` skill and tool-specific adapters.

**Tech Stack:** Node 22.12+, Astro 6, TypeScript, Vitest, tsx, yaml,
Markdown/MDX, static JSON registry.

## Task 1: Project Scaffold And Tooling

**Files:**

- `package.json`
- `tsconfig.json`
- `astro.config.mjs`
- `.gitignore`
- `.nvmrc`
- `.node-version`

Checklist:

- Create Node/Astro project metadata with scripts for dev, build, test,
  validation, registry, runtime, artifact audit, and full checks.
- Install dependencies: `astro`, `@astrojs/mdx`, `yaml`, `tsx`, `vitest`, and
  `typescript`.
- Run `npm install`.

## Task 2: Asset Schema And Registry

**Files:**

- `src/lib/assets/schema.ts`
- `src/lib/assets/registry.ts`
- `tests/assets.test.ts`
- `scripts/validate-assets.ts`
- `scripts/build-registry.ts`

Checklist:

- Validate `kind`: `card`, `prompt`, `skill`, `connector`, `profile`.
- Reject `workflow` as an asset kind.
- Validate `domain`: `coding`, `research`, `writing`, `environment`,
  `principle`.
- Validate `visibility`: `public`, `team`, `private`, `local-only`.
- Reject unknown fields and secret-like content.
- Generate deterministic `ai/registry/assets.json`.

## Task 3: Seed AI Runtime Assets

**Files:**

- `ai/cards/model-decoupled-workflow-home.md`
- `ai/cards/programmer-onboarding.md`
- `ai/prompts/codex-default.md`
- `ai/skills/workflow-home/SKILL.md`
- `ai/profiles/home-lab.example.md`
- `runtime/adapters/common/AGENTS.md`
- `ai/registry/assets.json`

Checklist:

- Add representative assets for cards, prompts, skills, and profiles.
- Keep workflow-shaped onboarding as a card, not `ai/workflows`.
- Run `npm run validate`.
- Run `npm run build:registry`.
- Run `npm run check:registry`.

## Task 4: Astro Window

**Files:**

- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/ai/index.astro`
- `src/pages/runtime.astro`
- `src/pages/search.astro`
- `src/pages/search-index.json.ts`
- `src/content.config.ts`
- `src/content/posts/*.md`

Checklist:

- Build a restrained operator-console UI.
- Render generated AI registry data on `/ai/`.
- Render runtime inventory and safe diff summaries on `/runtime/`.
- Remove `/family/` and `/photos`.
- Keep `operator` as the only supported site mode.
- Add static search index and search page.
- Ensure private/local prompt/profile paths are not rendered into static HTML.
- Run `npm run build`.

## Task 5: Runtime Installer And Inventory CLI

**Files:**

- `scripts/install-runtime.mjs`
- `scripts/runtime-assets.ts`
- `src/lib/runtime/inventory.ts`
- `src/lib/runtime/load.ts`
- `runtime/baseline/assets.json`
- `runtime/devices/*.json`
- `tests/install-runtime.test.ts`
- `tests/runtime-inventory.test.ts`
- `tests/runtime-load.test.ts`

Checklist:

- Implement a dry-run-first installer that manages only named Codex and Claude
  Code paths, backs up real files, and leaves unrelated skills/plugins
  untouched.
- Keep global `AGENTS.md` / `CLAUDE.md` management opt-in.
- Implement `runtime:baseline`, `runtime:inspect`, `runtime:diff`, and
  `runtime:sync`.
- Keep sync direction baseline-to-device.
- Keep local-to-GitHub changes in Git/CLI.

## Task 6: Legacy AI Asset Snapshot

**Files:**

- `scripts/import-legacy-blog.ts`
- `src/lib/legacy/import.ts`
- `tests/legacy-import.test.ts`

Checklist:

- Import only the allowlisted legacy cards and `lihan-cards` skill reference snapshot.
- Do not import old Hugo posts into the active blog.
- Keep this as a curated AI asset migration snapshot, not a full historical import.

## Task 7: Deployment Documentation

**Files:**

- `README.md`
- `docs/zh/ops-guide.md`
- `docs/deployment/linux-server.md`
- `docs/deployment/nas-migration.md`
- `docs/runtime/new-machine-restore.md`

Checklist:

- Document Linux-server-now and NAS-later deployment.
- Document no custom auth and no custom sync daemon.
- Document CLI-first runtime sync.
- Document single `operator` artifact.
- Remove stale `build:family`, `dist-family`, `/family/`, and `/photos`
  references from current docs.

## Task 8: Verification And Browser Review

Checklist:

- Run `npm run check`.
- Run runtime CLI smoke commands:
  - `npm run runtime:baseline`
  - `npm run runtime:inspect -- --device father-linux --label "Father Linux workstation" --ip 10.81.2.18 --out runtime/devices/father-linux.json`
  - `npm run runtime:diff -- --device runtime/devices/father-linux.json`
  - `npm run runtime:sync -- --device runtime/devices/father-linux.json --target-root /tmp/ai-workflow-sync-dry-run`
- Start a static server for `dist-operator`.
- Use Playwright to inspect desktop and mobile pages.
- Run `npm audit --audit-level=moderate`.
- Run `git diff --check`.
