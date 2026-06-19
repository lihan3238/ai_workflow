# New Machine Restore

This runbook restores AI Workflow Home access on a new programmer machine or a
replacement Linux server. Non-programmer readers do not need this process; they
only need the reachable blog URL through the intended LAN/VPN/private access
boundary.

## Restore Types

| Type | Use when | Main result |
| --- | --- | --- |
| Programmer workstation | Lihan, father, or another trusted programmer sets up a laptop/desktop | Git checkout, local validation, Codex/Claude runtime assets |
| Replacement Linux server | The current home server is rebuilt | Static site, runtime inventory, reverse proxy, restic restore path |
| NAS-backed restore | NAS already stores backups or mirrors | Same as above, with NAS as backup/source |

## Programmer Workstation

Prerequisites:

- Git and SSH keys for GitHub.
- Node.js `22.12.0` or newer and npm `9.6.5` or newer.
- Codex and/or Claude Code installed if this machine will use local runtime
  assets.
- LAN/VPN access if the site is private.

Clone and verify:

```bash
git clone git@github.com:lihan3238/ai_workflow.git ai_workflow
cd ai_workflow
nvm use 2>/dev/null || true
node --version
npm ci

npm run check:readonly
npm run build:operator
npm run check:operator-artifact
```

Use `npm run build:registry` only when intentionally changing AI asset source
files and reviewing the generated `ai/registry/assets.json` diff.

Confirm Git identity:

```bash
git remote -v
git status --short
git config user.name
git config user.email
```

Install runtime assets:

```bash
node scripts/install-runtime.mjs --dry-run
node scripts/install-runtime.mjs --apply
```

The installer manages only the `workflow-home` skill links by default. If a
machine has no existing global agent guide and should opt in to this repo's
common guide, inspect first:

```bash
node scripts/install-runtime.mjs --dry-run --manage-global-guides
```

Do not use `--manage-global-guides` on machines where `~/.codex/AGENTS.md` or
`~/.claude/CLAUDE.md` already point to a personal canonical config.

Relevant source assets:

- Entry skill: `ai/skills/workflow-home/SKILL.md`
- Programmer onboarding card: `ai/cards/programmer-onboarding.md`
- Codex prompt pack: `ai/prompts/codex-default.md`
- Runtime adapters: `runtime/adapters/`
- Registry: `ai/registry/assets.json`

Do not copy secrets into this repository. Tool credentials belong in each
tool's normal credential store or in host-local secret files.

## Runtime Inventory Restore

After a workstation is functional, record its state for the Runtime page.

Create or refresh the repo baseline from the latest checkout:

```bash
git pull --ff-only
npm run validate
npm run build:registry
npm run runtime:baseline
```

Only `runtime/baseline/assets.json` is Git-tracked. Real device registry and
snapshot files under `runtime/devices/` are local runtime state and stay ignored
because they contain host identities, IPs, usernames, paths, and tool snapshots.
Restore them from encrypted local backup or recreate them with the commands
below.

Create a device snapshot through passwordless SSH:

```bash
npm run runtime:inspect -- --device father-linux --label "Father Linux workstation" --ssh user@10.81.2.18:22 --out runtime/devices/father-linux.json
```

After passwordless SSH is configured, register the device and run the scanner:

```bash
npm run runtime:device:add -- --id father-linux --label "Father Linux workstation" --ssh user@10.81.2.18:22
npm run runtime:scan -- --watch --interval-seconds 180
```

The scanner records host identity, operating system, `AGENTS.md` /
`CLAUDE.md`, project asset drift, and AI toolchain metadata. For Claude Code,
Codex, and cc-switch it stores install status, version, binary path, config
paths, cc-switch DB path, and DB `user_version`. It does not copy provider
secrets or config bodies.
Workflow projects are discovered from existing markers: `AGENTS.md`,
`ai/cards`, `ai/skills`, `runtime/adapters`, or an explicit
`.workflow-home.json`. `.agents/` is recorded as supporting evidence only when
a stronger marker already opted in the project. The scanner checks the
configured `remote_root`, its parent, and common workspace directories, so no
separate project registry is needed for MVP.

For trusted-LAN browser add/delete, run the local operator API:

```bash
npm run operator:serve
```

Do not expose this API outside the firewall/reverse proxy boundary.

Review drift before applying anything:

```bash
npm run runtime:diff -- --device runtime/devices/father-linux.json
```

