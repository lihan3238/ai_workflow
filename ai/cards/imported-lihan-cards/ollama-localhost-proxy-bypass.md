---
id: lihan-cards-ollama-localhost-proxy-bypass
kind: card
domain: coding
visibility: team
status: valid
title: Local Ollama calls hijacked by proxy env
summary: When a runtime-host local Ollama or localhost API call fails only under
  HTTP_PROXY/HTTPS_PROXY, bypass proxies in code instead of relying on NO_PROXY
  being set correctly.
summary_zh: 有代理时本地 Ollama 请求要代码级绕过代理
tags:
  - networking
  - remote-dev
  - wsl
context_cost: low
routes:
  - codex
  - claude-code
verify:
  command: On the runtime host, run the same localhost API request with `env -u
    NO_PROXY -u no_proxy HTTP_PROXY=$PROXY_URL HTTPS_PROXY=$PROXY_URL ...`; then
    rerun through a client/opener that explicitly disables proxies, e.g. Python
    `urllib.request.build_opener(urllib.request.ProxyHandler({}))`.
  expected: If the default client fails or reaches the proxy while the no-proxy
    client succeeds against `127.0.0.1`/`localhost`, the root cause is proxy
    inheritance for a runtime-host local service request.
  failure_next: If both clients fail, inspect whether the local service is running
    and bound to the expected interface/port. If both succeed, keep NO_PROXY but
    do not change code for this symptom.
---

> Imported from lihan3238.github.io ai/cards/ollama-localhost-proxy-bypass.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

- A process running on a remote or WSL host calls a service on the same host,
  e.g. `http://127.0.0.1:11434/api/chat` for Ollama.
- The environment includes `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, or
  `https_proxy`.
- The local API call fails only in the proxied runtime environment, commonly
  with `HTTP 503`, connection errors, or responses that look like they came
  from the proxy rather than the local service.
- `NO_PROXY=127.0.0.1,localhost` fixes the command, but the pipeline should
  not depend on every launcher remembering to set it.

## Symptoms

- Direct local service checks succeed on the runtime host:
  `curl http://127.0.0.1:<port>/...` or a service-specific CLI works.
- The application client fails when proxy env vars are present and `NO_PROXY`
  is absent or incomplete.
- Retrying with only `NO_PROXY=127.0.0.1,localhost` makes the same request
  work.
- Logs show the server is healthy; the failing request may not reach the
  local service at all.

## Diagnosis

- `localhost` means the machine running the process, not the user's laptop.
  For a pipeline running on `dell`, `127.0.0.1:11434` is `dell`'s local Ollama.
- Many HTTP clients inherit proxy env vars by default. In Python, `urllib`
  can route even `http://127.0.0.1:<port>` through the configured proxy unless
  `NO_PROXY` or a no-proxy opener is used.
- Relying only on shell-level `NO_PROXY` is brittle in long pipelines,
  subprocesses, notebooks, and remote execution wrappers.

## Fix

Prefer a code-level proxy bypass for runtime-host local service clients.

Python `urllib` pattern:

```python
import urllib.request

opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
with opener.open(request, timeout=timeout_seconds) as response:
    ...
```

Also set launcher env defensively when practical:

```bash
NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost \
  HTTP_PROXY="$PROXY_URL" HTTPS_PROXY="$PROXY_URL" \
  python -m pipeline.run_pipeline ...
```

For tests:

- Set `HTTP_PROXY` / `HTTPS_PROXY`.
- Clear `NO_PROXY` / `no_proxy`.
- Assert the local-service client constructs or uses a no-proxy transport
  such as `ProxyHandler({})`.
- Include one real runtime-host check when possible:
  harmless prompt -> `safe`, unsafe prompt -> `unsafe` from the local guard.

## Reuse Rule

- **Load when**: a localhost or `127.0.0.1` API call fails only when proxy
  environment variables are present, especially for Ollama, local model
  servers, callbacks, dashboards, or test fixtures on WSL/remote hosts.
- **Do not load when**: the service is remote by design, the runtime host
  cannot reach the local port even with all proxy env vars unset, or the
  failure is authentication/model availability rather than transport routing.
