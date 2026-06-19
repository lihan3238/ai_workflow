import type { SiteMode } from "./site-mode";

export interface ForbiddenPattern {
  label: string;
  pattern: RegExp;
}

const COMMON_PRIVATE_PATTERNS: ForbiddenPattern[] = [
  {
    label: "private/local asset path",
    pattern: /\bai\/(?:prompts|profiles)\/[a-z0-9./-]+\.md\b/i
  }
];

const REMOVED_ROUTE_PATTERNS: ForbiddenPattern[] = [
  {
    label: "removed route",
    pattern: /^(?:family|photos)\/index\.html$/i
  },
  {
    label: "removed nav label",
    pattern: />\s*(?:Family|Photos)\s*</i
  }
];

export function requiredPathsForMode(mode: SiteMode): string[] {
  return [
    "index.html",
    "blog/index.html",
    "search/index.html",
    "search-index.json",
    "ai/index.html",
    "runtime/index.html"
  ];
}

export function forbiddenPatternsForMode(mode: SiteMode): ForbiddenPattern[] {
  return [...REMOVED_ROUTE_PATTERNS, ...COMMON_PRIVATE_PATTERNS];
}

export function auditArtifactFiles(
  mode: SiteMode,
  files: Record<string, string>
): string[] {
  const findings: string[] = [];
  for (const requiredPath of requiredPathsForMode(mode)) {
    if (!(requiredPath in files)) {
      findings.push(`missing required path ${requiredPath}`);
    }
  }

  for (const [filePath, content] of Object.entries(files)) {
    for (const forbidden of forbiddenPatternsForMode(mode)) {
      forbidden.pattern.lastIndex = 0;
      if (forbidden.pattern.test(filePath) || forbidden.pattern.test(content)) {
        findings.push(`forbidden ${forbidden.label} in ${filePath}`);
      }
    }
  }

  return findings;
}
