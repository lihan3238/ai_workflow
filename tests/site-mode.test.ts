import { describe, expect, it } from "vitest";
import { normalizeAsset } from "../src/lib/assets/schema";
import {
  NAV_ITEMS,
  assetsVisibleInSiteMode,
  navItemsForSiteMode,
  parseSiteMode,
  shouldShowHiddenAssetCount
} from "../src/lib/site-mode";

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
        command: "Inspect visibility.",
        expected: "Only intended audiences can see it.",
        failure_next: "Move it behind the operator site mode."
      }
    },
    `ai/cards/${id}.md`
  );
}

describe("site mode", () => {
  it("defaults to the operator site mode", () => {
    expect(parseSiteMode(undefined)).toBe("operator");
  });

  it("rejects unknown site modes instead of silently widening access", () => {
    expect(() => parseSiteMode("public")).toThrow(/PUBLIC_SITE_MODE/);
    expect(() => parseSiteMode("family")).toThrow(/PUBLIC_SITE_MODE/);
  });

  it("keeps navigation focused on blog, runtime, search, and AI assets", () => {
    expect(navItemsForSiteMode("operator", NAV_ITEMS).map((item) => item.key)).toEqual([
      "home",
      "blog",
      "search",
      "ai",
      "runtime"
    ]);
  });

  it("shows public and team assets in the operator build", () => {
    const assets = [
      asset("public-card", "public"),
      asset("team-card", "team"),
      asset("private-card", "private"),
      asset("local-card", "local-only")
    ];

    expect(assetsVisibleInSiteMode("operator", assets).map((item) => item.id)).toEqual([
      "public-card",
      "team-card"
    ]);
  });

  it("shows private asset counts in the operator build", () => {
    expect(shouldShowHiddenAssetCount("operator")).toBe(true);
  });
});
