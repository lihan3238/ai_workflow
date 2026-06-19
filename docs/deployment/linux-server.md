# Linux Server Deployment

This runbook deploys AI Workflow Home to a Linux server on the home network.
The server hosts a single static web window: Home, Blog, Search, AI Assets, and
Runtime. Backups are handled by restic. GitHub is the source remote first.

## Target Topology

```text
Home computers
  |-- Reader browsers: blog and intentionally public/readable posts
  `-- Programmer machines: Git, validation, runtime assets, Codex/Claude

Home LAN or VPN
  |
Linux server
  |-- Static AI Workflow Home site
  |-- Reverse proxy: Caddy or nginx
  |-- restic backup jobs
  `-- Optional future Git mirror client
```

Default exposure is LAN or VPN only. Do not expose Runtime or AI asset pages
directly to the public internet. If remote private access is needed, put
Cloudflare Access, Authelia, authentik, Tailscale, or WireGuard in front of the
private hostname.

Photos are not part of the AI Workflow Home MVP. If a separate photo service is
added later, treat it as an independent service with its own accounts, backups,
and access policy.

## Assumptions

- Debian or Ubuntu-style Linux server with systemd.
- Git, Node.js `22.12.0` or newer, npm `9.6.5` or newer, and a static web
  server are installed.
- The server is reachable from the home LAN by hostname, for example
  `ai-home.local`.
- restic repository credentials are stored outside this repo.

