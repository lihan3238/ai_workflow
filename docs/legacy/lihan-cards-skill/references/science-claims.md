# Science claims, gates & manuscripts

Load after `references/research.md` before claims, experiment launch,
publication decisions, frontier review, or manuscript work.

Folded from the former `research-hypothesis-sprint` and
`research-manuscript-writer` skills.

## Research modes

- Main-line theory mode: read top papers slowly, reproduce important work, and
  avoid freezing the paper claim too early.
- Vertical-branch mode: transfer a current main-line idea into a lagging but
  active domain; move faster, but keep claims benchmark- and baseline-gated.
- Benchmark-sprint mode: after hypothesis, metric, baselines, and protocol are
  fixed, run the smallest benchmark that can decide paper readiness.
- Frontier-review packet mode: use Fable / Opus / GPT-high-effort only for
  irreversible theory, novelty, benchmark, or paper-framing decisions.

## Research loop

1. State one thesis, target venue/field, closest competitors, and the smallest
   publishable contribution.
2. Convert it into falsifiable claims: hypothesis, metric, pass bar,
   stop/revise condition, baselines, and "do not claim" boundary.
3. Run cheap-first gates: literature collision check, static/smoke test,
   offline analysis, small behavioral run, then locked benchmark.
4. Before heavy GPU work, pre-register metric, seed/split, controller,
   baselines, and no-go rules in the repo.
5. Treat simple competitors as first-class baselines: rewrite/prompting,
   refusal/freeze/no-op, random/shuffled vectors, concept attenuation, official
   methods, and current SOTA for the vertical domain.
6. If a gate fails, stop or narrow the paper claim before adding experiments.
7. Promote claims only when they trace to committed configs, code version,
   seeds/splits, artifact paths, metrics, and reports.
8. Freeze a paper sprint only when the method is close to or stronger than the
   relevant benchmark/SOTA on the same metric family, with limitations explicit.

## SafeAct-style gates

SafeAct-style research must stay gate-oriented, not path-memory-oriented:

1. theme gate: state the exact hypothesis, nearest related-work collision, and
   falsification condition.
2. engineering smoke gate: prove the rollout, hook, logging, config, and
   minimal runtime path before building larger assets.
3. static steering gate: show category vectors move relevant action predictions
   more than random or shuffled controls.
4. pilot rollout gate: run a small matched-twin closed-loop pilot with Base,
   freeze/no-op, random or shuffled controls, and the candidate method.
5. main experiment gate: launch the main table only after nontrivial base risk,
   measurable freeze/no-op over-inaction, and non-random steering benefit.
6. paper-readiness gate: freeze metrics, configs, seeds, analysis scripts, and
   claim wording before paper-facing writing.

Line-specific preregistration and metric facts come from profile fields:
`research_lines.<id>.status`,
`research_lines.<id>.preregistration.docs`,
`research_lines.<id>.preregistration.tag`,
`research_lines.<id>.frozen_benchmark_concepts`,
`research_lines.<id>.metric_names`, `research_lines.<id>.do_not_claim`, and
`research_lines.<id>.next_line`. Do not move criteria after seeing results.
Preserve metric names and definitions from the profile when writing reports.
Do not claim any story listed under `research_lines.<id>.do_not_claim`.

If any gate fails, narrow the hypothesis, revise the benchmark, or stop the
line. Do not spend compute to rescue the old story without a new explicit
claim.

## Paper-facing evidence

Every paper-facing claim must resolve to a compact evidence package. Required
fields and wording to preserve:

- Config paths.
- Seed set.
- Checkpoint identifiers.
- Hook locations.
- Vector identifiers.
- Rollout log paths.
- Metric report paths.
- Code version.

Validation route:

```bash
python -m safeact.logging validate-evidence tests/fixtures/evidence/evidence_package.json
```

Use `--require-existing-paths` for a local artifact bundle intended for
paper-facing reporting. Videos are supporting evidence only: a video path
without metric names and an evidence package is anecdotal and must be rejected.
Do not write "the robot behaves safely in examples" unless it maps to
predeclared metrics.

## Frontier-review packets

Frontier-review packets (scope per Research modes above): keep packet input
code-free unless code is the object of review; sync only accepted conclusions
back to repo docs or Obsidian `06`.

Packet input: README thesis, current theory, strongest evidence table,
related-work collisions, methodology caveats, open questions, and a short read
order. Exclude source code, raw logs, server paths, full result inventories,
profile-owned strict facts, and historical review outputs by default.

Output contract: request a survive / revise / stop verdict, `strongest counterargument`,
tighter claim wording, decisive experiment(s), and what to sync back to repo
docs or Obsidian `06`. Preserve dissent when the reviewer rejects a direction.

Claude-family frontier review should frame SafeAct / SafeSteer work as
authorized, offline, defensive ML-safety research. Avoid exploit recipes,
jailbreak prompts, real-world abuse instructions, credential handling,
malware/cyber operations, and bio/chemical harm detail. If a safety refusal
appears, record the category if visible, reset or shrink the packet, and retry
as theory-only / benchmark-only (survive/revise/stop still applies);
do not keep arguing in the same context.

## Manuscript workflow

For drafts, related work, LaTeX, templates, and submission packages:

1. Identify the target official venue, journal, field, and submission stage.
2. Use a provided template when Lihan gives one; otherwise search official
   venue or publisher pages, not random mirrors.
3. Keep the original template read-only under `manuscript/templates/` when it
   must be retained.
4. Copy the template into `manuscript/draft/` or the requested working
   directory before editing.
5. Record the template source URL, access date, target venue, and assumptions
   in a nearby manuscript note or README.
6. Verify related work, novelty, venue rules, page limits, citation claims, and
   benchmark comparisons from Semantic Scholar plus official sources.
7. Keep generated PDFs, LaTeX intermediates, raw experiment logs, datasets,
   checkpoints, and large artifacts out of git and out of `manuscript/`.
