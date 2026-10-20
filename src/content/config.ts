import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Shorter <title> with the search phrase first; the H1 keeps `title`.
    seoTitle: z.string().optional(),
    description: z.string(),
    date: z.date(),
    author: z.string().default('Lone Star Educator'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    // Opt-in: use this path for og:image / twitter:image instead of og-default.jpg.
    ogImage: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    scoreDeskCta: z.string().optional(),
  }),
});

export const collections = { blog };
