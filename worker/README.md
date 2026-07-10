# Comments API (Cloudflare Worker + D1)

Per-article comments for cupofluci.

- Visitors submit **name + email + comment** (no login)
- Public list returns **name + comment + date only** (email never exposed)
- Emails stay in D1 (and optional notify email to you)

## 1. Login + create D1

```bash
cd worker
npx wrangler login
npx wrangler d1 create cupofluci-guestbook
```

Copy the `database_id` into `wrangler.toml`.

## 2. Apply schema

```bash
npx wrangler d1 execute cupofluci-guestbook --remote --file=./schema.sql
npx wrangler d1 execute cupofluci-guestbook --local --file=./schema.sql
```

If the table already exists without `post_slug`, run:

```bash
npx wrangler d1 execute cupofluci-guestbook --remote \
  --command="ALTER TABLE entries ADD COLUMN post_slug TEXT NOT NULL DEFAULT '';"
```

## 3. Secrets

```bash
# allow your live site + local preview
npx wrangler secret put ALLOWED_ORIGINS
# example:
# https://cupofluci.com,https://www.cupofluci.com,https://kikimasu1.github.io,http://localhost:4321

# optional: email you when someone comments
npx wrangler secret put NOTIFY_EMAIL
# lucidreaminxx@gmail.com

npx wrangler secret put RESEND_API_KEY
```

Without Resend, comments still save. Read private emails with:

```bash
npx wrangler d1 execute cupofluci-guestbook --remote \
  --command="SELECT id, post_slug, name, email, created_at FROM entries ORDER BY id DESC LIMIT 20"
```

## 4. Deploy worker

```bash
npx wrangler deploy
```

Copy the worker URL, e.g. `https://cupofluci-guestbook.<you>.workers.dev`

## 5. Point the Astro site at it

GitHub repo → **Settings → Secrets and variables → Actions → Variables**:

```
PUBLIC_COMMENTS_API=https://cupofluci-guestbook.<you>.workers.dev
```

Then re-run the Pages deploy workflow (or push a commit).

Locally:

```
PUBLIC_COMMENTS_API=http://127.0.0.1:8787
```

```bash
cd worker && npm run dev
# other terminal
cd .. && npm run dev
```
