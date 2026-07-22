import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const article = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/article" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tagline: z.string().optional(),
    timeline: z
      .array(
        z.object({
          year: z.string(),
          text: z.string(),
        }),
      )
      .optional(),
  }),
});

export const collections = { article, pages };
