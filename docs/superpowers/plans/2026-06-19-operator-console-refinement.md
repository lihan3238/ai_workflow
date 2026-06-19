# Operator Console Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace narrow custom search/diff/runtime browser plumbing with focused shared code and polish the operator console UI without changing the AI Workflow Home product boundary.

**Architecture:** Keep Astro as a static operator window. Add `Fuse.js` for browser-side ranking over the existing `/search-index.json`; add `diff` for line-level runtime asset diffs; add small shared TypeScript modules for search ranking and runtime browser helpers. `.astro` pages stay responsible for markup and data loading, while reusable client behavior moves into imported scripts.

**Tech Stack:** Astro 6, TypeScript, Vitest, Fuse.js, diff, Node 22.12+, npm.

---

## File Structure

- Modify: `package.json` and `package-lock.json` to add `fuse.js` and `diff`.
- Modify: `src/lib/runtime/inventory.ts` to delegate `unifiedDiffForAsset()` line calculation to `diff.diffLines()`.
- Create: `src/lib/runtime/browser.ts` for pure browser-safe helpers:
  - `slugDeviceId(label: string): string`
  - `buildRuntimeDevicePayload(input): RuntimeDeviceFormResult`
  - `fallbackDeviceAddCommand(payload): string`
  - `shellDoubleQuote(value: string): string`
- Create: `src/lib/runtime/client.ts` for DOM behavior shared by runtime pages:
  - `askRuntimeConfirmation()`
  - `deleteRuntimeDevice()`
  - `wireRuntimeDeviceDeleteButtons()`
- Create: `src/lib/search/query.ts` for Fuse-backed ranking:
  - `SEARCH_FUSE_OPTIONS`
  - `rankSearchEntries(query, entries, limit)`
- Modify: `src/pages/search.astro` to import search ranking and render results with DOM APIs.
- Modify: `src/pages/runtime.astro` and `src/pages/runtime/[id].astro` to import shared runtime browser helpers and remove duplicated inline functions.
- Modify: `src/styles/global.css` to polish operator console primitives and responsive behavior.
- Modify: `README.md` to document the new search/diff dependencies and runtime browser helper boundary.
- Add/modify tests:
  - `tests/search-index.test.ts`
  - `tests/runtime-inventory.test.ts`
  - `tests/runtime-browser.test.ts`

## Task 1: Add Dependencies And Red Tests

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/search-index.test.ts`
- Modify: `tests/runtime-inventory.test.ts`
- Create: `tests/runtime-browser.test.ts`

- [ ] **Step 1: Install focused dependencies**

Run:

```bash
https_proxy=http://10.77.0.11:10808 http_proxy=http://10.77.0.11:10808 npm install fuse.js diff
```

Expected: `package.json` and `package-lock.json` include `fuse.js` and `diff`.

- [ ] **Step 2: Add a failing Fuse ranking test**

Append this test case to `tests/search-index.test.ts`:

```ts
import { rankSearchEntries } from "../src/lib/search/query";

it("ranks search entries with title and tag relevance", () => {
  const entries: SearchEntry[] = [
    {
      id: "blog:runtime-note",
      title: "Runtime notes",
      description: "Mentions Codex once.",
      href: "/blog/runtime-note/",
      kind: "blog",
      tags: ["runtime"],
      text: "Runtime notes mention Codex."
    },
    {
      id: "asset:codex-default",
      title: "Codex default prompt",
      description: "Default prompt pack.",
      href: "/ai/",
      kind: "asset",
      tags: ["codex", "prompt"],
      text: "Codex prompt pack for agent defaults."
    }
  ];

  expect(rankSearchEntries("codex prompt", entries).map((entry) => entry.id)).toEqual([
    "asset:codex-default",
    "blog:runtime-note"
  ]);
});
```

Run:

```bash
npm run test -- tests/search-index.test.ts
```

Expected: FAIL because `../src/lib/search/query` does not exist.

- [ ] **Step 3: Add a failing runtime browser helper test**

Create `tests/runtime-browser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildRuntimeDevicePayload,
  fallbackDeviceAddCommand,
  shellDoubleQuote,
  slugDeviceId
} from "../src/lib/runtime/browser";

