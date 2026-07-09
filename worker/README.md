# Guestbook API (Cloudflare Worker + D1)

Free backend for the mixed-language guestbook.

- Visitors submit **name + email + comment** (no login)
- Public list returns **name + comment only** (email never exposed)
- Chinese and English messages share one feed

## 1. Create D1 database

```bash
cd worker
npx wrangler login
npx wrangler d1 create cupofluci-guestbook
```

Copy the `database_id` into `wrangler.toml`.

## 2. Apply schema

```bash
npx wrangler d1 execute cupofluci-guestbook --remote --file=./schema.sql
# local/dev:
npx wrangler d1 execute cupofluci-guestbook --local --file=./schema.sql
```

## 3. Set secrets (optional email notify)

```bash
# comma-separated origins allowed to call the API
npx wrangler secret put ALLOWED_ORIGINS
# example value: https://cupofluci.pages.dev,http://localhost:4321

# optional: get an email when someone writes
npx wrangler secret put NOTIFY_EMAIL
npx wrangler secret put RESEND_API_KEY
```

If you skip Resend, entries still save — you just won’t get email alerts. Read emails later with:

```bash
npx wrangler d1 execute cupofluci-guestbook --remote \
  --command="SELECT id, name, email, created_at FROM entries ORDER BY id DESC LIMIT 20"
```

## 4. Deploy worker

```bash
npx wrangler deploy
```

Note the worker URL, e.g. `https://cupofluci-guestbook.<you>.workers.dev`

## 5. Point the Astro site at it

In Cloudflare Pages → Settings → Environment variables:

```
PUBLIC_GUESTBOOK_API=https://cupofluci-guestbook.<you>.workers.dev
```

Or locally, create `.env`:

```
PUBLIC_GUESTBOOK_API=http://127.0.0.1:8787
```

Then run the worker with `npx wrangler dev` and the site with `npm run dev`.