Example base packages:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates restic caddy
```

Install Node through the version manager or package policy you already trust
for the server, such as `nvm`, `asdf`, `mise`, or NodeSource. Do not rely on
the distribution `nodejs` package unless it is verified to satisfy the project
engine requirement:

```bash
node --version
npm --version
```

## Filesystem Layout

Recommended paths:

```text
/srv/ai-workflow-home/repo      # Git checkout
/srv/ai-workflow-home/site      # Built static output served by Caddy/nginx
/var/lib/ai-workflow-home       # Local state, restore staging, generated dumps
/etc/ai-workflow-home           # Host-local env files, not committed
/var/log/ai-workflow-home       # Optional deployment logs
```

Create an unprivileged deploy user:

```bash
sudo useradd --system --create-home --home-dir /srv/ai-workflow-home deploy
sudo mkdir -p /srv/ai-workflow-home/repo /srv/ai-workflow-home/site
sudo mkdir -p /var/lib/ai-workflow-home /etc/ai-workflow-home
sudo chown -R deploy:deploy /srv/ai-workflow-home /var/lib/ai-workflow-home
```

Keep `/etc/ai-workflow-home` root-readable only if it contains secrets.

## Build And Publish

As the deploy user:

```bash
cd /srv/ai-workflow-home
git clone git@github.com:lihan3238/ai_workflow.git repo
cd repo
nvm use 2>/dev/null || true
node --version
npm ci
npm run check:readonly
npm run build:operator
npm run check:operator-artifact
```

Publish the static build:

```bash
rsync -a --delete dist-operator/ /srv/ai-workflow-home/site/
```

The deployment server should not silently regenerate
`ai/registry/assets.json`. Source assets and registry diffs are generated and
committed from a programmer machine or CI-reviewed branch before deployment.

## Runtime Inventory On The Server

The Runtime page reads:

- `runtime/baseline/assets.json`
- `runtime/devices/*.json`

Refresh the baseline from the latest checkout:

```bash
git pull --ff-only
npm run validate
npm run build:registry
npm run runtime:baseline
npm run build:operator
npm run check:operator-artifact
rsync -a --delete dist-operator/ /srv/ai-workflow-home/site/
```

Create device snapshots on each programmer machine, then commit or transfer the
JSON back into `runtime/devices/`:

```bash
npm run runtime:inspect -- --device my-host --label "My Host" --ip 10.81.2.18 --out runtime/devices/my-host.json
npm run runtime:device:add -- --id my-host --label "My Host" --ssh user@10.81.2.18:22
npm run runtime:scan -- --watch --interval-seconds 180
npm run runtime:diff -- --device runtime/devices/my-host.json
```

Runtime sync is CLI-only:

```bash
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo --apply
```

The default static site is read-only. If the trusted LAN operator needs browser
add/delete for hosts, run the thin local API instead of adding custom accounts
or a sync daemon:

```bash
npm run operator:serve
```

Keep access control in the firewall/reverse proxy. Do not expose this API to the
public internet.

## Static Web Server

Example Caddy site for LAN-only access:

```caddyfile
ai-home.local {
	root * /srv/ai-workflow-home/site
	encode zstd gzip
	file_server
}
```

Install it as a site snippet instead of overwriting the whole Caddyfile:

```bash
sudo mkdir -p /etc/caddy/conf.d
sudo tee /etc/caddy/conf.d/ai-workflow-home.caddy >/dev/null <<'CADDY'
ai-home.local {
	root * /srv/ai-workflow-home/site
	encode zstd gzip
	file_server
}
CADDY
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date -u +%Y%m%d%H%M%S)
grep -q '^import /etc/caddy/conf.d/\*.caddy' /etc/caddy/Caddyfile || \
  printf '\nimport /etc/caddy/conf.d/*.caddy\n' | sudo tee -a /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

For nginx, serve `/srv/ai-workflow-home/site` as a static root and keep the
same network boundary. Do not proxy `npm run dev` as production.

## Firewall Boundary

Recommended default:

```text
22/tcp     admin SSH from trusted LAN or VPN only
80,443/tcp LAN or VPN clients only
DB ports   not exposed
restic     outbound or local repository only
```

With `ufw`, adapt the source CIDRs to the actual home network:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp
sudo ufw allow from 192.168.0.0/16 to any port 80 proto tcp
sudo ufw allow from 192.168.0.0/16 to any port 443 proto tcp
sudo ufw enable
sudo ufw status verbose
```

If remote private access is needed:

- Cloudflare Access: expose only the protected hostname through the tunnel and
  require identity policy before reaching the origin.
- Authelia or authentik: place it in front of the private route at the reverse
  proxy.
- VPN: keep the site private and route users into the LAN.

Do not mix private AI runtime pages into a public static route.

## restic Backup

Store restic settings in a host-local file:

```bash
sudo install -d -m 0750 /etc/ai-workflow-home
sudo tee /etc/ai-workflow-home/restic.env >/dev/null <<'ENV'
RESTIC_REPOSITORY=/mnt/backup/restic/ai-workflow-home
RESTIC_PASSWORD_FILE=/etc/ai-workflow-home/restic-password
ENV
sudo chmod 0640 /etc/ai-workflow-home/restic.env
```

Initialize once:

```bash
set -a
. /etc/ai-workflow-home/restic.env
set +a
restic init
```

Backup example:

```bash
set -a
. /etc/ai-workflow-home/restic.env
set +a

restic backup \
  /srv/ai-workflow-home/repo \
  /srv/ai-workflow-home/site \
  /var/lib/ai-workflow-home

restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
restic check
```

## Git Remote Strategy

Initial source of truth:

```text
GitHub remote -> Linux server checkout -> static build
```

Rules:

- Operators push source changes to GitHub.
- The server pulls from GitHub or receives a CI-built artifact.
- Generated registry diffs should be committed from a programmer machine, not
  silently produced only on the server.
- Forgejo or Gitea can be added later as a mirror for local resilience, not as a
  second manual source of truth.

Future mirror direction:

```text
GitHub primary mirrored to Forgejo/Gitea on NAS or server
```

Document which remote is primary before enabling bidirectional pushes.

## Deployment Checklist

Before switching traffic:

- `npm run check:readonly` passes.
- `npm run build:operator` passes.
- `npm run check:operator-artifact` passes.
- Static output is copied to `/srv/ai-workflow-home/site`.
- `curl -I http://127.0.0.1/` returns a successful response from the web
  server.
- Firewall allows only LAN/VPN or protected private access.
- `restic snapshots` shows current backups.
- `restic check` completes successfully.

After switching traffic:

```bash
curl -I http://ai-home.local/
systemctl status caddy --no-pager
restic snapshots
```

Replace `caddy` and `ai-home.local` with the actual service and hostname.

## Rollback

Static site rollback is file-level:

1. Keep the previous built site in a timestamped directory or restic snapshot.
2. Restore the previous site into `/srv/ai-workflow-home/site`.
3. Reload the web server.
4. Confirm with `curl -I`.

Source rollback is Git-level:

```bash
cd /srv/ai-workflow-home/repo
git log --oneline -n 10
git switch main
git pull --ff-only
```

Avoid rewriting server history. If a bad commit was pushed, fix forward or
revert through Git from a programmer machine.