describe("runtime browser helpers", () => {
  it("derives a safe device payload from operator form values", () => {
    const result = buildRuntimeDevicePayload({
      sshTarget: "rocky@10.81.2.18:22",
      label: "Father Linux workstation",
      remoteRoot: ""
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        id: "father-linux-workstation",
        label: "Father Linux workstation",
        ssh: "rocky@10.81.2.18:22",
        remote_root: "/home/rocky/work/ai_workflow"
      }
    });
  });

  it("reports invalid SSH targets before API calls", () => {
    expect(buildRuntimeDevicePayload({
      sshTarget: "10.81.2.18",
      label: "Bad",
      remoteRoot: ""
    })).toEqual({
      ok: false,
      message: "SSH target 格式必须是 user@ip:port。"
    });
  });

  it("builds static-site fallback commands safely", () => {
    const payload = {
      id: "father-linux",
      label: "Father Linux workstation",
      ssh: "rocky@10.81.2.18:22",
      remote_root: "/home/rocky/work/ai_workflow"
    };

    expect(slugDeviceId("Father Linux workstation")).toBe("father-linux-workstation");
    expect(shellDoubleQuote('A "quoted" label')).toBe('"A \\"quoted\\" label"');
    expect(fallbackDeviceAddCommand(payload)).toContain(
      "npm run runtime:device:add -- --id father-linux --label"
    );
    expect(fallbackDeviceAddCommand(payload)).toContain("--remote-root");
  });
});
```

Run:

```bash
npm run test -- tests/runtime-browser.test.ts
```

Expected: FAIL because `../src/lib/runtime/browser` does not exist.

- [ ] **Step 4: Add a diff contract assertion before changing implementation**

Add to `tests/runtime-inventory.test.ts` inside `renders changed asset content as a unified diff`:

```ts
expect(diff.split("\n").slice(0, 3)).toEqual([
  "--- father-linux:ai/cards/model.md",
  "+++ github:ai/cards/model.md",
  "@@"
]);
```

Run:

```bash
npm run test -- tests/runtime-inventory.test.ts
```

Expected: PASS before implementation, proving the output contract is captured.

## Task 2: Implement Diff Package Replacement

**Files:**

- Modify: `src/lib/runtime/inventory.ts`
- Modify: `tests/runtime-inventory.test.ts`

- [ ] **Step 1: Replace handwritten LCS with `diff.diffLines()`**

Change `src/lib/runtime/inventory.ts`:

```ts
import { diffLines } from "diff";
```

Then make `lineDiff()` delegate to `diffLines(beforeText, afterText)` and remove
the dynamic-programming LCS table. Preserve `unifiedDiffForAsset()` output:

```ts
function lineDiff(
  beforeLines: string[],
  afterLines: string[]
): Array<{ prefix: " " | "-" | "+"; line: string }> {
  const beforeText = `${beforeLines.join("\n")}${beforeLines.length > 0 ? "\n" : ""}`;
  const afterText = `${afterLines.join("\n")}${afterLines.length > 0 ? "\n" : ""}`;
  const diff: Array<{ prefix: " " | "-" | "+"; line: string }> = [];

  for (const part of diffLines(beforeText, afterText, { newlineIsToken: false })) {
    const prefix = part.added ? "+" : part.removed ? "-" : " ";
    for (const line of linesForDiff(part.value)) {
      diff.push({ prefix, line });
    }
  }

  return diff;
}
```

- [ ] **Step 2: Run focused runtime tests**

Run:

```bash
npm run test -- tests/runtime-inventory.test.ts
```

Expected: PASS.

## Task 3: Implement Shared Runtime Browser Helpers

**Files:**

- Create: `src/lib/runtime/browser.ts`
- Create: `src/lib/runtime/client.ts`
- Modify: `src/pages/runtime.astro`
- Modify: `src/pages/runtime/[id].astro`

- [ ] **Step 1: Add pure helper implementation**

Create `src/lib/runtime/browser.ts` with:

```ts
import { defaultRemoteRootForSshTarget, parseSshTarget } from "./inventory";

export interface RuntimeDeviceFormValues {
  sshTarget: string;
  label: string;
  remoteRoot: string;
}

export interface RuntimeDevicePayload {
  id: string;
  label: string;
  ssh: string;
  remote_root?: string;
}

export type RuntimeDeviceFormResult =
  | { ok: true; payload: RuntimeDevicePayload }
  | { ok: false; message: string };

export function slugDeviceId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "device";
}

