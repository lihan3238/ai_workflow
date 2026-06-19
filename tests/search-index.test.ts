import { describe, expect, it } from "vitest";
import { normalizeAsset } from "../src/lib/assets/schema";
import {
  assetSearchEntriesForSiteMode,
  contentSearchEntries,
  searchEntriesForSiteMode,
  type SearchEntry
} from "../src/lib/search-index";

function asset(id: string, visibility: "public" | "team" | "private" | "local-only") {
  return normalizeAsset(
    {
      id,
      kind: "card",
      domain: "coding",
      visibility,
      status: "valid",
      title: id,
      summary: `${id} summary.`,
      tags: ["coding"],
      context_cost: "low",
      verify: {
        command: "Inspect search index.",
        expected: "Only intended audiences can search it.",
        failure_next: "Remove it from the public search index."
      }
    },
    `ai/cards/${id}.md`
  );
}

describe("search index", () => {
  it("builds stable content search entries", () => {
    const entries = contentSearchEntries("blog", [
      {
        id: "hello-world",
        data: {
          title: "Hello World",
          description: "First post.",
          tags: ["intro"],
          date: new Date("2026-06-19T00:00:00.000Z")
        },
        body: "Longer body text."
      }
    ]);

    expect(entries).toEqual([
      {
        id: "blog:hello-world",
        title: "Hello World",
        description: "First post.",
        href: "/blog/hello-world/",
        kind: "blog",
        tags: ["intro"],
        text: "Hello World First post. intro Longer body text."
      }
    ]);
  });

  it("keeps private and local-only AI assets out of the search index", () => {
    const assets = [
      asset("public-card", "public"),
      asset("team-card", "team"),
      asset("private-card", "private"),
      asset("local-card", "local-only")
    ];

    expect(assetSearchEntriesForSiteMode("operator", assets).map((entry) => entry.id)).toEqual([
      "asset:public-card",
      "asset:team-card"
    ]);
  });

  it("combines visible content and operator assets by site mode", () => {
    const content: SearchEntry[] = [
      {
        id: "blog:welcome",
        title: "Welcome",
        description: "Blog page.",
        href: "/blog/welcome/",
        kind: "blog",
        tags: ["blog"],
        text: "Welcome Blog page. blog"
      }
    ];
    const assets = [asset("team-card", "team")];

    expect(searchEntriesForSiteMode("operator", content, assets).map((entry) => entry.id)).toEqual([
      "blog:welcome",
      "asset:team-card"
    ]);
  });
});
