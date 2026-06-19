import type { AiAsset, AssetVisibility } from "./assets/schema";

export type SiteMode = "operator";

export interface NavItem {
  href: string;
  label: string;
  key: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/blog/", label: "Blog", key: "blog" },
  { href: "/search/", label: "Search", key: "search" },
  { href: "/ai/", label: "AI Assets", key: "ai" },
  { href: "/runtime", label: "Runtime", key: "runtime" }
];

const SITE_MODES = ["operator"] as const;
const OPERATOR_HIDDEN_VISIBILITIES: AssetVisibility[] = ["private", "local-only"];

export function parseSiteMode(value: string | undefined): SiteMode {
  const normalized = value?.trim() ?? "";
  if (normalized === "") {
    return "operator";
  }
  if ((SITE_MODES as readonly string[]).includes(normalized)) {
    return normalized as SiteMode;
  }
  throw new Error(`PUBLIC_SITE_MODE must be one of ${SITE_MODES.join(", ")}, got '${normalized}'`);
}

export function navItemsForSiteMode(mode: SiteMode, items = NAV_ITEMS): NavItem[] {
  return items;
}

export function assetsVisibleInSiteMode<T extends Pick<AiAsset, "visibility">>(
  mode: SiteMode,
  assets: T[]
): T[] {
  return assets.filter((asset) => !OPERATOR_HIDDEN_VISIBILITIES.includes(asset.visibility));
}

export function isOperatorMode(mode: SiteMode): boolean {
  return mode === "operator";
}

export function shouldShowHiddenAssetCount(mode: SiteMode): boolean {
  return true;
}
