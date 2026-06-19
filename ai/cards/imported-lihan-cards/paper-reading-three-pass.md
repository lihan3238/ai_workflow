---
id: lihan-cards-paper-reading-three-pass
kind: card
domain: research
visibility: team
status: valid
title: Read papers in three passes
summary: When reading a research paper, use Keshav's three-pass method plus
  active notes, citation triage, and reproducibility checks to turn it into
  decisions instead of passive reading.
summary_zh: 读论文时用 Keshav 三遍法+主动笔记+引用筛选+可复现核查,把读变成做决策
tags:
  - paper-reading
  - research
context_cost: medium
routes:
  - codex
  - claude-code
verify:
  command: "Open one paper note and check for: 5Cs skim, contribution map,
    evidence table, unclear claims, citation actions, and read/skip/deep-dive
    decision."
  expected: The note shows why the paper matters, what is reliable, what is
    unclear, and what action follows.
  failure_next: If the note is mostly summary, reread with Pass 2/3 questions and
    add evidence, assumptions, limitations, and next actions.
---

> Imported from lihan3238.github.io ai/cards/paper-reading-three-pass.md. The body is preserved; metadata was converted to AI Workflow Home asset schema.


## Trigger

Use when reading an academic paper for research, engineering design,
literature review, paper club, implementation, reproduction, or
deciding whether a paper deserves deeper time.

## Fix

- Start with an explicit reading contract:
  - **Goal**: survey / implement / reproduce / critique / cite /
    extend / teach.
  - **Budget**: 10 minutes / 60 minutes / half day / multi-day.
  - **Output**: one decision, one note, one implementation issue,
    one experiment idea, or one literature graph update.
- Use Keshav's three-pass structure:
  - **Pass 1: triage the paper**. Read title, abstract,
    introduction, section headings, figures/tables, conclusion, and
    references. Do not line-read.
  - **Pass 2: understand the argument**. Read the paper carefully,
    but skip dense derivations/proofs unless they block the main
    claim. Mark terms, assumptions, baselines, metrics, and unclear
    steps.
  - **Pass 3: reconstruct and challenge**. Virtually reimplement the
    work: infer missing details, rebuild the experiment/theory path,
    test assumptions, and ask what would break the result.
- Pass 1 must answer Keshav's 5Cs:
  - **Category**: what kind of paper is this?
  - **Context**: what prior work and research line does it sit in?
  - **Correctness**: do the assumptions and evaluation look plausible?
  - **Contributions**: what is actually new?
  - **Clarity**: is it written clearly enough to trust after more work?
- Pass 1 decision:
  - **Skip**: irrelevant, obsolete, weak evidence, or no actionable
    link to current work.
  - **File**: useful citation/background but no immediate deep read.
  - **Pass 2**: relevant enough to understand.
  - **Pass 3**: central enough to implement, critique, reproduce, or
    build on.
- During Pass 2, write a structured note instead of a prose summary:
  - Problem: one sentence.
  - Claim: one sentence.
  - Method: input -> mechanism -> output.
  - Evidence: dataset/benchmark/sample size/baselines/ablations.
  - Assumptions: what must be true for the claim to hold.
  - Limitations: stated and unstated.
  - Unknowns: equations, terms, experimental details, missing code.
  - Hooks: citations to chase; ideas to steal; experiments to run.
- Read figures/tables as first-class evidence:
  - For every key figure/table, write what question it answers.
  - Check axes, units, baselines, error bars, sample sizes, and
    whether the figure supports the claim in the text.
  - If the key claim cannot be tied to a figure/table/proof/result,
    mark it as unsupported until verified.
- Use citation triage:
  - Backward: scan references for origin papers, datasets, methods,
    and competing baselines.
  - Forward: search citing papers for replications, critiques,
    follow-up benchmarks, and adoption.
  - Stop citation chasing when it no longer changes the current
    decision.
- Use AI help as scaffolding, not authority:
  - Good uses: glossary, section map, pseudocode extraction,
    experiment checklist, related-work clustering, contradiction
    prompts, implementation issue list.
  - Bad uses: trusting generated summaries without page/section
    checks, accepting invented citations, skipping your own Pass 1
    decision, or outsourcing novelty judgment.
  - Require every AI-generated claim to point back to paper text,
    figure/table, equation, citation, or external reproduction.
- For implementation/reproduction papers, add a reproducibility block:
  - Code/data availability and license.
  - Environment, hyperparameters, seeds, hardware, cost.
  - Metrics and exact evaluation protocol.
  - Minimum viable reproduction: the smallest experiment that can
    confirm or falsify the core claim.
- End every read with a decision:
  - **Use**: cite, implement, reproduce, extend, teach, or compare.
  - **Defer**: what trigger would make it worth reopening?
  - **Reject**: why it does not support current work.

## Paper Note Template

```markdown
# <paper title>

Goal:
Budget:
Decision: skip / file / pass-2 / pass-3 / use / reject

## Pass 1: 5Cs
- Category:
- Context:
- Correctness:
- Contributions:
- Clarity:

## Pass 2: argument and evidence
- Problem:
- Claim:
- Method:
- Evidence:
- Assumptions:
- Limitations:
- Unknowns:

## Pass 3: reconstruction
- Reimplementation sketch:
- Missing details:
- Break tests:
- Minimum reproduction:

## Citation actions
- Backward:
- Forward:
- Compare against:

## Next action
- Cite / implement / reproduce / discuss / ignore:
```

## Sources

- S. Keshav, "How to Read a Paper":
  https://systems.cs.columbia.edu/ds2-class/papers/keshav-paper.pdf
- Michael Mitzenmacher, "How to Read a Research Paper":
  https://www.eecs.harvard.edu/~michaelm/postscripts/ReadPaper.pdf
- Norman Ramsey, "How to Read a Paper":
  https://www.cs.tufts.edu/~nr/pubs/reading.pdf
- Carey et al., "Ten simple rules for reading a scientific paper":
  https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008032
- Jason Eisner, "How to Read a Technical Paper":
  https://www.cs.jhu.edu/~jason/advice/how-to-read-a-paper.html

## Reuse Rule

- **Load when**: reading, ranking, summarizing, implementing, or
  reviewing academic papers; building a literature review; preparing
  a paper discussion; or asking an AI agent to assist with paper
  reading.
- **Do not load when**: reading general documentation, API references,
  blog posts, or news articles where scholarly claim/evidence/citation
  structure is not the main object.
