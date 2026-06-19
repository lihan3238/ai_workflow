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

export function rankSearchEntries(
  query: string,
  entries: SearchEntry[],
  limit = 24
): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  const fuse = new Fuse(entries, SEARCH_FUSE_OPTIONS);
  const phrases = [...new Set([q, ...q.split(/\s+/).filter(Boolean)])];
  const ranked = new Map<
    string,
    { entry: SearchEntry; bestScore: number; matchCount: number }
  >();

  for (const phrase of phrases) {
    for (const result of fuse.search(phrase)) {
      const current = ranked.get(result.item.id);
      const score = result.score ?? 1;
      if (!current) {
        ranked.set(result.item.id, {
          entry: result.item,
          bestScore: score,
          matchCount: 1
        });
      } else {
        current.bestScore = Math.min(current.bestScore, score);
        current.matchCount += 1;
      }
    }
  }

  return [...ranked.values()]
    .sort((left, right) =>
      right.matchCount - left.matchCount ||
      left.bestScore - right.bestScore ||
      left.entry.title.localeCompare(right.entry.title)
    )
    .slice(0, limit)
    .map((result) => result.entry);
}
