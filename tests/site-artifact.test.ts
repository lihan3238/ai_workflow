import { describe, expect, it } from "vitest";
import {
  auditArtifactFiles,
  forbiddenPatternsForMode,
  requiredPathsForMode
} from "../src/lib/site-artifact";

const baseFiles = {
  "index.html": "Home",
  "blog/index.html": "Blog",
  "search/index.html": "Search",
  "ai/index.html": "AI assets",
  "runtime/index.html": "Runtime",
  "search-index.json": "{\"entries\":[]}"
};

const operatorBaseFiles = {
  ...baseFiles
};

describe("site artifact audit", () => {
  it("requires artifacts to focus on blog/search/ai/runtime routes", () => {
    expect(requiredPathsForMode("operator")).toEqual([
      "index.html",
      "blog/index.html",
      "search/index.html",
      "search-index.json",
      "ai/index.html",
      "runtime/index.html"
    ]);
  });

  it("flags removed family/photos routes in artifacts", () => {
    const findings = auditArtifactFiles("operator", {
      ...baseFiles,
      "family/index.html": "Family",
      "photos/index.html": "Photos"
    });

    expect(findings).toEqual(expect.arrayContaining([
      "forbidden removed route in family/index.html",
      "forbidden removed route in photos/index.html"
    ]));
  });

  it("allows operator route files but still flags private asset paths", () => {
    const findings = auditArtifactFiles("operator", {
      ...operatorBaseFiles,
      "ai/index.html": "AI Assets ai/prompts/codex-default.md",
      "runtime/index.html": operatorBaseFiles["runtime/index.html"]
    });

    expect(findings).toEqual(["forbidden private/local asset path in ai/index.html"]);
  });
});
