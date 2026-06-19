# Capture workflow

Loaded on demand when capturing a new card from session context. Folds the
former `agent-card-protocol` capture path onto the v3 (Agent Skills) card
schema.

Two segments, one human touchpoint total. Draft segment (no `go`): write the
draft straight to `~/.config/lihan-cards/drafts/<id>.md` — Trivially
reversible (delete = undo). Publish segment (one `go`, all gates): `go` means
**allowed to publish**, not "allowed to start". The friction gradient is
deliberate: drafting MUST stay as cheap as a tool-local memory write or
lessons leak into per-tool memory and stop being cross-tool; acceptance
signal: equal-quality lessons land in the draft queue at least as often as in
tool-local memory.

## Draft segment (no `go`)

1. **Apply the boundary rule first.** Use the 2-question boundary test in
   `boundary.md`: a card requires a recurring trigger AND a meaningful,
   checkable verify. If the lesson routes to a blog post, STOP and recommend a
   post; create no card and no post in this workflow.

2. **Refuse personal-layer edits.** If the requested change would edit, delete,
   or rename an existing `content/post/**` entry, refuse and surface the
   personal-layer conflict. This workflow may not bypass the life-archive floor.

3. **Classify.** Apply the 3-step rule in `classification.md` to pick
   exactly one category: `research` / `engineering` / `environment` / `principle`.

