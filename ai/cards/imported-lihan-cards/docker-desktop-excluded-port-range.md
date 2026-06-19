---
id: lihan-cards-docker-desktop-excluded-port-range
kind: card
domain: coding
visibility: team
status: valid
title: Docker Desktop port bind blocked by Windows excluded range
summary: When Docker Desktop says a port is forbidden, check Windows excluded
  TCP ranges before chasing container logs or app listeners.
summary_zh: Docker Desktop 报端口禁用,先查 Windows 排除端口段,别先翻容器日志
tags:
  - docker
  - windows
  - wsl
  - networking
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: "On Windows: netsh interface ipv4 show excludedportrange protocol=tcp;
    then compare the failing published port against the listed ranges."
  expected: If the failed Docker published port falls inside an excluded range,
    moving only the host-side port outside excluded and dynamic ranges lets
    Docker publish successfully.
  failure_next: If the port is not excluded, inspect actual listeners with
    netstat/Get-NetTCPConnection, then check Docker Desktop/HNS logs before
    changing compose.
---

> Imported from lihan3238.github.io ai/cards/docker-desktop-excluded-port-range.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

- Docker Desktop on Windows/WSL fails to start a container with a
  published port.
- Error text includes `ports are not available`, `bind`, and `An
  attempt was made to access a socket in a way forbidden by its access
  permissions`.
- Other containers can publish ports, so the failure appears
  container-specific.

## Symptoms

- `docker start <container>` or `docker compose up -d` fails before the
  app inside the container gets a chance to serve traffic.
- `netstat` / `Get-NetTCPConnection` may show no process listening on
  the failed port.
- Docker inspect shows a normal `HostConfig.PortBindings`, e.g.
  `0.0.0.0:7860:7860`, but Docker Desktop still cannot expose it.

## Diagnosis

- Docker Desktop publishes the host port on the Windows side, even
  when the command is run from WSL.
- Windows can reserve excluded TCP ranges for Hyper-V/HNS/WinNAT/WSL
  networking. A port inside one of those ranges can fail with the
  socket-permission message even when no user process is listening.
- There is no ordinary TCP port that is guaranteed never to be used
  after reboot. Pick a fixed host port by checking current exclusions,
  current listeners, and the current Windows dynamic port range.

## Fix

Check the failing port from Windows, not only from WSL:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
netsh interface ipv4 show dynamicport tcp
netstat -ano | Select-String ":7860"
Get-NetTCPConnection -LocalPort 7860 -ErrorAction SilentlyContinue
```

Decision rule:

- If the failing port is inside an excluded range: choose a different
  host port outside all excluded ranges.
- Prefer a stable, project-specific host port outside the current
  Windows dynamic range when practical.
- Also verify the replacement is not already listening:
  `netstat -ano | Select-String ":<new-port>"`.
- In compose, change only the left-side host port; keep the
  right-side container port and app `--server-port` unchanged.

Example:

```yaml
ports:
  - "0.0.0.0:17860:7860"
```

Verify:

```bash
docker -H unix:///var/run/docker.sock compose -f docker/docker-compose.yml up -d
docker -H unix:///var/run/docker.sock ps --filter name=<container>
```

From Windows:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:17860/ -UseBasicParsing -TimeoutSec 10
```

## Reuse Rule

- **Load when**: Docker Desktop on Windows/WSL reports host-port bind
  failures with socket access/permission wording, especially when no
  normal listener owns the port.
- **Do not load when**: the port is visibly owned by another process,
  the container app crashes after Docker successfully publishes the
  port, or the environment is native Linux without Docker Desktop's
  Windows-side port forwarding.
