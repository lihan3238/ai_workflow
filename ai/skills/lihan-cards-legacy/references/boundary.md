# Boundary rule: card vs blog post

Loaded on demand at **capture time**, before drafting. Decides whether a
verified lesson becomes a registry **card** (`ai/cards/<id>.md`) or a human
**blog post** (`content/post/<slug>/index.md`). Apply it FIRST — drafting a
card for something that should be a post pollutes the registry; routing a
genuine reusable card to a post hides it from the consult loop.

## The two-question test

Ask both. A card requires **YES to both**; any other combination → blog post.

1. **Recurring trigger?** Will this lesson plausibly apply again, across more
   than the single piece of code / one-off task just touched — in a future
   session or another project?
2. **Meaningful, checkable claim?** Does it carry a real verify in one of the
   three accepted forms (executable command / documented manual-inspection
   step / state smoke-test) that an agent can run to decide whether to apply
   the fix?

| Recurring trigger | Checkable claim | Route to |
| --- | --- | --- |
| yes | yes | **card** (`ai/cards/<id>.md`) |
| yes | no | blog post (or sharpen until it has a real verify, then card) |
| no | yes | blog post (one-off, even if checkable) |
| no | no | **blog post** (`content/post/<slug>/index.md`) |

## Route to a BLOG POST when

- The lesson is a one-off, project-specific, step-by-step **walkthrough** with
  **no recurring trigger** and **no meaningful verification** — e.g. "how I set
  up this one repo's CI" written once, never re-run as a check.
- It is narrative / explanatory / reflective content for a human reader, not a
  callable asset for an agent's context.
- It is not decidable from its registry entry alone (per the always-loaded
  asset principle) — route the detail to a post.

Blog posts are authored under `content/post/<slug>/index.md` with normal Hugo
frontmatter (`title`, `date`, `categories`/`tags`, body).

## Route to a CARD when

Route reusable workflow asset candidates here only when the lesson changes how
future agents should act across projects or sessions. Accepted cards still live
in the existing `ai/cards/<id>.md` knowledge base; reusable workflow behavior
that belongs in runtime should extend the existing `lihan-cards` local
references, not create a second entrypoint.

## Route debugging-style lessons

Treat debugging-style lessons as engineering/research notes by default. They may
become `engineering` (or `research`) cards when they have a recurring symptom
trigger and meaningful verify, but they do not become installed skills.

- Keep project-cycle failures as engineering notes queried by
  `references/debugging.md`.
- Promote only when the reusable workflow is extracted and verified.
- Otherwise route to blog post or reject the capture request.

## Overlap rule

When a new capture overlaps an existing workflow, extend or displace existing surface
rather than adding another knowledge base, entrypoint, runtime guide, or skill.

## Hybrid: pointer card + post

When a lesson has lasting reference value as a long human walkthrough **and** a
real recurring verify, publish the full walkthrough as a blog post and keep a
**lean pointer card**: `## Trigger` + short note + `## Fix` linking the post
(site-relative `/p/<slug>/`) + `## Reuse Rule`, with a meaningful
`metadata.verify_*`. The post carries the detail; the card stays cheap to
discover and still runnable.
