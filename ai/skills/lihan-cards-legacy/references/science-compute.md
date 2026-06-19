# Science compute & runtime

Load after `references/research.md` for GPU/remote work, reproductions,
downloads, transfers, or LLM judge runs.

Folded from the former `science-ai-runtime` and `science-ai-system-vars`
skills.

## Runtime preflight

Before expensive work, check cwd/env, git, disk (`df -h`), cache, and
`nvidia-smi`. Rewrite upstream paths such as `~/Downloads/...` to explicit
profile server paths. Use the local GPU only within profile limits; servers own
8B+ main experiments.

For GPU or server work, read only `compute.hosts` plus the relevant
`research_lines.<id>` runtime subsection. Work only under the host work root
from the profile. Use dedicated Conda envs per project/reproduction; never
install into `base` or assume host envs are interchangeable. Always set
`CUDA_VISIBLE_DEVICES` to the exact profile-authorized GPU IDs before running.
Do not infer authorization from `nvidia-smi`; visible or idle does not mean
authorized. If occupancy is ambiguous, ask before launching.

For a reproduction, enter `reproductions/<repo>/` and read the
nearest AGENTS.md before acting.

## Downloads, proxy, transfers

Read `network` and `downloads.large_file_policy` only when the task needs
network access or large files.

- Use the profile proxy per command for Git, failing outbound calls, and small
  files. Do not set global Git proxy.
- On shared servers, never persist proxy settings in exports, dotfiles, git /
  pip / conda config, shell history, or committed files.
- LAN, localhost, Ollama, and server-to-server local traffic must bypass proxy.
- For large files, model weights, and datasets, follow
  `downloads.large_file_policy`; before large downloads, check target disk,
  work root, and cache. Verify real sizes; gated HF cache may be metadata-only.
- SSH key permission failures usually need `chmod 600` on private keys.
- If bulk staging is needed, read `downloads.bulk_staging_host`; still re-check
  disk and judge speed after about 30s.

Preferred transfer shape is profile-parameterized:

```bash
rsync -a --partial --inplace <SRC>/ <USER>@<HOST>:<WORK_ROOT>/<DST>/
```

## Judge APIs

- Use `judge_apis.default_provider` for LLM judges when a usable key/model
  exists; use expensive fallback routes only under the profile rule or explicit
  request.
- Smoke-test endpoint, model id, protocol, and response schema on a tiny batch
  before a full judge run. Do not silently switch providers mid-eval.
- Known route shapes: `/v1/messages` for Anthropic-style calls,
  `/v1/responses` for GPT-style provider ids, and `/chat/completions` may reject
  listed names.
- For quality/helpfulness scoring, prefer reward-model or deterministic metrics
  when available; generic LLM judges can underrate safe refusals.

## Research tool roles

Research tool roles are profile-owned defaults (`tool_roles`), not model
locks:

- paper translation is human-driven by default unless explicitly requested.
- macro reasoning / discussion uses the strongest cost-appropriate
  Claude-family or similar model.
- local concept Q&A uses the strongest cost-appropriate GPT-family or similar
  model.
- reproduction: GPT-family by default, using official code first and rebuilding
  only when code is missing or unusable.
- Do not delete or disable the user-level Playwright or Semantic Scholar MCP
  from project tasks.

## Reproduction remotes

Use `reproduction_remotes` as orientation only; verify the nearest repo's
remotes before push:

- `AdaSteer`: personal `origin`, official `upstream`.
- `SafeAct-Steer`: personal `origin`.
- `refusal_direction`: personal `fork`; upstream/original may be `origin`.
- `safesteer_from_scratch`: personal `origin`.
- `steering-specificity`: may point at official upstream; `do not push unless a personal fork remote is configured`.

## Artifact boundary

Do not put raw logs, datasets, checkpoints, activations, vectors, raw outputs,
judge transcripts, or large generated files into Git, Obsidian, or public blog
cards. Store heavy artifacts under profile-approved work roots or ignored dirs
such as `artifacts/`, `results/`, `outputs/`, `runs/`, `logs/`, `vectors/`,
`activations/`, and `checkpoints/`.

From the blog repo: read workflow contracts only — no job launches, state
mutation, or artifact sync without explicit request (cf. `research.md`
boundary).
