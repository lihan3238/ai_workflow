# Operator Console Refinement Design

## Goal

Refine the existing AI Workflow Home operator console by replacing narrowly
scoped custom plumbing with mature community packages, removing duplicated
browser/runtime code, and improving the visual hierarchy of the Runtime, AI
Assets, and Search surfaces without changing the product boundary.

## Context

AI Workflow Home is an Astro static/operator window over durable AI runtime
assets. The current MVP already has a clear architecture: Git remains the
source of truth, CLI commands own runtime writes and sync, and the browser
surface is a focused operator console behind LAN/VPN or private access.

The current implementation works, but three areas add maintenance friction:

- Search uses a handwritten browser-side scoring function and string-template
  rendering.
- Runtime asset diffs use a handwritten line-diff implementation.
- Runtime pages duplicate browser confirmation and device deletion behavior,
  while the Runtime page also reimplements SSH target parsing and default
  remote-root logic already defined on the TypeScript runtime side.

The UI also has the right information, but several surfaces read as a stack of
generic cards rather than a daily-use operator tool. The refinement should make
status, commands, drift, and destructive actions easier to scan.

## Non-Goals

- Do not add a login system, database, remote execution workflow, CMS, vector
  search, transcript ingestion, or browser-triggered asset writes.
- Do not rewrite the runtime CLI or change the baseline-to-device sync model.
- Do not add a heavy UI component framework.
- Do not revive removed `/family/`, `/photos`, `dist-family`, or separate
  non-operator artifacts.
- Do not modify personal blog post content unless a doc reference is stale.

## Approach

Use a targeted refinement, not a redesign.

1. **Community packages for narrow utilities**
   - Use `Fuse.js` for browser-side fuzzy search over the existing static
     `/search-index.json` payload.
   - Use the `diff` package for line-level asset diffs while preserving the
     existing private/local prompt/profile redaction boundary.

2. **Shared runtime browser behavior**
   - Extract confirmation dialog behavior and runtime device deletion calls
     into a shared browser module.
   - Move browser-safe device form helpers into a shared module so SSH target
     parsing, default remote-root derivation, safe device ID generation, and
     shell quoting are not copied inside `.astro` scripts.
   - Keep server-side validation as authoritative; browser helpers improve UX
     but do not replace API/CLI validation.

3. **Operator console UI polish**
   - Keep the left navigation and dense dashboard layout.
   - Strengthen reusable CSS primitives for metrics, panels, status badges,
     buttons, commands, forms, and destructive states.
   - Improve Runtime device cards so online state, identity, inventory status,
     toolchain state, and drift counts can be scanned quickly.
   - Improve Add Host and CLI fallback presentation.
   - Keep AI Assets cards compact and readable, with consistent labels and safe
     wrapping for long paths/tags.
   - Improve Search results with DOM-safe rendering and clearer match metadata.
   - Verify desktop and mobile layouts for non-overlap and text wrapping.

## Architecture

The refinement keeps the existing Astro static build architecture:

- `src/lib/search-index.ts` continues to generate static search entries.
- `/search-index.json` remains the only search data payload.
- Search ranking moves from handwritten scoring to `Fuse.js` in the browser.
- `src/lib/runtime/inventory.ts` keeps core runtime inventory types and server
  validation helpers.
- `unifiedDiffForAsset()` delegates line-diff calculation to the `diff`
  package and preserves its current output shape for existing callers/tests.
- New browser modules under `src/lib/runtime/` own interactive runtime page
  helpers that are shared by `/runtime/` and `/runtime/[id]/`.
- `.astro` pages keep markup and data loading, but lose duplicated imperative
  browser code where practical.

## Data Flow

Search:

1. Astro builds `/search-index.json` from visible blog posts and visible AI
   assets for the current site mode.
2. The Search page fetches that JSON.
3. `Fuse.js` ranks entries by title, description, tags, and text.
4. Results are rendered via DOM APIs instead of unsanitized `innerHTML`
   templates.

Runtime diff:

1. Runtime inventory compares device snapshots to the repo baseline.
2. Private prompt/profile paths remain redacted before static HTML display.
3. Public/team changed assets are formatted through `diff.diffLines()`.
4. Existing CLI and page callers continue using `diffTextForComparison()`.

Runtime device management:

1. The Runtime page gathers Add Host form values.
2. Shared browser helpers parse the SSH target and derive a safe default remote
   root and device ID.
3. The operator API or CLI fallback remains the write path.
4. Shared delete-device behavior handles confirmation, API deletion, reload or
   redirect, and static-site fallback messaging.

## Error Handling

- Search index fetch failure should keep the existing visible failure message.
- Invalid SSH target input should show an inline status message before any API
  call.
- Delete-device API failure should explain the static-site fallback and the
  manual config edit path.
- Runtime diffs must never reveal private/local prompt or profile paths or
  content in static pages.
- Long commands, paths, labels, and host strings must wrap without layout
  overlap.

## Testing

The implementation should add focused tests before production changes:

- Search tests for Fuse options and result ordering, covering title/tag/body
  relevance without exposing hidden assets.
- Runtime inventory tests proving `unifiedDiffForAsset()` keeps the current
  header/output contract after switching to `diff`.
- Runtime browser helper tests for SSH target parsing, default remote root,
  safe ID generation, shell quoting, and fallback command generation.
- Existing project checks must still pass:
  - `npm run typecheck`
  - `npm run test`
  - `npm run validate`
  - `npm run check:registry`
  - `npm run build`
  - `npm run check:artifacts`
- Browser verification should inspect desktop and mobile Runtime, AI Assets,
  and Search pages for non-empty rendering, no obvious overlap, and usable form
  controls.

## Acceptance Criteria

- Search uses `Fuse.js`; the custom browser `scoreEntry()` function is removed.
- Runtime line diff calculation uses the `diff` package; the handwritten LCS
  implementation is removed.
- Runtime page and device detail page share confirmation/deletion browser
  behavior instead of duplicating it inline.
- Browser-side Runtime form helpers are shared and covered by tests.
- Runtime, AI Assets, and Search pages have clearer operator-console visual
  hierarchy while preserving the current information architecture.
- Documentation records the new search/diff dependencies and the refinement
  scope.
- Full verification passes before syncing to the remote repository.
