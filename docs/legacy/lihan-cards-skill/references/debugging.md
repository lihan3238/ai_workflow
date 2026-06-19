# Debugging-diagnosis workflow

Debugging notes are engineering/research notes; the reusable skill is the search
workflow over them, not a per-note skill. (The retired `incident` type is gone —
debugging-shaped cards now live under `engineering` or `research`, carrying their
`## Symptoms` / `## Diagnosis` body + verify trio.)

## Trigger

Use when an engineering or research task has symptoms, environment history, CI
failures, tooling failures, or project-cycle debugging questions that may match a
prior debugging card.

Common cases include Docker/WSL/proxy failures, local agent tooling, model-download
traps, and CI validator failures.

## Candidate sources

Search local synced blog repository sources first:

- `static/ai/registry.json` for metadata,
- `ai/cards/*.md` for selected note bodies after metadata passes.

## Candidate selection

1. Build query terms from project context, symptoms, tool, environment, and
   task phase.
2. Search metadata first: tags, id, title, summary, `produces`, status, and
   context cost.
3. Prefer `status: valid` over stale notes.
4. Filter by project/tool/environment match.
5. Open note bodies only after metadata passes.
6. Stop at the bounded result set defined by the context budget.
7. If no candidate passes, report exactly: no matching engineering note.
8. Skip unrelated debugging notes even when they share broad tags.

## Verification states

Before applying guidance, mark each selected note:

- `verified`: current evidence matches the note verification.
- `manual_check_needed`: the agent needs user-provided evidence.
- `not_applicable`: symptoms or verification do not match.
- `stale_or_blocked`: status or missing evidence blocks use.

## Report shape

Report:

- workflow: debugging-diagnosis
- query terms
- selected engineering/research notes
- reason for each selection
- verification status
- bounded context statement
- next action

## Forbidden behavior

- Do not install each debugging note as a separate skill.
- Do not load every matching note.
- Do not apply note guidance without verification.
- Do not copy raw logs, private paths, secrets, or project-specific private
  artifacts into public notes.

## Extraction rule

If repeated debugging notes reveal a stable reusable workflow, extract that workflow
into an `engineering` (or `research`) card or local reference. Leave the original
notes as engineering/research notes and evidence.
