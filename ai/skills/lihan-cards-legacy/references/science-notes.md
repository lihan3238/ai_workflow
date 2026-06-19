# Science notes & literature

Load after `references/research.md` for Obsidian paper notes, reading/idea
logs, paper discovery, or literature search.

Folded from the former `research-note-maintainer` skill plus the literature
half of `science-ai-runtime`.

## Note targets

Note roots are profile-owned (`notes.agent_security_root`, `notes.real_vault`);
the stable relative names are `sci/agent_security/05` (paper memory) and
`sci/agent_security/06` (active-idea ledger) — ownership split in the Reading
log contract below.

## Note maintenance

- Read the nearest relevant `AGENTS.md` note rules first.
- Paper-note briefing mode: individual Obsidian paper notes under the profile
  note root; compact pre-deep-reading briefing plus graph node.
- Single-paper entry mode: compact `05` digest for one paper/reproduction.
- Direction-synthesis mode: cross-paper idea merges, drops, pivots, paper-thesis
  conclusions, and reading-map updates.
- Active-experiment ledger mode: concise `06` ledger for started ideas.
- If multiple conflict copies exist, compare them and do not overwrite either
  silently. When paper or reproduction status changes, check linked `05` / `06`
  entries for stale state words such as pending, reading, or to-run.

## Paper note contract

Individual paper notes are compact pre-deep-reading briefings plus graph
nodes. `读前速览` is five bullets max. Paper notes use this shape:

1. `读前速览`
2. `论文定位`
3. `方法概要`
4. `代码与资源`
5. `关键限制`
6. `对本项目的用法`
7. `Core References`
8. `Full Bibliography`
9. `Local PDF` and `Source`

`Core References` is the semantic graph layer and may use wikilinks only for
relationship-bearing references. `Full Bibliography` is title-only plain text;
do not use wikilinks there. The code field must use exactly one of:

```markdown
- **Code**: 开源 ✅ <URL>
- **Code**: ⚠️ 未发现官方开源代码
```

## Reading log contract

`05` is compact paper memory and idea log, while repo README/docs own
commands, full run logs, tables, and artifact inventories. Ownership split:
05 owns compact paper-local sections, while the
root science_ai workspace owns cross-paper synthesis, direction choices,
idea merges/drops, and reading-map changes.
Obsidian `06` records only status, evidence summary, next checkpoint, and
stop/continue decision.

No free-riding: do not add claims not grounded in the user's points, a paper
note, the source paper, an official source, or reproduction output. Present a
concise draft or proposed diff for explicit approval before editing Obsidian
reading-log / idea-log files.

Experiment-material panel, when present:

```markdown
#### 实验材料（datasets / baselines / 代码）

- **Models**: ...
- **Datasets**: ...
- **Baselines**: ...
- **Evaluation**: ...
- **Code**: 开源 ✅ <URL> / ⚠️ 未开源（说明：联系作者邮箱 / 自行实现 / 可借鉴的近邻 repo）
```

Code is mandatory when the panel exists. Accepted code field text includes
`Code: 开源` and `Code: ⚠️ 未发现官方开源代码`. Keep the panel terse and put
full method depth in the individual paper note or reproduction repo.

## Paper discovery & literature search

- Define direction, keywords, target venue, and quality bar first; update the
  paper map or pending list only after filtering low-quality, weakly related,
  or unnecessary papers.
- Use the user-level Semantic Scholar MCP when available, then cross-check
  official sources: arXiv, OpenReview, ACL Anthology, DBLP, OpenAlex, Crossref,
  publisher pages, Papers With Code, and official project/GitHub pages.
- Load `SEMANTIC_SCHOLAR_API_KEY` from `judge_apis.secrets_env`, or from the
  override named by `judge_apis.semantic_scholar_override_env`; never commit or
  print it.
- Do not install broad third-party literature MCP bundles by default. Do not
  enable Sci-Hub or Google Scholar scraping routes unless Lihan explicitly
  approves for a specific task.
- Store downloaded papers and translated PDFs under `papers.default_store`,
  not in Obsidian. Paper translation is human-driven by default unless
  explicitly requested.