export function shellDoubleQuote(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

export function buildRuntimeDevicePayload(values: RuntimeDeviceFormValues): RuntimeDeviceFormResult {
  let ssh;
  try {
    ssh = parseSshTarget(values.sshTarget.trim());
  } catch {
    return { ok: false, message: "SSH target 格式必须是 user@ip:port。" };
  }

  const label = values.label.trim() || "New device";
  const remoteRoot = values.remoteRoot.trim() || defaultRemoteRootForSshTarget(ssh);

  return {
    ok: true,
    payload: {
      id: slugDeviceId(label),
      label,
      ssh: `${ssh.target}:${ssh.port}`,
      remote_root: remoteRoot
    }
  };
}

export function fallbackDeviceAddCommand(payload: RuntimeDevicePayload): string {
  const remoteRootArgs = payload.remote_root
    ? ` --remote-root ${shellDoubleQuote(payload.remote_root)}`
    : "";
  return `npm run runtime:device:add -- --id ${payload.id} --label ${shellDoubleQuote(payload.label)} --ssh ${payload.ssh}${remoteRootArgs}`;
}
```

- [ ] **Step 2: Add shared DOM client implementation**

Create `src/lib/runtime/client.ts` with exported functions that accept DOM
selectors/elements and reuse `buildRuntimeDevicePayload()` plus
`fallbackDeviceAddCommand()`. The functions must not import Node-only modules.

- [ ] **Step 3: Replace inline Runtime page helpers**

In `src/pages/runtime.astro`, replace duplicated `askConfirmation()`,
`slug()`, `parseTarget()`, `defaultRemoteRoot()`, `quote()`, and delete-button
loops with imports from `../lib/runtime/client`.

- [ ] **Step 4: Replace inline device detail delete helper**

In `src/pages/runtime/[id].astro`, import `wireRuntimeDeviceDeleteButtons()` from
`../../lib/runtime/client` and use it for the single delete button.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- tests/runtime-browser.test.ts tests/runtime-inventory.test.ts
```

Expected: PASS.

## Task 4: Implement Fuse Search And Safe Rendering

**Files:**

- Create: `src/lib/search/query.ts`
- Modify: `src/pages/search.astro`
- Modify: `tests/search-index.test.ts`

- [ ] **Step 1: Add Fuse-backed ranking module**

Create `src/lib/search/query.ts`:

```ts
import Fuse, { type IFuseOptions } from "fuse.js";
import type { SearchEntry } from "../search-index";

export const SEARCH_FUSE_OPTIONS: IFuseOptions<SearchEntry> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.34,
  keys: [
    { name: "title", weight: 0.45 },
    { name: "tags", weight: 0.25 },
    { name: "description", weight: 0.2 },
    { name: "text", weight: 0.1 }
  ]
};

export function rankSearchEntries(query: string, entries: SearchEntry[], limit = 24): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  return new Fuse(entries, SEARCH_FUSE_OPTIONS)
    .search(q)
    .slice(0, limit)
    .map((result) => result.item);
}
```

- [ ] **Step 2: Replace handwritten browser scoring**

In `src/pages/search.astro`, remove `normalize()` and `scoreEntry()`, import
`rankSearchEntries`, and render results through `document.createElement()` and
`textContent`.

- [ ] **Step 3: Run focused search tests**

Run:

```bash
npm run test -- tests/search-index.test.ts
```

Expected: PASS.

## Task 5: Operator Console UI Polish

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/pages/runtime.astro`
- Modify: `src/pages/runtime/[id].astro`
- Modify: `src/pages/ai/index.astro`
- Modify: `src/pages/search.astro`

- [ ] **Step 1: Add reusable status and command primitives**

Extend `src/styles/global.css` with:

```css
.surface-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.panel.compact { padding: 18px; }
.command { display: block; max-width: 100%; overflow-wrap: anywhere; white-space: normal; }
.button { min-height: 42px; border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 14px; background: var(--surface); color: var(--ink); font: inherit; font-weight: 750; cursor: pointer; }
.button.primary { border-color: rgba(37, 99, 235, 0.35); background: var(--blue); color: #fff; }
.button.danger { border-color: rgba(180, 35, 24, 0.35); color: var(--red); }
```

Adjust existing styles rather than duplicating conflicting definitions.

- [ ] **Step 2: Improve Runtime onboarding and registered-device panels**

Use compact panels, clearer helper copy, and command fallback status. Keep form
labels visible and current input IDs unchanged.

- [ ] **Step 3: Improve Runtime device cards**

Make tool badges, drift counts, and the "打开详情" affordance more visually
distinct while preserving link semantics.

- [ ] **Step 4: Improve AI Assets and Search cards**

Use consistent compact cards, safe wrapping, and clearer result metadata.

- [ ] **Step 5: Run build to catch Astro/CSS regressions**

Run:

```bash
npm run build
```

Expected: PASS.

## Task 6: Documentation, Full Verification, Commit, And Push

**Files:**

- Modify: `README.md`
- Possibly modify: `docs/superpowers/plans/2026-06-19-operator-console-refinement.md` if execution notes are needed.

- [ ] **Step 1: Update documentation**

Add a short note to `README.md` explaining:

- Search is static `/search-index.json` ranked client-side with Fuse.js.
- Runtime diffs use the `diff` package with private/local asset redaction.
- Browser runtime helpers are convenience UX; CLI/API validation remains
  authoritative.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run typecheck
npm run test
npm run validate
npm run check:registry
npm run build
npm run check:artifacts
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Browser verification**

Start the built operator site and use Playwright to inspect:

```bash
npm run operator:serve
```

Check desktop and mobile `/runtime/`, `/ai/`, and `/search/` for non-empty
rendering, no obvious overlap, and usable controls.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git status --short
git add package.json package-lock.json src tests README.md docs/superpowers/plans/2026-06-19-operator-console-refinement.md
git commit -m "refactor: refine operator console"
```

Expected: commit succeeds.

- [ ] **Step 5: Push to remote**

Run:

```bash
https_proxy=http://10.77.0.11:10808 http_proxy=http://10.77.0.11:10808 git push origin main
```

Expected: `main` syncs to `origin/main`.
