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
  }),
});

const home = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/home" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    aiDisclaimer: z.string(),
    me10sTitle: z.string(),
    tagline: z.string(),
    timeline: z.array(
      z.object({
        year: z.string(),
        text: z.string(),
      }),
    ),
    me10mTitle: z.string(),
    me10mBefore: z.string(),
    me10mLink: z.string(),
    me10mAfter: z.string(),
    nowTitle: z.string(),
    nowBefore: z.string(),
    nowLink: z.string(),
    nowAfter: z.string(),
    contactTitle: z.string(),
    contactBefore: z.string(),
    contactLink: z.string(),
    newestPrefix: z.string(),
    newestArticles: z.string(),
    morePrefix: z.string(),
    moreLink: z.string(),
    footerTitle: z.string(),
    platforms: z.array(
      z.object({
        label: z.string(),
        url: z.string(),
      }),
    ),
  }),
});

export const collections = { article, pages, home };
