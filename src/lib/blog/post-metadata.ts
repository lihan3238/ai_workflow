export interface ReadingMetrics {
  minutes: number;
  label: string;
}

function stripMarkdownSyntax(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/m, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_\-[\]()`|]/g, " ");
}

export function estimateReadingMetrics(markdown: string): ReadingMetrics {
  const text = stripMarkdownSyntax(markdown);
  const cjkUnits = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const wordUnits = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  const units = cjkUnits + wordUnits;
  const minutes = Math.max(1, Math.ceil(units / 420));
  return {
    minutes,
    label: `${minutes} min read`
  };
}

export function formatPostDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
