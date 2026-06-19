---
id: lihan-cards-wsl-coder-agent-infra-map
kind: card
domain: environment
visibility: team
status: valid
title: WSL coder-agent infra map
summary: Look up when you need Lihan's WSL coding-agent infra facts — proxies,
  model gateways, skills, Spec Kit bridge, Docker services, WireGuard hosts, and
  safe checks — rather than rediscovering them.
summary_zh: 要查 WSL 编码 agent 基建时就看这张:代理、模型网关、skills、Spec Kit 桥、Docker、WireGuard
tags:
  - wsl
  - codex
  - claude-code
  - mcp
  - networking
  - docker
  - speckit
  - skills
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: codex mcp get playwright --json && claude mcp get playwright && docker
    ps --format '{{.Names}} {{.Image}} {{.Ports}}' && ssh -o BatchMode=yes -o
    ConnectTimeout=3 10.77.0.101 true && ssh -o BatchMode=yes -o
    ConnectTimeout=3 10.77.0.102 true
  expected: Playwright MCP is configured in Codex and Claude Code, Docker shows
    cli-proxy-api on 8317, and both WireGuard SSH hosts return exit 0.
  failure_next: Treat this card as stale for the failing subsystem; re-run the
    focused checks in Fix and update the map before relying on it.
---

> Imported from lihan3238.github.io ai/cards/wsl-coder-agent-infra-map.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Display / Runtime Route

- Blog role: display/sync/bootstrap representation of a WSL engineering fact map.
- Local runtime route: `skills/lihan-cards/references/modes.md` (engineering mode + preflight context budget) for Spec Kit plus bridge work.
- Runtime status: fact/preflight bundle input; verify only the relevant subsystem before relying on it.

## Trigger

Load when an agent needs to understand or debug Lihan's WSL coding-agent
environment: Codex / Claude Code config, MCP setup, model gateway routing,
network proxy behavior, `cc-switch`, Spec Kit / Superpowers bridge state,
Docker services, WireGuard hosts, or local/remote API endpoints.

## Environment Map

Verified on 2026-06-18 UTC from WSL:

- **Proxy**: do not hard-code a proxy host in durable notes. For WSL
  outbound failures (`git`, `gh`, `curl`, `npm`, `npx`, `pip`), first
  check the current machine/project instructions or shell environment,
  then apply the current proxy as one-shot env vars. Do not set global
  git proxy.
- **Codex**: `codex-cli 0.136.0`, config `~/.codex/config.toml`;
  provider `newapi`, model `gpt-5.5`, Responses wire API, base URL
  `http://10.77.0.11:8317/v1`, response storage disabled.
- **Claude Code**: `2.1.161`, user state `~/.claude.json`; skill
  inputs may come from `~/.claude/skills` and `~/.cc-switch/skills`.
- **Playwright MCP**: user/global stdio server in both Codex and
  Claude Code: `npx -y @playwright/mcp@latest --config
  $HOME/.config/playwright-mcp/config.json`. No browser proxy by
  default. Verified usable from Codex via the built-in Playwright MCP
  browser tools on 2026-06-04.
- **`cc-switch`**: state in `~/.cc-switch/`; includes `settings.json`,
  `cc-switch.db`, backups, logs, and `skills/lihan-cards/SKILL.md`.
  It is a provider/MCP/skill/proxy/usage control plane, not just a
  provider switcher. DB tables include `providers`, `provider_endpoints`,
  `mcp_servers`, `skills`, `skill_repos`, `proxy_config`,
  `provider_health`, `proxy_request_logs`, `usage_daily_rollups`,
  `stream_check_logs`, and `session_log_sync`.
- **`cc-switch` current shape**: visible apps are Claude, Claude
  Desktop, and Codex; skill sync is `auto`; skill storage is
  `cc_switch`; local proxy and failover are disabled. Provider counts:
  Claude 3, Codex 4, Gemini 2, OpenCode 1. Current DB providers:
  Claude `NewAPI`; Codex `cpa ktz`. Some DB endpoints may be stale
  historical records; verify the current landed agent config before
  using them. Current Codex config points at the overlay alias
  `http://10.77.0.11:8317/v1`, which returned `Missing API key` when
  probed without credentials.
- **Skills/plugins**: Codex system skills include `imagegen`,
  `openai-docs`, `plugin-creator`, `skill-creator`,
  `skill-installer`; Superpowers is enabled from
  `~/.codex/plugins/cache/openai-curated/superpowers/...`;
  `lihan-cards` now installs from the blog repo via `scripts/install.sh` (symlink into `~/.claude/skills` + `~/.codex/skills`), superseding the old `~/.cc-switch/skills` copy.
