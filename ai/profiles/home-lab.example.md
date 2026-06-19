---
id: home-lab-example
kind: profile
domain: environment
visibility: private
status: valid
title: Example home lab runtime profile
summary: Use as a non-secret template for Linux-server-now and NAS-later AI Workflow Home deployment facts.
summary_zh: 家庭服务器/NAS 部署事实模板,只放非密信息
tags:
  - environment
  - server
  - nas
  - backup
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: Inspect the profile and confirm it contains hostnames, ports, and paths only; no keys, tokens, passwords, cookies, or private keys.
  expected: All secrets are referenced by local env files or secret managers, not stored in this repo.
  failure_next: Remove secrets from the profile and rotate any leaked credential.
---

## Template

```yaml
linux_server:
  host: ai-home-server.local
  site_port: 4321
  immich_url: http://immich.local
  backup_repo_label: restic-home-primary

future_nas:
  host: nas.local
  roles:
    - immich-storage
    - forgejo-mirror
    - restic-repository
```

## Reuse Rule

Load when configuring deployment or restore docs. Do not put secrets in this
file.
