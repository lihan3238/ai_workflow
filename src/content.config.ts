import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const contentSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["public", "team", "private"]).default("public")
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: contentSchema
});

export const collections = { posts };
