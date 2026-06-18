import { defineCollection, z } from 'astro:content';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      // OKF (Open Knowledge Format) — every doc declares a free-string `type`
      // (cb-w12 "Camada OKF"). Optional + defaulted so the existing 102 docs
      // build green without touching their prose. The OKF *bundle of record*
      // (with `type` written into raw frontmatter, validated by
      // scripts/validate-okf.sh) lives in apps/docs/okf/, OUTSIDE this routed
      // collection — a Zod default is invisible to a raw-YAML validator, and an
      // index.md at this collection root would collide with index.mdx. See
      // apps/docs/okf/index.md.
      extend: (context) =>
        blogSchema(context).extend({
          type: z.string().default('doc'),
        }),
    }),
  }),
  i18n: defineCollection({
    type: 'data',
    schema: i18nSchema(),
  }),
};
