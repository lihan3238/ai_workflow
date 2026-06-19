# Mode routing

Loaded on consult before opening heavy context. Resolve exactly one primary
mode from the repository mode lock, load the smallest reference bundle the
task needs (see Context budget below), and report what was loaded.

## Mode lock

Check mode lock before inferring. Do not re-infer mode on every conversation.
Per-repo mode is sticky until Lihan makes a Manual mode-change request.

Resolution order:

1. Explicit user request in the current turn, such as "switch this repo to
   research mode" or "reset mode".
2. Nearest project runtime guide (`AGENTS.md` / `CLAUDE.md`) containing a line
   like `lihan-cards mode: research`.
3. User-level lock map at `~/.config/lihan-cards/repo-modes.yaml`.
4. First-run inference from cwd, repo name, nearest `AGENTS.md`, and task
   surface. Persist the inferred lock immediately: append the repo to
   `~/.config/lihan-cards/repo-modes.yaml` with `inferred: true` plus a
   one-line reason, and say "wrote inferred lock" in the consult report.

High-confidence inference signals adopt without asking: an `AGENTS.md`
`lihan-cards mode:` line already wins at resolution order 2; a `.specify/`
directory is a strong engineering prior. Reserve confirmation for genuinely
ambiguous cases (see Ambiguity rule); never block on confirming an inference
that a signal already decides.

If a lock and the current user request conflict, keep the lock as default but
honor the explicit request for this turn. Update the lock only when Lihan asks.

## Engineering mode

Choose `engineering` for code changes, CI, tests, environment setup, WSL,
Docker, Codex, Claude Code, MCP, agent tooling, install/sync, Spec Kit,
bridge workflow, bridge guard, task generation, implementation, review, or
repository automation.

Engineering mode formalizes the existing Spec Kit plus bridge plugin workflow
as the canonical engineering process; it coordinates local experience loading
around that workflow and does not replace it:

1. Consult locally through this file, then proceed with the task.
2. Spec Kit owns specification, clarification, planning, and task generation.
   If the target repository's constitution defines a feature tier system
   (e.g. patch-tier), size the Spec Kit artifact set by that tier; without a
   tier definition, default to the full ceremony. Tier rules live in each
   repository's constitution — do not restate them here.
3. The speckit-superpowers bridge owns implementation handoff. Respect bridge
   guard decisions; do not run `speckit.implement` when the handoff says
   Superpowers owns implementation.
4. Run project validation before completion; capture only reusable lessons
   that pass the capture boundary.

Guardrails: concrete engineering output is primary — framework ceremony is
only valuable when it improves output. Do not introduce a parallel bespoke planning
or implementation framework. Do not bypass bridge guardrails.

Expected outputs: patches, tests, validation evidence, task updates, or
handoffs.

## Research mode

Choose `research` for papers, hypotheses, experiments, benchmarks, evidence
tables, research notes, manuscript decisions, SafeAct-Steer-style work,
science_ai workspace work, Obsidian research notes, paper/PDF download routing,
GPU server planning, manuscript template work, paper-facing evidence checks, or
science workflow questions.

Primary workflow: `references/research.md`, which routes on to the three
science references — `science-notes.md`, `science-compute.md`,
`science-claims.md`. Load only the one(s) the task needs.

## General mode

Choose `general` only when neither engineering nor research discipline is the
dominant immediate workflow. Future writing/reflection remains an extension point;
do not create a new entrypoint just because a future mode is requested.

Primary workflow: this file plus `references/capture.md` when relevant.

## Mixed tasks

Mixed tasks are not a separate mode; `mixed` means pick the
dominant immediate workflow and name secondary constraints:

- Building tooling for a research repo: usually `engineering`, with research
  constraints such as no experiment-state mutation and evidence-first output.
- Planning a new experiment that needs a small script: usually `research`, with
  engineering constraints such as tests, minimal scope, and repository hygiene.

## Ambiguity rule

Report `clarification_required` and ask at most one concise confirmation only
when mode choice materially changes which workflow or boundary applies. If one
mode is a safe default, proceed and state the secondary constraints instead of
asking.

## Context budget

Sizing judgment stays with the agent; the durable rules are:

- **Standing principles**: the 1–2 line essence in user-level `AGENTS.md` is
  already loaded. Open a full principle card only when that rule actually
  bites the current decision; check `last_verified` before relying on it.
- **Environment / preflight**: load multiple concise assets when they prevent
  unsafe work (WSL, proxy, install/sync, CI facts). Verify only the
  relevant subsystem; do not open long bodies unless the preflight fails.
- **Task work**: load the smallest reference bundle for the current task
  phase. Verification is required when an asset changes behavior or gates work.
- **Debugging diagnosis**: when chasing a failure, load one best-matching
  already-verified card narrowly and run its verify trio
  (`references/debugging.md`); do not bulk-load matching cards. Debugging shape is
  carried by a card's `## Symptoms` / `## Diagnosis` body + verify trio, not by a
  `type` literal (the retired `incident` type is gone — such cards now live under
  `engineering`/`research`).
- **Governance gates** (capture, publication, safety, mode boundaries): be
  exhaustive over the gate, not over all cards — every gate checked or
  explicitly marked blocked.

## Stable by design

Empirically load-bearing invariants (validated 2026-06 over a fully
agent-driven Spec Kit + bridge release cycle). Do not "fix" these in a future
iteration; changing one requires fresh evidence that it failed:

- **Consult stays zero-blocking** — no human confirmation anywhere on the
  consult path. The only sanctioned questions are the Ambiguity rule's single
  mode confirmation and capture's publish `go`.
- **Principle cards carry executable evaluation** — the
  `verify_command`-as-decision-procedure pattern (e.g. the five-line
  model-decoupled assessment) is a feature, not overhead; prefer it in new
  principle cards.
- **Context budget rules above** — measured consult cost stays in the
  single-digit-k token range because of them; do not relax them to "load more
  just in case".
- **Capture boundary 2-question test** — the friction problem was the
  process around it, never the test itself; keep the test unchanged.

## Consult report

After routing, report concisely: mode, which references or assets were loaded
and why, verification state when verification was required, and the next
action. This is a behavior contract, not a requirement to emit JSON.

## Blog display boundary

Blog cards and the public registry are display, sync, storage, and bootstrap
surfaces. Runtime workflow instructions live in local references first. Use
public URLs only for human browsing, new-machine bootstrap, or fallback when local sync is missing.

## No sprawl rule

Do not create mode-specific entry skills. `lihan-cards` is the only entrypoint;
mode references are local runtime details.
