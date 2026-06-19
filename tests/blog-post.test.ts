import { describe, expect, it } from "vitest";
import { estimateReadingMetrics, formatPostDate } from "../src/lib/blog/post-metadata";

describe("blog post metadata", () => {
  it("estimates reading time from mixed Chinese and English markdown", () => {
    const markdown = [
      "---",
      "title: Example",
      "---",
      "# Heading",
      "AI workflow keeps runtime assets portable.",
      "这是一段中文内容，用来验证阅读时间估算不会只统计英文单词。",
      "```bash",
      "npm run build",
      "```"
    ].join("\n");

    expect(estimateReadingMetrics(markdown)).toEqual({
      minutes: 1,
      label: "1 min read"
    });
  });

  it("formats post dates consistently for the article header", () => {
    expect(formatPostDate(new Date("2026-06-19T00:00:00.000Z"))).toBe("2026-06-19");
  });
});
