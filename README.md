# cupofluci

Personal site in the spirit of [sive.rs](https://sive.rs/): plain pages, short writing, photos.

## Features

- Astro static site (free to host on Cloudflare Pages / GitHub Pages)
- English UI, black background / white text
## Local development

```bash
npm install
npm run dev
```

Open http://localhost:4321

Edit homepage copy in `src/i18n/ui.ts` (timeline, contact email, about/now text).

## Write a post

Add a Markdown file under `src/content/blog/`:

```md
---
title: "My title"
description: "Optional summary"
date: 2026-07-09
---

Your words here.
```

## Deploy (free)

1. Push this repo to GitHub
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect repo
3. Build command: `npm run build`
4. Output directory: `dist`

No VPS required.

Optional guestbook API code still lives under `worker/` if you want it later — it is not wired into the site UI right now.
