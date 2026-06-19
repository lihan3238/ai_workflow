# AI Workflow Home

AI Workflow Home is a small, model-decoupled home base for AI workflow assets.
The web site is the readable window; the durable system is the local runtime:
cards, prompts, skills, profiles, device inventories, validation, install
adapters, Git, and backups.

The first deployment target is a Linux server on an already-networked home LAN.
Home computers reach it over LAN or VPN. A future NAS migration is treated as an
operations move, not a product rewrite.

## Users

- Programmer operators, currently Lihan and his father, manage the AI workflow:
  assets, device inventories, validation, deployments, runtime installation,
  backups, and restore drills.
- Non-programmer readers can read public blog posts from the same site, but
  this project no longer carries a separate family/photos product surface.
- Future trusted programmers can join the operator path through Git access and
  the same runtime restore procedure. This project is not a public SaaS.

## Quick Start

Required runtime:

- Node.js `22.12.0` or newer (the repo includes `.nvmrc` and
  `.node-version`).
- npm `9.6.5` or newer.

```bash
git clone git@github.com:lihan3238/ai_workflow.git ai_workflow
cd ai_workflow
nvm use 2>/dev/null || true
npm ci

npm run validate
npm run build:registry
npm run check:registry
npm run test
npm run build
```

For local development:

```bash
nvm use 2>/dev/null || true
npm run dev -- --host 127.0.0.1
```

For a LAN preview from another home machine, bind to the server LAN interface
only after the firewall is configured:

```bash
npm run dev -- --host 0.0.0.0
```

Do not use the dev server as the production server. Production should build
static output and serve it from a normal web server such as Caddy or nginx.

Build and artifact check:

```bash
npm run build:operator
npm run check:artifacts
```

`operator` is the only supported site mode. The historical `family` and
`photos` routes were removed; the runtime page is now the system center.

Runtime install command for programmer machines:

```bash
node scripts/install-runtime.mjs --dry-run
node scripts/install-runtime.mjs --apply
```

Always run the dry run first. The installer is allowed to manage only documented
Codex and Claude Code runtime paths, and it must not touch unrelated skills,
plugins, prompts, or user files. By default it installs only the
`workflow-home` skill links. It does not manage global `AGENTS.md` or
`CLAUDE.md` files unless explicitly run with `--manage-global-guides`, which is
intended only for machines without an existing canonical agent guide.

Legacy migration snapshot from `lihan3238.github.io`:

```bash
npm run import:legacy
npm run import:legacy -- --apply
npm run validate
npm run build:registry
```

The default import is allowlisted: five legacy Hugo posts, four legacy cards,
one non-default `lihan-cards` skill snapshot, and copied legacy post media under
`public/legacy/`. It is for workflow testing and review, not a full historical
migration.

Runtime inventory and sync CLI:

```bash
npm run runtime:baseline
npm run runtime:inspect -- --device my-host --label "My Host" --ssh user@10.81.2.18:22
npm run runtime:device:add -- --id father-linux --label "Father Linux workstation" --ssh user@10.81.2.18:22
npm run runtime:scan -- --watch --interval-seconds 180
npm run operator:serve
npm run runtime:diff -- --device runtime/devices/my-host.json
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo --apply
```

The GitHub/repo checkout is the source of truth for AI assets. Runtime sync only
downloads the latest managed assets to a target device after a diff review.
Uploading local changes back to GitHub stays a professional Git/CLI workflow.
If SSH is not configured yet, use `--network-only` with `--ip` for a truthful
reachability snapshot instead of pretending that local assets came from the
remote machine.
The static operator build is read-only. `npm run operator:serve` starts a thin
LAN-local API that lets the browser add/delete hosts by editing
`runtime/devices/config.json`; keep access control at the firewall/reverse-proxy
layer.

Device snapshots are SSH-first. They record `user@ip`, operating system,
last-seen time, `AGENTS.md` / `CLAUDE.md` verification, managed asset drift,
and local AI toolchain state. Runtime cards show red/green install badges for
Claude Code, Codex, and cc-switch; device detail pages show versions, binary
paths, config file paths, cc-switch DB path, and DB `user_version`. The
collector reads metadata only, not provider secrets or config bodies.
Projects are detected from existing workflow markers rather than a new project
database: `AGENTS.md`, `ai/cards`, `ai/skills`, `runtime/adapters`, or an
explicit `.workflow-home.json` marker. `.agents/` is recorded when present, but
it does not opt in a project by itself. The scanner checks the configured
`remote_root`, its parent, and common workspace folders such as `~/work`,
`~/projects`, and `~/github_repos`.

