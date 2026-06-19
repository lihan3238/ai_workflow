# Failure modes

Loaded on demand when a consult or capture step fails. Folds the former
`agent-card-protocol` "Failure Modes" section. The rule throughout: **fail
loud, never silently degrade to "no card" or invented advice.**

- **Registry unreachable** (network down, proxy misconfigured, GitHub Pages
  outage, empty body from `curl -fsSL`): report `registry unreachable: <error>`
  and STOP. Do NOT fall back to web search or invented advice, and do NOT report
  "no matching card" (that means *filtered out*, not *fetch failed*). The user
  decides whether to retry, wait, or proceed without cards. From inside the repo,
  the local copy is a valid fallback: `python scripts/ai/blog_ai.py search
  "<query>" --local`.

- **Card body fetch fails** but the registry entry exists: report the fetch
  error and STOP; offer `python scripts/ai/blog_ai.py get <id> --local` from
  inside the repo. Never substitute another card.

- **Blog repo not cloned locally** (publish segment): ask the user to
  `git clone https://github.com/lihan3238/lihan3238.github.io.git`, then re-run
  the publish flow. Do not author via the GitHub API. The **draft segment** does
  not need the repo: `~/.config/lihan-cards/drafts/` works standalone — never
  block a draft write on repo availability.

- **Drafts directory missing or unwritable** (draft segment): `mkdir -p
  ~/.config/lihan-cards/drafts` and retry once; if still failing, report the
  filesystem error and fall back to printing the full draft card in the
  session so the lesson is not lost. Do NOT silently route the lesson to
  tool-local memory instead.

- **Stale draft at publish time** (the lesson changed since drafting, or the
  draft conflicts with a published card): re-run the boundary test and
  classification before `go`; if the draft no longer qualifies, delete it and
  report why instead of publishing.

- **Validator rejects the draft card**: read the error, iterate the draft,
  re-run `python scripts/ai/validate_assets.py`. Cap at 5 iterations; if still
  failing, STOP and report which schema rule blocks
  (`specs/006-card-type-taxonomy/contracts/card-schema.md`).

- **Redaction sweep catches a secret** in the draft: scrub the offending text
  and retry. If the token-shape is genuinely part of the lesson and not a real
  secret, ask the user before continuing.

- **Local pre-push gate fails during capture**: fix recoverable failures and
  rerun the full local gate. If the failure is irrecoverable, STOP and report
  the exact command and blocker. No push occurs while redaction, validation,
  registry parity, stats shape, unit tests, or `--card-only-strict` fail.

- **Branch protection or repository auto-merge setup is absent**: report the
  missing one-time setup (spec in `capture.md` Preconditions) and STOP. Do not
  direct-push to `main` and do not create a manual bypass.

- **Card PR CI is red**: leave the PR open, do not merge, and iterate on the
  `card/*` branch. `main` stays untouched until the required check is green.

- **Card-guard fails**: the branch escaped the card allowlist
  (`ai/cards/**`, `static/ai/registry.json`, `static/ai/stats.json`). Leave the
  PR open for human handling; do not force auto-merge and do not rebrand the PR
  as a card publication.

- **`gh pr merge --auto` returns 422**: it was armed before the required checks
  were green. Wait for `gh pr checks <pr> --watch` to report green, then run the
  merge command post-green. If it still fails, report the exact GitHub error.
