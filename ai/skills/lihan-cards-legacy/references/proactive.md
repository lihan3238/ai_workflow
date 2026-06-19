# Proactive capture rule

Loaded on demand at a task-completion checkpoint. Folds the former
`agent-card-protocol` "Proactive Suggestion Trigger List". Run the **draft
segment** proactively only when **all four** conditions hold simultaneously.
Each is necessary; miss one and stay silent.

1. **Verified completion** — the work unit reached a verifiable end state: a test
   passes, a bug reproduced-and-fixed, a refactor merged locally, a design
   decision named and acted on. Routine edits (rename, import-add, typo) do NOT
   qualify.

2. **Non-trivial lesson** — the insight is not directly available in the public
   docs of the language / framework / tool involved. Anything an LLM with
   default training already knows does NOT qualify.

3. **Generalizable** — the lesson applies beyond the single piece of code just
   touched: patterns, gotchas, workflow shifts, decision rules. A one-off fix to
   one project's bug does NOT qualify (route it to a blog post — see the
   boundary rule in `boundary.md`).

4. **Not already drafted this session** — no proactive draft has been written
   for the same insight in this conversation. If Lihan discarded an earlier
   proactive draft, do NOT re-draft the same insight.

When all four hold, do not ask — load `capture.md` and run its **draft
segment** directly: boundary test, classification, then write the draft card
to `~/.config/lihan-cards/drafts/`, and report one line:
`drafted <id> to the local queue (proactive)`. No `go` is involved at draft
time; publication stays a separate Lihan-initiated step (`go` = allowed to
publish), so a proactive draft never triggers a PR by itself. If Lihan says
discard, delete the draft file (deleting is the undo) and do not re-draft the
same insight this session.

## Anti-sprawl

- Do not create new skills from a proactive suggestion.
- Do not create new entrypoints.
- Do not create new runtime guides.
- Keep `lihan-cards` as the single consult/capture/classify entrypoint; route
  new reusable behavior into existing references or reject it.
