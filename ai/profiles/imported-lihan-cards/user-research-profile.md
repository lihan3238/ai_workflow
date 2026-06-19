---
id: lihan-cards-user-research-profile
kind: profile
domain: research
visibility: private
status: valid
title: Legacy lihan-cards research runtime profile snapshot
summary: Private migration snapshot of the old non-secret research runtime profile used by lihan-cards research routing.
summary_zh: 旧 lihan-cards 研究运行配置私有快照
tags:
  - lihan-cards
  - research
  - migration
context_cost: high
routes:
  - codex
  - claude-code
verify:
  command: Manual inspection confirms this imported profile is a migration snapshot only and contains no API keys, passwords, bearer tokens, cookies, private keys, or raw credentials.
  expected: The profile is private, source-preserving, and used only for migration/reference.
  failure_next: Remove or redact the offending value, rotate any leaked credential, then rebuild the registry.
---

> Imported from `lihan3238.github.io/agents/user-research-profile.yaml` as a private migration snapshot. The active runtime source remains this repository plus host-local config.

## Source Snapshot

~~~~text
schema_version: "1.0.0"
last_verified: "2026-06-11"
owner: "Lihan"
profile_kind: "user_level_research_runtime"
sync_policy: "non_secret_user_config"

loading:
  rule: "Load only the section needed by the current task."
  stale_rule: "If a field is missing, stale, or contradicted by live state, ask Lihan before using the resource."
  redaction_rule: "Do not copy private paths, accounts, IPs, keys, raw logs, or raw experiment state into public cards."

secrets:
  policy: "Secret values are local-only and not synchronized."
  secrets_env: "~/.config/lihan-cards/secrets.env"
  allowed_here: "Paths, LAN IPs, ports, env var names, model/provider roles, and non-secret runtime defaults."
  forbidden_here: "API keys, passwords, bearer tokens, cookies, private keys, raw judge transcripts, and credentials."

workspaces:
  science_ai_root: "/mnt/c/lihan_work/ai_workplace/science_ai"
  root_git_remote: "git@github.com:lihan3238/lihan_steer.git"
  safeact_steer_repo: "/mnt/c/lihan_work/ai_workplace/science_ai/reproductions/SafeAct-Steer"
  main_experiment_workspace: "/mnt/c/lihan_work/ai_workplace/science_ai/experiments/lihan_steer"
  reproduction_repos_root: "/mnt/c/lihan_work/ai_workplace/science_ai/reproductions"

notes:
  obsidian_vault: "/mnt/c/lihan_work/lihan_notes/lihan3238"
  real_vault: "/mnt/c/Users/lihan/iCloudDrive/obsidian/lihan3238"
  agent_security_root: "/mnt/c/lihan_work/lihan_notes/lihan3238/sci/agent_security"
  paper_ideas_log: "sci/agent_security/05｜研究想法与论文方向｜Research Ideas & Paper Direction.md"
  active_ideas_log: "sci/agent_security/06｜进行中 Idea 与实验验证｜Active Ideas & Experiment Validation.md"
  policy: "Obsidian owns durable notes and compact result overviews; repo docs own commands, tables, logs, and artifact inventories."

papers:
  default_store: "/mnt/c/lihan_work/ai_workplace/science_ai/papers/agent_security_2026"
  pdf_policy: "Store downloaded papers and translated PDFs here, not in Obsidian."
  translation_default: "Human-driven; agents only run or record translation when explicitly asked."

experiments:
  ignored_artifact_dirs:
    - "artifacts/"
    - "results/"
    - "outputs/"
    - "runs/"
    - "logs/"
    - "vectors/"
    - "activations/"
    - "checkpoints/"
  raw_artifact_policy: "Keep raw logs, datasets, checkpoints, activations, vectors, outputs, judge transcripts, and large files out of Git and Obsidian."

manuscript:
  templates_dir: "manuscript/templates/"
  draft_dir: "manuscript/draft/"
  generated_artifact_policy: "Keep generated PDFs, LaTeX intermediates, raw logs, datasets, checkpoints, and large artifacts out of git and out of manuscript/."

compute:
  local:
    name: "local_wsl_host"
    role: "smoke_or_small_models_only"
    gpu_note: "RTX 5070 Ti 16GB; not for 8B+ main experiments."
  hosts:
    hello:
      ssh: "hello@10.77.0.101"
      work_root: "/home/hello/.workplace/"
      role: "Single RTX 5090; use when free."
    dell:
      ssh: "dell@10.77.0.102"
      work_root: "/home/dell/.workplace/"
      role: "Bulk staging and main GPU work when policy allows."
      gpu_policy:
        always_set_cuda_visible_devices: true
        authorized_when_idle: ["6", "7"]
        authorized_if_not_memory_full: ["0", "5"]
        authorized_with_8gb_remaining_after_run: ["2", "3", "4"]
        blocked_without_explicit_confirmation: ["1"]
  conda_policy: "Use dedicated envs per project/reproduction; never install into base or assume host envs are interchangeable."

