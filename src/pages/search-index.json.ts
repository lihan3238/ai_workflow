import registry from "../../ai/registry/assets.json";
import { getCollection, type CollectionEntry } from "astro:content";
import type { AiAsset } from "../lib/assets/schema";
import { contentSearchEntries, searchEntriesForSiteMode } from "../lib/search-index";
import { parseSiteMode } from "../lib/site-mode";

export const prerender = true;

export async function GET() {
  const siteMode = parseSiteMode(import.meta.env.PUBLIC_SITE_MODE);
  const posts = (await getCollection("posts")).filter(
    (post: CollectionEntry<"posts">) => post.data.visibility === "public"
  );
  const assets = registry.assets as AiAsset[];
  const contentEntries = [
    ...contentSearchEntries("blog", posts.map((post: CollectionEntry<"posts">) => ({
      id: post.id,
      data: post.data,
      body: post.body
    })))
  ];

  return new Response(
    JSON.stringify({
      mode: siteMode,
      generated_at: new Date().toISOString(),
      entries: searchEntriesForSiteMode(siteMode, contentEntries, assets)
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    }
  );
}
