# NAS Migration Plan

The first deployment target is a Linux server. The NAS migration should move
storage and selected services without changing the AI Workflow Home product
model: static web window, GitHub/repo asset baseline, local runtime adapters,
CLI sync, restic backups, and an optional local Git mirror.

## Migration Goals

- Keep reader blog access stable.
- Keep programmer operator workflows Git-based and restorable.
- Move high-value storage to the NAS first.
- Avoid inventing a custom account system or sync daemon.
- Preserve the same security boundary: LAN/VPN by default, protected public
  private access only through mature tools such as Cloudflare Access, Authelia,
  authentik, Tailscale, or WireGuard.
- Keep a rollback path to the Linux server until restore drills pass.

## What Can Move To The NAS

Move in phases:

| Phase | NAS role | Why |
| --- | --- | --- |
| 1 | restic backup repository | Low-risk first use of NAS storage |
| 2 | Git mirror with Forgejo or Gitea | Local resilience for programmer workflow |
| 3 | Static site serving | Optional, only if NAS web serving is reliable |
| 4 | Runtime snapshot storage | Optional shared location for `runtime/devices/*.json` |

Do not move every service at once. Treat the NAS first as reliable storage,
then as an application host only after backups and restores are routine.

If a separate photo service is introduced later, migrate it through that
service's official backup and restore procedure. Do not make AI Workflow Home
own photo storage.

## Pre-Migration Inventory

Record these facts before changing anything:

```text
Linux server hostname:
Linux server IP:
AI Workflow Home repo path:
Static site path:
runtime baseline path:
runtime device snapshot paths:
restic repository:
restic password location:
GitHub remote:
Current DNS names:
Firewall/VPN rules:
```

Also capture:

```bash
cd /srv/ai-workflow-home/repo
git status --short
git remote -v
npm run check:readonly
npm run build:operator
npm run check:operator-artifact
npm run runtime:baseline

restic snapshots
restic check
```

If the working tree is dirty, resolve or document it before migration.

## Phase 1: NAS As restic Target

Create a NAS share or repository path dedicated to restic. Restrict access to
the Linux server and programmer operators.

Example repository labels:

```text
restic-ai-workflow-home
restic-workstations
```

On the Linux server, update only host-local restic config:

```bash
sudoedit /etc/ai-workflow-home/restic.env
```

Then verify:

```bash
set -a
. /etc/ai-workflow-home/restic.env
set +a

restic snapshots
restic backup /srv/ai-workflow-home/repo /srv/ai-workflow-home/site
restic check
restic restore latest --target /tmp/ai-workflow-home-restore-check
```

Acceptance:

- The NAS holds new restic snapshots.
- A restore to `/tmp` works.
- The old backup target remains available until at least one scheduled NAS
  backup and one restore drill pass.

## Phase 2: Forgejo Or Gitea Mirror

GitHub stays first until an explicit decision changes it.

Recommended mirror shape:

```text
GitHub primary
  |
  `-- Forgejo/Gitea mirror on NAS
```

Rules:

- Start as a read-only mirror.
- Do not make developers push to both remotes manually.
- Document whether the NAS mirror is pull-only or can accept emergency pushes.
- Keep SSH keys and app tokens outside this repo.

Basic operator checks:

```bash
git remote -v
git ls-remote origin HEAD
git ls-remote nas-mirror HEAD
```

Promotion to primary requires a separate decision and updated docs. Until then,
GitHub remains the source of truth.

## Phase 3: Static Site On NAS

Move static serving only if the NAS can serve files reliably and log enough to
debug failures.

Two safe options:

- Build on a programmer machine or Linux server, then `rsync` `dist-operator/`
  to the NAS web root.
- Keep Linux as the build host and make the NAS only the static file host.

Avoid building the Node project directly on the NAS unless package management,
disk permissions, and scheduled jobs are well understood.

Acceptance:

```bash
curl -I http://nas.local/
curl -I http://ai-home.local/
```

Home, Blog, Search, AI Assets, and Runtime must resolve through LAN/VPN or the
protected private access layer.

## Phase 4: Runtime Snapshot Storage

Device snapshots can be collected through Git, rsync, or a NAS share. Keep the
source of truth simple:

- GitHub/repo checkout owns the baseline.
- Device JSON files describe observed device state.
- CLI diff/sync applies baseline-to-device changes.
- Local-to-GitHub changes stay Git/PR-based.

Do not introduce a continuous two-way sync tool for AI assets unless it still
preserves diff-before-apply semantics. Syncthing-style continuous sync is useful
for files, but it is the wrong default for canonical AI asset changes.

## DNS And Access

Prefer stable names over IP addresses:

```text
ai-home.local       static site
git-home.local      optional Forgejo/Gitea
nas.local           NAS admin and storage
```

Access policy stays the same:

- Reader blog route: LAN/VPN or public only when content is intentionally
  public.
- AI runtime/operator pages: LAN/VPN or protected private access.
- Admin consoles: VPN or admin LAN only.

Do not expose NAS admin UI directly to the internet.

## Final Acceptance Checklist

- Linux server has a current restic snapshot before cutover.
- NAS restic repository has a current snapshot.
- A restore drill from the NAS succeeds.
- Static site responds from the chosen host.
- Reader browser path is tested from a non-programmer device.
- Programmer workflow is tested from a clean checkout.
- `npm run runtime:diff -- --device runtime/devices/<device>.json` works for at
  least one device snapshot.
- GitHub primary and NAS mirror roles are documented.
- Firewall and VPN rules match the intended exposure.
- Old Linux paths are retained until the NAS has survived normal scheduled
  backup and restore checks.

## Decommission Old Linux Roles

Only remove old Linux roles after:

1. At least one scheduled NAS backup has completed.
2. `restic check` passes against the NAS repository.
3. A restore drill has been performed.
4. Reader browsers can reach the expected blog/site route.
5. Programmer operators can validate, diff runtime state, and deploy from a
   fresh checkout.

Until then, keep the Linux server as rollback capacity.