Sync the repo baseline to a target checkout only after review:

```bash
npm run runtime:sync -- --device runtime/devices/father-linux.json --target-root /path/to/device/repo
npm run runtime:sync -- --device runtime/devices/father-linux.json --target-root /path/to/device/repo --apply
```

The sync command writes missing/changed baseline files and keeps extra local
files. Local-to-GitHub changes still go through `git diff`, commit, push, and
PR as appropriate.

## Replacement Linux Server

Install system packages:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates restic caddy
```

Install Node through the trusted host policy (`nvm`, `asdf`, `mise`,
NodeSource, or a distribution package that is verified new enough), then check:

```bash
node --version
npm --version
```

Recreate the deployment layout:

```bash
sudo useradd --system --create-home --home-dir /srv/ai-workflow-home deploy || true
sudo mkdir -p /srv/ai-workflow-home/repo /srv/ai-workflow-home/site
sudo mkdir -p /var/lib/ai-workflow-home /etc/ai-workflow-home
sudo chown -R deploy:deploy /srv/ai-workflow-home /var/lib/ai-workflow-home
```

Restore source from GitHub:

```bash
sudo -u deploy git clone git@github.com:lihan3238/ai_workflow.git /srv/ai-workflow-home/repo
```

Build and publish as the deploy user:

```bash
sudo -iu deploy
cd /srv/ai-workflow-home/repo
nvm use 2>/dev/null || true
node --version
npm ci
npm run validate
npm run check:registry
npm run test
npm run typecheck
npm run build:operator
npm run check:operator-artifact
rsync -a --delete dist-operator/ /srv/ai-workflow-home/site/
exit
```

Restore web server config from operations notes or recreate the minimal Caddy
config:

```caddyfile
ai-home.local {
	root * /srv/ai-workflow-home/site
	encode zstd gzip
	file_server
}
```

Then:

```bash
sudo systemctl reload caddy
curl -I http://127.0.0.1/
```

## restic Restore

Restore restic host-local config from a password manager, printed runbook, or
other secure local source. Do not commit it.

Expected local file shape:

```bash
RESTIC_REPOSITORY=/mnt/backup/restic/ai-workflow-home
RESTIC_PASSWORD_FILE=/etc/ai-workflow-home/restic-password
```

Load and inspect snapshots:

```bash
set -a
. /etc/ai-workflow-home/restic.env
set +a

restic snapshots
restic check
```

Restore to a staging directory first:

```bash
sudo mkdir -p /var/lib/ai-workflow-home/restore-check
sudo chown deploy:deploy /var/lib/ai-workflow-home/restore-check

restic restore latest --target /var/lib/ai-workflow-home/restore-check
```

Inspect before replacing live paths:

```bash
find /var/lib/ai-workflow-home/restore-check -maxdepth 3 -type f | sort | head -50
```

Only after inspection should you copy restored files into service paths.

## Access Restore

LAN/VPN default:

- Confirm the server has the expected LAN IP.
- Confirm DNS or local hostnames resolve.
- Confirm firewall rules allow only intended clients.

Protected public private access:

- Restore Cloudflare Access, Authelia, or authentik configuration from its own
  admin console or backup.
- Confirm identity policy before exposing the origin.
- Test from outside the LAN with a non-admin session.

Never make private operator routes public just to simplify restore.

## Optional Git Mirror Restore

GitHub is primary unless a separate migration says otherwise.

For an optional Forgejo/Gitea mirror:

```bash
git remote add nas-mirror ssh://git@nas.local/lihan/ai_workflow.git
git ls-remote origin HEAD
git ls-remote nas-mirror HEAD
```

If the mirror is stale, resync from GitHub. Do not promote the mirror to primary
during an incident unless the operator notes explicitly say to do so.

## Final Verification

Programmer workstation:

```bash
npm run check:readonly
npm run runtime:diff -- --device runtime/devices/father-linux.json
git status --short
```

Replacement server:

```bash
curl -I http://127.0.0.1/
systemctl status caddy --no-pager
restic snapshots
restic check
```

Human checks:

- Reader can open the blog URL through the intended access path.
- Programmer can inspect `ai/registry/assets.json`.
- Programmer can open `/runtime/` and see expected device status.
- Programmer can start Codex or Claude Code with the local `workflow-home`
  guidance.
- No secrets were added to Git.

If any verification fails, stop and fix the failed layer before restoring more
services.