4. **Write the draft to the local queue** — no confirmation, no waiting:
   ```bash
   mkdir -p ~/.config/lihan-cards/drafts
   CARD_DATE="$(date -u +%F)"
   # write ~/.config/lihan-cards/drafts/<id>.md
   ```
   The draft uses the full v3 card shape (same schema as step "Draft the
   card" below) so publication is a move-plus-gate, not a rewrite. Append one
   final line annotating the source:
   `<!-- draft-source: <tool> <UTC date> <one-line session context> -->`.
   Drafts are **local-only**: never synced, never committed, not covered by
   `install.sh`; the redaction sweep runs at publish time, so treat draft
   contents as private until then.

5. **Report one line and move on**: "drafted `<id>` to the local queue". Do
   not ask whether to publish; publication is a separate, Lihan-initiated
   step.

## Publish segment (one `go`, all gates)

Entry points: Lihan asks to publish a named draft, asks to review the queue
("批审 drafts" — list drafts, report accepted/rejected counts so the
rejection rate stays observable; delete rejected drafts), or asks for a
direct capture-and-publish in one session. A single explicit `go` may
authorize a named batch; each card still publishes through its own
`card/<id>` PR and the full gate.

### Preconditions

- The blog repo is cloned locally. Default on this WSL:
  `/mnt/c/lihan_work/github_repos/lihan3238.github.io`. If absent, ask the
  user to clone it first. Do NOT author the card through the GitHub API.
- Repository card auto-merge setup exists: repository `allow_auto_merge=true`,
  `main` requires the `validate` check with strict status checks, and human
  reviews are not required. If any part is missing, report the missing setup and
  STOP. Do NOT direct-push to `main`.
- `gh` is authenticated as the owner; proxy/network is available for push and
  PR operations.

### Steps

1. **Confirm the boundary and classification still hold.** For a queued
   draft, the draft segment already ran them; re-check only if the draft is
   stale or the lesson changed. Also name mode applicability and loading
   policy (per the Context budget in `modes.md`) in the publish plan, and
   identify the single canonical home for the asset.

2. **Restate and wait for `go`.** State the requirement understanding, the
   classification, and the intent to auto-build and publish through a
   `card/<id>` PR that auto-merges only after the required CI check is green.
   Wait for one explicit `go` — the publish authorization. The user may
   correct the plan before `go`; after `go`, issue no further approval
   prompts in the happy path.

3. **Branch from `origin/main` after `go`:**
   ```bash
   cd <blog-repo>
   git fetch origin
   git checkout -b card/<id> origin/main
   ```

4. **Set the UTC-safe date** (never the local calendar date — see the
   `utc-safe-ai-card-dates` card):
   ```bash
   CARD_DATE="$(date -u +%F)"
   ```

5. **Draft the card** at `ai/cards/<id>.md` in the current schema
   (`specs/006-card-type-taxonomy/contracts/card-schema.md`). When publishing
   a queued draft, copy it from `~/.config/lihan-cards/drafts/<id>.md`, strip
   the `draft-source` line, keep its `created`, and refresh `last_verified`
   to `$CARD_DATE`. Frontmatter is the
   Agent Skills shape — top-level `name` + `description`, everything else under
   a string-valued `metadata:` map:
   - top-level: `name: <id>`, `description:` (one sentence, <=1024, what + when
     — this becomes the registry summary).
   - `metadata.id` == `name` == filename stem (kebab-case);
     `metadata.type` (the category from step 3);
     `metadata.title`;
     `metadata.summary_zh` (REQUIRED: a natural, concise Chinese one-line
     summary for human readers, <= ~40 Chinese chars — readable, NOT a literal
     translation of `description`; powers the `/ai/` human card grid);
     `metadata.tags` (CSV of kebab tags from the canonical set in
     `specs/003-ai-cards-refactor/contracts/canonical-tags.md`);
     `metadata.created: "$CARD_DATE"`, `metadata.last_verified: "$CARD_DATE"`;
     `metadata.status: "valid"`, `metadata.context_cost`, `metadata.produces`;
     and the verify trio `metadata.verify_command` / `verify_expected` /
     `verify_failure_next` — each non-empty, in one of the three accepted forms
     (executable command preferred, else manual-inspection step, else
     state smoke-test; `principle`/`environment` typically use manual/smoke).
   - Capture notes must include mode applicability and loading policy in the
     draft rationale or body when the card changes runtime behavior. Keep the
     single canonical home as `ai/cards/<id>.md` for the card and
     `skills/lihan-cards/references/*.md` only for reusable local runtime
     workflow instructions.
   - body MUST contain `## Trigger`, `## Fix`, `## Reuse Rule` (plus any
     type-appropriate optional sections). Write for machines: bullets / tables /
     key-value, no ceremonial prose.
   - **Deltas only.** A capture is a localized addition (or a small edit to one
     existing card), never a whole-library rewrite. If it supersedes a card,
     set `metadata.supersedes`/`superseded_by`.

6. **Batch eligible effectiveness deltas into this card PR only** (rule
   below); no standalone stats-only PR.

7. **Run the local pre-push gate.** All checks must pass before any push:
   ```bash
   pip install -r requirements.txt
   python scripts/ai/redact.py --self-test
   python scripts/ai/validate_assets.py
   python scripts/ai/build_registry.py
   python scripts/ai/stats_miner.py --check   # required when static/ai/stats.json changes
   python -m unittest discover -s tests
   mapfile -t paths < <(git diff --name-only HEAD)
   python scripts/ai/guard_changed_paths.py --card-only-strict "${paths[@]}"
   ```
   `build_registry.py` (no `--check`) regenerates `static/ai/registry.json`,
   which must be committed alongside the card. There is no mirror to copy —
   `ai/cards/<id>.md` is the single source of truth (Hugo serves the raw body at
   `public_url`).

   **No push on any failure.** Failures → `failure-modes.md`.

8. **Commit, push, and open the PR** (mechanical). Prefix outbound git/gh
    with the proxy env vars per user-AGENTS.md §Environment:
    ```bash
    git add ai/cards/<id>.md static/ai/registry.json static/ai/stats.json
    git diff --cached --name-only
    git commit -m "card: add <id>"
    https_proxy=http://10.77.0.11:10808 http_proxy=http://10.77.0.11:10808 \
      git push -u origin card/<id>
    gh pr create --fill
    ```

9. **Wait for required CI, then merge post-green.** Do not arm auto-merge before
    the required check is green.
    ```bash
    gh pr checks <pr> --watch

    # Only after the required check is green:
    gh pr merge <pr> --squash --auto
    ```
    Required check red, card-guard red, or missing auto-merge setup →
    `failure-modes.md`; never merge red, never direct-push.

10. **Report and clean the queue.** State what was published, the PR URL, that
    the card merged after green CI, and the live `public_url`. If the card came
    from the draft queue, delete `~/.config/lihan-cards/drafts/<id>.md` after
    the merge.

## Effectiveness-delta rule (abstain by default)

During an owner-initiated capture, a high-confidence `helped` / `no_effect`
delta MAY ride the same card PR. Consult-only sessions defer deltas to the next
capture; no standalone stats-only PR exists in this round.

- **Apply only on HIGH-CONFIDENCE judgment.** The objective anchor is the card's
  `verify` passing and/or the task succeeding. If the consulted card's fix was
  applied and verify passed (or the task clearly succeeded), `helped += 1` MAY
  be applied. If the card was consulted, applied, and the verify/task clearly
  failed because the card's guidance did not hold, `no_effect += 1` MAY be
  applied.
- **Abstain when ambiguous.** If the outcome is unclear, the card was only
  partially relevant, or the result cannot be tied to the card via an objective
  anchor, change nothing. Abstain is the default; never inflate `helped` from a
  vibe.
- **`consulted` is NEVER hand-written.** It is owned by
  `scripts/ai/stats_miner.py`, which re-derives it from existing transcripts
  (distinct sessions, session-deduped). Do not edit `consulted` by hand and do
  not let a delta touch it.
- **Counters live in `static/ai/stats.json`, never in card frontmatter.** Cards
  stay diff-stable. A delta is batched into the same owner-initiated card PR and
  passes the same local gate and CI-gated auto-merge lane.

## Forbidden

- No `go` gate before drafting — the draft segment never blocks on approval.
- No auto-publication of drafts — entering the publish segment is always
  Lihan-initiated; the queue is not a pipeline.
- No syncing or committing the drafts directory.
- No post-draft human approval gate inside the publish segment.
- No human merge approval gate for a card PR after `go`.
- No direct push to `main`.
- No standalone stats-only auto-PR for consult-only sessions.
- `gh pr merge` is permitted only for `card/*` PRs and only after the required
  CI check is green.
