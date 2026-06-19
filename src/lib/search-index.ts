import type { AiAsset } from "./assets/schema";
import { assetsVisibleInSiteMode, type SiteMode } from "./site-mode";

export type SearchKind = "blog" | "asset";

export interface SearchEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: SearchKind;
  tags: string[];
  text: string;
}

export interface SearchableContent {
  id: string;
  data: {
    title: string;
    description: string;
    tags?: string[];
    date?: Date;
  };
  body?: string;
}

function collapseText(parts: Array<string | string[] | undefined>): string {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .map((part) => part.trim())
    .join(" ")
    .replace(/\s+/g, " ");
}

export function contentSearchEntries(kind: "blog", items: SearchableContent[]): SearchEntry[] {
  return items.map((item) => {
    const tags = item.data.tags ?? [];
    return {
      id: `${kind}:${item.id}`,
      title: item.data.title,
      description: item.data.description,
      href: `/${kind}/${item.id}/`,
      kind,
      tags,
      text: collapseText([item.data.title, item.data.description, tags, item.body])
    };
  });
}

export function assetSearchEntriesForSiteMode(mode: SiteMode, assets: AiAsset[]): SearchEntry[] {
  return assetsVisibleInSiteMode(mode, assets).map((asset) => ({
    id: `asset:${asset.id}`,
    title: asset.title,
    description: asset.summary_zh ?? asset.summary,
    href: "/ai/",
    kind: "asset",
    tags: [asset.kind, asset.domain, asset.visibility, ...asset.tags],
    text: collapseText([
      asset.title,
      asset.summary_zh,
      asset.summary,
      asset.kind,
      asset.domain,
      asset.visibility,
      asset.tags
    ])
  }));
}

export function searchEntriesForSiteMode(
  mode: SiteMode,
  contentEntries: SearchEntry[],
  assets: AiAsset[]
): SearchEntry[] {
  return [...contentEntries, ...assetSearchEntriesForSiteMode(mode, assets)];
}
