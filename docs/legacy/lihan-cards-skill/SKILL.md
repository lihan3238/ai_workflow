# Legacy lihan-cards skill source snapshot

> Migration snapshot from `skills/lihan-cards/SKILL.md`. The active runtime skill is `ai/skills/workflow-home/SKILL.md`; this file is reference material only and is intentionally outside `ai/skills`.

# lihan-cards

Single entry-point skill for Lihan's local AI workflow runtime. The operational
source of truth is this local skill plus `references/*.md`; blog cards are
display / sync / storage / bootstrap surfaces and engineering-note data, not
the routine runtime context source.

Pick the path:

- **Consult** captured experience → `## Workflow: Consult` below, then
  `references/modes.md`.
- **Capture** a verified lesson → `## Workflow: Capture` below, then load
  `references/capture.md` for the full mechanical steps.
- **Decide card vs blog post** before drafting → `references/boundary.md`:
  card iff recurring trigger AND meaningful, checkable verify; else blog
  post; both + long human walkthrough → post + lean pointer card.
- **Classify** → `references/classification.md`: exactly one of
  `research`/`engineering`/`environment`/`principle` (closed set, validator-enforced).
- **Proactive capture** at a checkpoint → load `references/proactive.md`.
- A step fails (registry down, repo missing, validator rejects) →
  `references/failure-modes.md`.

## Workflow: Consult

Run in order; stop and report at the first failure.

1. **Resolve mode lock locally.** Load `references/modes.md`; mode lock wins
   over inference, inferred locks persist immediately ("wrote inferred lock"),
   at most one mode question and only when it materially changes behavior.
2. **Load the mode reference.**
   - engineering → stay in `references/modes.md` (Spec Kit + bridge workflow).
   - research → `references/research.md`, which routes on to
     `references/science-notes.md` (notes, papers, literature),
     `references/science-compute.md` (GPU, downloads, judges), and
     `references/science-claims.md` (gates, paper-facing evidence,
     manuscripts). Load only what the task needs.
   - general → stay in `references/modes.md` plus capture refs if relevant.
3. **Respect the context budget.** Apply the budget rules in
   `references/modes.md`: principle essence is already loaded; preflight may
   bundle concise assets; debugging diagnosis stays narrow; governance gates are
   exhaustive over the gate only.
4. **Use prior notes only when needed.** For debugging diagnosis, load
   `references/debugging.md` and query the local synced blog repository:
   ```bash
   python scripts/ai/blog_ai.py search "<query>" --local
   python scripts/ai/blog_ai.py get <id> --local
   ```
   Also glob the local draft queue (`ls ~/.config/lihan-cards/drafts/` plus a
   grep when non-empty — negligible cost) so unpublished lessons are reusable
   immediately; mark any hit as **draft (unpublished, unverified)** in the
   report.
5. **Verify before applying.** Use the selected asset's
   `metadata.verify_command` / `verify_expected` / `verify_failure_next`, or
   the manual verification state defined by `references/debugging.md`.
6. **Report concisely.** Include mode, selected assets
   (local references or asset ids), reasons, verification state, and next action.

Public URLs are display/sync/bootstrap surfaces only (see modes.md). Never
silently switch a local consult to remote fetching; report the sync issue
first.

## Workflow: Capture

Two segments, one human touchpoint total — full mechanics in
`references/capture.md`; load it before acting.

- **Draft segment (no `go`)**: boundary test → classify → write the v3-shaped
  draft to `~/.config/lihan-cards/drafts/<id>.md`; report one line, move on.
- **Publish segment (one `go`, all gates)**: Lihan-initiated only; `go` means
  **allowed to publish**. Gate chain, PR, and post-green auto-merge per
  `references/capture.md`; failures → `references/failure-modes.md`.

## Reuse Rule

- **Load when**: starting any task where a Lihan-captured lesson might apply
  (debugging, a code task, an AI-blog task), OR on an explicit consult/capture
  request, OR at a checkpoint where `references/proactive.md` fires.
- **Do not load when**: the work is unrelated to Lihan's captured context
  (e.g. a throwaway prototype with no shared lessons).
