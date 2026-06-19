# Classification rule

Loaded on demand when assigning a category to a new (or re-checked) card. The
taxonomy is a **closed 4-set domain axis**: `research` / `engineering` /
`environment` / `principle`. `validate_assets.py` rejects any other value
(including the retired `incident` / `technique` / `fact`); adding or removing a
category requires a constitution change. Never fabricate a category.

The set is a **domain axis matching the engineering/research dual mode**, not an
epistemic-shape axis. Shape (a bug-with-fix vs a repeatable method) is no longer a
classification input — that distinction was fuzzy and is gone. Mode lock
(engineering/research/general) is operationally separate from `type`; loading policy
is separate too (Context budget in `references/modes.md`).

## The 3-step decision rule

Apply in order; the first match wins.

1. Is it a **standing, cross-cutting value / decision rule** — how you work in
   general, not tied to one domain's task? → **`principle`**.

2. Else — is it a **cross-cutting environment / infra reference fact** you look up
   (a map, port, proxy, host), *not* a "something broke + fix" lesson? →
   **`environment`**.

3. Else it is **actionable domain knowledge** (formerly an incident OR a technique —
   they merge here). Split by domain:
   - about **doing science** — papers, experiments, benchmarks, model/HF downloads,
     GPU, LLM judges, science workflow → **`research`**.
   - else (**engineering** — code, CI, git, WSL/Docker, agent tooling, install/sync,
     Spec Kit, networking debugging) → **`engineering`**.

**Edge rule**: a debugging incident that *touches* the environment (a Docker
port-publish failure, an ollama proxy bypass) classifies by its **domain**
(`engineering`), NOT `environment`. `environment` holds pure look-up reference, not
fixes. The `## Symptoms` / `## Diagnosis` body sections stay optional and carry the
debugging shape; they are not a `type`.

## Loading strategy per category

Each category earns its place by a distinct loading strategy:

| Category      | Memory analogue       | When loaded                                   |
|---------------|-----------------------|-----------------------------------------------|
| `principle`   | procedural-meta       | near-always (1–2 line essence in user AGENTS.md); full card on demand |
| `environment` | semantic              | on demand by keyword/domain; feeds environment/preflight |
| `engineering` | procedural / episodic | on demand by task/keyword; verify-before-apply; narrow single-best load when debugging |
| `research`    | procedural / episodic | same as `engineering`                         |

The old "incident → narrow diagnosis, one best card" rule now keys on **debugging
context + the card's verify trio**, not on a `type` literal.

## One example each

- **`research`** — `paper-reading-three-pass`: a repeatable method for reading a
  paper. (`hf-download-local-dir-double-download-trap` is a research-compute incident
  that also lives here.)
- **`engineering`** — `pre-push-quality-gate`: the local gate to run before pushing.
  (Most engineering cards — CI, git, WSL/Docker, networking fixes — land here.)
- **`environment`** — `wsl-coder-agent-infra-map`: the current map of MCP servers,
  Docker proxies, and WireGuard SSH hosts.
- **`principle`** — `model-decoupled-project-philosophy`: anchor durable value in
  owned data, workflows, and evaluations rather than the model itself.