- **Spec Kit**: `specify 0.11.1` at `~/.local/bin/specify`; repos may
  have `.specify`, `.agents/skills/speckit-*`, and
  `.claude/skills/speckit-*`. `speckit-superpowers-bridge` is Lihan's
  GitHub project `lihan3238/speckit-superpowers-bridge`; local source
  repo is `/mnt/c/lihan_work/ai_workplace/codex_specify_superpower`.
  Blog repo has extension version `1.1.0` with Codex + Claude
  integrations, and its tracked Spec Kit integration metadata is refreshed
  to `0.11.1`.
- **Docker/API**: running local CPA `eceasy/cli-proxy-api:latest` on
  `8317` with config bind-mounted from `~/.cli-proxy-api`, plus
  `awwaawwa/pdfmathtranslate-next:latest` on `17860`; image
  `calciumion/new-api:latest` exists but was not running locally.
- **Public API deployment**: `api.lihan3238.com` is backed by Lihan's
  GitHub repo `lihan3238/lihan_ai`, deployed on host
  `<vps-host>` with SSH user `lihan`. The local repo has
  New API, CPA, Cloudflare Tunnel, Caddy fallback, backup, and
  browser-e2e runbooks; public `https://api.lihan3238.com` returns
  New API headers.
- **Overlay/servers**: operator-provided overlay is `10.77.0.11/24`.
  WSL may not show `wg*`; check Windows/host WireGuard if routing is
  odd. SSH hosts `hello@10.77.0.101` and `dell@10.77.0.102` both
  passed BatchMode smoke tests.

## Fix

Use these checks before changing configuration:

```bash
codex mcp list
codex mcp get playwright --json
claude mcp list
claude mcp get playwright

curl -sI --proxy "$CURRENT_PROXY_URL" https://github.com | head -1
https_proxy="$CURRENT_PROXY_URL" http_proxy="$CURRENT_PROXY_URL" npm view @playwright/mcp version

docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
curl -sS --max-time 5 http://127.0.0.1:8317/v1/models
curl -sS --max-time 5 http://10.77.0.11:8317/v1/models
curl -sSI --max-time 8 https://api.lihan3238.com | sed -n '1,20p'

ssh -G 10.77.0.101 | awk '/^(hostname|user|port|identityfile) / {print}'
ssh -G 10.77.0.102 | awk '/^(hostname|user|port|identityfile) / {print}'
ssh -o BatchMode=yes -o ConnectTimeout=3 10.77.0.101 true
ssh -o BatchMode=yes -o ConnectTimeout=3 10.77.0.102 true

specify --version
sed -n '1,120p' .specify/init-options.json 2>/dev/null
sed -n '1,120p' .specify/integration.json 2>/dev/null
sed -n '1,160p' .specify/extensions/speckit-superpowers-bridge/extension.yml 2>/dev/null
```

Expected unauthenticated local gateway response:
`{"error":"Missing API key"}`.

Operational rules:

- Keep MCP deployment user/global unless a repo explicitly needs a
  reproducible project-level server. For Playwright, prefer `stdio`,
  `@latest`, and the shared `$HOME/.config/playwright-mcp/config.json`
  config file for cross-agent parity.
- Do not add `--proxy-server` to Playwright MCP by default. Add it only
  for browser traffic that must reach the public internet through the proxy.
- Use `https_proxy=... http_proxy=... <command>` one-shot style for WSL
  network operations. Never bake the proxy into global git config.
- Keep secrets out of notes and cards: redact `sk-*`, bearer tokens,
  provider IDs that act as credentials, Docker env secrets, SSH private keys,
  WireGuard private keys, and SQLite DB contents.
- Treat `~/.codex/.tmp/plugins` as cache/discovery material, not as the
  authoritative installed-plugin state.
- Do not record temporary local WebUI forwards, such as `127.0.0.1:*`
  SSH tunnels used only for manual viewing, as stable infra routes.

## Reuse Rule

- **Load when**: a future agent is setting up, debugging, or extending
  Lihan's WSL coder-agent infrastructure, especially around Codex,
  Claude Code, MCP servers, `cc-switch`, Spec Kit, Docker gateways, or
  10.77 overlay hosts.
- **Do not load when**: working inside a normal project where only the
  repo-local code, tests, or AGENTS.md rules matter and no machine-level
  agent infrastructure is being changed.
