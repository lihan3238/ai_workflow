# Research mode

Research mode links to Lihan's existing hypothesis-gated, evidence-backed
science workflow discipline while protecting active experiment state. It is a
boundary and routing layer, not a mirror of private research repositories. Do
not create or require separate research entry skills for SafeAct-style work.

## Routing

Load only the science reference(s) the task needs:

- `references/science-notes.md` — Obsidian paper notes, reading/idea logs,
  paper discovery, literature search, Semantic Scholar.
- `references/science-compute.md` — runtime preflight, GPU servers, Conda,
  downloads, proxy, transfers, judge APIs, reproduction remotes, artifact
  boundary.
- `references/science-claims.md` — research loop, hypothesis gates,
  paper-facing evidence, frontier review, manuscript workflow. Load before
  claims, experiment launch, publication decisions, or manuscript decisions.

## Workflow discipline

- State falsifiable claims before optimizing details.
- Prefer cheap-first experiments and small evidence-gathering steps.
- Use predeclared metrics, baselines, and stopping rules when possible.
- Separate evidence from interpretation.
- Produce concrete outputs: hypothesis, evidence table, paper decision,
  experiment plan, or next-step handoff.

## Research profile contract

Private, changeable facts live in the user-level research profile; the science
references name profile fields and workflow rules only.

Profile lookup order:

1. `LIHAN_RESEARCH_PROFILE` if set.
2. `~/.config/lihan-cards/research_profile.yaml`.
3. The nearest `research_profile.yaml` found by walking upward from the current
   working directory; treat it as a project override, not the canonical default.
4. If no profile is found, ask Lihan for the profile path before using private
   paths, servers, remotes, judge API defaults, or active research-line state.

Use section-scoped lookup. Load only the profile sections needed for the
current task: `workspaces`, `notes`, `papers`, `experiments`, `manuscript`,
`compute.hosts`, `network`, `downloads.large_file_policy`,
`downloads.bulk_staging_host`, `judge_apis.default_provider`,
`judge_apis.secrets_env`, `judge_apis.semantic_scholar_env_var`, `tool_roles`,
`reproduction_remotes`, or `research_lines.<id>`. Do not read the whole profile
by default.

Profile-owned strict facts include `workspaces.science_ai_root`,
`workspaces.safeact_steer_repo`, `workspaces.root_git_remote`,
`notes.agent_security_root`, `notes.real_vault`, `papers.default_store`,
`compute.hosts`, GPU authorization, proxy values, remote work roots, API env
paths, and current line state under `research_lines`. If a
variable is missing, stale, or contradicted by live state, ask Lihan before
using the resource. Do not infer permission from visible GPUs, open ports,
writable paths, cached credentials, or remembered chat context.

Synced profile values may include paths, LAN IPs, local ports, env var names,
provider roles, and non-secret runtime defaults. Secret values belong only in
local env files such as `~/.config/lihan-cards/secrets.env`; never synchronize,
commit, print, or quote API keys, passwords, tokens, cookies, private keys, or
raw judge transcripts.

## SafeAct-Steer boundary

`workspaces.safeact_steer_repo` in the research profile points to an active
external workspace.

From this blog repository, research mode must not:

- write into that workspace,
- start or stop experiments,
- modify checkpoints, activations, vectors, datasets, raw logs, or raw outputs,
- copy private runtime paths or raw experiment state into public cards.

Do not mutate that workspace unless explicitly requested by the user.

Allowed outputs from a dry run:

- hypotheses,
- evidence tables,
- paper decisions and experiment decisions,
- next experiment plans,
- handoff notes that require explicit user approval before touching the
  research workspace.