The full legacy `lihan_cards` card set from `lihan3238.github.io` is copied and
schema-converted under `ai/cards/imported-lihan-cards/`. The old
`skills/lihan-cards` directory is preserved under `docs/legacy/lihan-cards-skill/`
as a reference snapshot only, not as an installable skill asset. The only
installable entry skill in this repository is `ai/skills/workflow-home/SKILL.md`.
Old user-level non-secret config snapshots are preserved as private profiles
under `ai/profiles/imported-lihan-cards/`. Existing legacy snapshots remain
under `ai/cards/legacy/` for migration history.

## Directory Structure

```text
.
|-- AGENTS.md
|-- README.md
|-- ai/
|   |-- cards/              # Reusable decision cards and principles
|   |-- prompts/            # Durable prompt packs
|   |-- profiles/           # Non-secret environment/profile templates
|   |-- registry/           # Generated asset registry
|   |-- skills/             # Local runtime skills, including workflow-home
|-- docs/
|   |-- deployment/         # Linux server and NAS migration runbooks
|   |-- runtime/            # Restore and machine onboarding docs
|   `-- superpowers/        # Spec and implementation plan history
|-- runtime/                 # Device inventories and GitHub/repo asset baseline
|-- scripts/                # Validation, registry, and runtime installer scripts
|-- src/                    # Astro and TypeScript source
|-- tests/                  # Vitest coverage for asset/runtime behavior
|-- package.json
`-- tsconfig.json
```

The generated registry is `ai/registry/assets.json`. Source asset files are the
source of truth; the registry is a discovery index and build artifact.

## Verification Commands

Run these before deploying, changing runtime assets, or publishing private
content behind a new access boundary:

```bash
npm run validate
npm run typecheck
npm run test
npm run check:registry
npm run build:web
```

Full project check:

```bash
npm run check
```

Release artifact check:

```bash
npm run check:artifacts
```

Read-only check for deployment/CI paths that should not regenerate registry:

```bash
npm run check:readonly
npm run build:web
```

Registry regeneration:

```bash
npm run build:registry
git diff -- ai/registry/assets.json
```

Security review for secrets before commit:

```bash
npm run validate
git diff --check
git diff -- README.md docs ai src scripts tests package.json
```

Deployment smoke checks on the server:

```bash
curl -I http://127.0.0.1/
systemctl status caddy --no-pager
restic snapshots
restic check
```

Use the service names actually deployed on the host. If nginx is used instead
of Caddy, check nginx.

## Security Boundary

This repository does not build an account system.

Access control is layered outside the app:

- Default home access: LAN firewall plus VPN.
- Private public access: Cloudflare Access, Authelia, or authentik in front of
  the private route.
- Public blog access: only publish content intentionally safe for the public.
- Git: GitHub is the source remote first; a Forgejo or Gitea mirror can be added
  later for local resilience.
- Backups: restic owns encrypted backup snapshots and restore checks.

Never store secrets in this repo. That includes API keys, GitHub tokens,
Cloudflare tokens, OAuth secrets, cookies, database passwords, restic passwords,
private keys, and photo-service admin credentials. Keep them in host-local
files, secret managers, or tool-specific credential stores.

Recommended visibility split:

| Surface | Audience | Access |
| --- | --- | --- |
| Public blog posts | Anyone, if intentionally published | Public static route |
| AI registry and runtime docs | Programmer operators | Operator build behind LAN/VPN or private access proxy |
| Runtime device inventory | Programmer operators | Operator build behind LAN/VPN or private access proxy |
| Source repo and secrets | Programmer operators only | Git and host-local secret stores |

If a route mixes reader-safe content with AI/runtime details, treat it as a
private operator route until it is separated.

## Deployment Docs

- [中文操作与运维说明](docs/zh/ops-guide.md)
- [Linux server deployment](docs/deployment/linux-server.md)
- [NAS migration plan](docs/deployment/nas-migration.md)
- [New machine restore](docs/runtime/new-machine-restore.md)