network:
  wsl_proxy: "http://10.77.0.11:10808"
  proxy_use: "Use per-command for Git, failing outbound calls, and files below about 300 MB."
  proxy_bypass: ["LAN", "localhost", "Ollama", "127.0.0.1", "server-to-server local traffic"]
  no_global_proxy: true

downloads:
  large_file_policy:
    threshold: "about 300 MB, model weights, or datasets"
    order:
      - "Try direct download on the target host into ~/.workplace/ or cache."
      - "If that quickly fails, download locally without the WSL proxy using a mirror/direct route, then rsync."
      - "If the file already exists locally, rsync instead of downloading again."
      - "Do not download big files through the WSL proxy and then rsync unless Lihan explicitly approves."
  bulk_staging_host: "dell"
  rsync_template: "rsync -a --partial --inplace <SRC>/ <USER>@<HOST>:<WORK_ROOT>/<DST>/"
  preflight: "Check target disk, ~/.workplace/, HF cache, and real file sizes; gated HF cache may be metadata-only."

judge_apis:
  default_provider: "AnyRouter when a usable key/model exists"
  expensive_fallback: "api.lihan3238.com only when Lihan explicitly asks or for controlled fallback/comparison."
  credential_policy: "Keep keys in env, stdin, or gitignored env files; never command args, committed files, logs, Obsidian, or scripts."
  secrets_env: "~/.config/lihan-cards/secrets.env"
  semantic_scholar_env_var: "SEMANTIC_SCHOLAR_API_KEY"
  semantic_scholar_override_env: "SCIENCE_AI_SEMANTIC_SCHOLAR_ENV"
  known_routes:
    anthropic_style: "/v1/messages"
    gpt_style: "/v1/responses"
    chat_completions: "/chat/completions"
  smoke_test: "Check endpoint, protocol, model id, and response schema on a tiny batch before a full judge run; do not silently switch providers mid-eval."

tool_roles:
  macro_reasoning: "Claude-family or strongest cost-appropriate model"
  local_concept_qa: "GPT-family or strongest cost-appropriate model"
  reproduction: "GPT-family by default; use official code first and rebuild only when code is missing or unusable."
  mcp_policy: "Do not delete or disable user-level Playwright or Semantic Scholar MCP from project tasks."

reproduction_remotes:
  AdaSteer: "origin personal fork; upstream official."
  SafeAct-Steer: "origin personal fork."
  refusal_direction: "fork personal; upstream/original may be origin."
  safesteer_from_scratch: "origin personal."
  steering-specificity: "may point at official upstream; do not push unless a personal fork remote is configured."

research_lines:
  safeact_steer:
    repo_field: "workspaces.safeact_steer_repo"
    status: "Paper 1 = Path A, narrow ICLR analysis framing with sim-only / single-backbone limits explicit."
    preregistration:
      docs:
        - "docs/benchmark_preregistration.md"
        - "docs/paper_experiment_framework.md"
      tag: "prereg-v1"
      rule: "Do not move criteria after seeing results."
    frozen_benchmark_concepts:
      F1: "mid-commit rewrite vs steering"
      F2: "specificity controls"
      F3: "dose-response completion and criterion confirmation"
      F4: "drawer third-category base-risk and sub-skill boundary"
      publication_benchmark: "one clean Table 1 pass only after mandatory gates"
    metric_names:
      - "ASR"
      - "SAC"
      - "Clean-SR"
      - "over-inaction"
      - "density"
      - "dose"
      - "safe_twin_sr"
      - "commit_rate"
      - "attempt_rate"
      - "hazard_completion_rate"
      - "neutral_sr_retention"
      - "resg"
    do_not_claim:
      - "zero-shot category transfer or vector composition"
      - "latent safe-region / half-space semantics"
      - "first activation steering of VLAs"
      - "vector encodes hazard semantics"
      - "uncentered geometry numbers"
      - "sparsity or intervention minimality from current density range"
    remote_runtime:
      host: "dell"
      remote_copy: "/home/dell/.workplace/safeact-steer/"
      openvla_oft: "/home/dell/.workplace/openvla-oft/"
      venv: "/home/dell/.workplace/venvs/openvla-smoke/"
      hf_home: "/home/dell/.workplace/hf_home"
      hf_hub: "/home/dell/.workplace/hf_home/hub"
      libero_config: "/home/dell/.workplace/libero_config"
    next_line: "Paper 2 queued for non-instruction-borne regime, starting with a pre-registered test-time adversarial visual perturbation pilot under clean instructions."

~~~~
