export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  NOTIFY_EMAIL?: string;
  RESEND_API_KEY?: string;
  OWNER_REPLY_SECRET?: string;
}

type EntryRow = {
  id: number;
  name: string;
  comment: string;
  created_at: string;
  post_slug?: string;
  is_owner?: number;
  reply_to_id?: number | null;
  reply_to_name?: string | null;
};

const OWNER_DISPLAY_NAME = "Luci";

const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_COMMENT = 2000;
const MAX_SLUG = 120;
const MAX_COUNTRY = 80;
const MAX_CITY = 80;
const MAX_STATE = 40;
const MAX_MESSAGE = 2000;
const CONTACT_HUMAN = "luci";
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,119}$/i;

function json(data: unknown, status = 200, origin?: string | null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  applyCors(headers, origin);
  return new Response(JSON.stringify(data), { status, headers });
}

function applyCors(headers: Headers, origin?: string | null) {
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return origin ?? "*";
  }
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && list.includes(origin)) return origin;
  if (list.includes("*")) return origin ?? "*";
  return null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanText(value: string, max: number): string {
  return value.replace(/[\0\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanComment(value: string, max: number): string {
  return value.replace(/\0/g, "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function notifyComment(
  env: Env,
  entry: { name: string; email: string; comment: string; post_slug: string },
) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  const postUrl = `https://cupofluci.com/article/${entry.post_slug}/`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "cupofluci comments <onboarding@resend.dev>",
      to: [env.NOTIFY_EMAIL],
      reply_to: entry.email,
      subject: `Comment on ${entry.post_slug}: ${entry.name}`,
      text: [
        `New comment on ${postUrl}`,
        ``,
        `From: ${entry.name} <${entry.email}>`,
        ``,
        entry.comment,
        ``,
        `---`,
        `Reply to this email to write back to ${entry.name}.`,
      ].join("\n"),
    }),
  }).catch(() => {});
}

async function notifyContact(
  env: Env,
  entry: {
    name: string;
    email: string;
    country: string;
    city: string;
    state: string;
    message: string;
  },
) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  const location = [
    entry.country,
    entry.city,
    entry.state ? entry.state : "",
  ]
    .filter(Boolean)
    .join(" · ");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "cupofluci contact <onboarding@resend.dev>",
      to: [env.NOTIFY_EMAIL],
      reply_to: entry.email,
      subject: `Contact from ${entry.name}`,
      text: [
        `From: ${entry.name} <${entry.email}>`,
        `Location: ${location}`,
        ``,
        entry.message,
        ``,
        `---`,
        `Reply to this email to write back to ${entry.name}.`,
      ].join("\n"),
    }),
  }).catch(() => {});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!origin && env.ALLOWED_ORIGINS) {
        return new Response(null, { status: 403 });
      }
      const headers = new Headers();
      applyCors(headers, origin);
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "cupofluci-api" }, 200, origin ?? "*");
    }

    // Browser calls send Origin; reject disallowed origins.
    // Non-browser tools may omit Origin — allow those through.
    if (env.ALLOWED_ORIGINS && request.headers.get("Origin") && !origin) {
      return json({ error: "origin not allowed" }, 403);
    }

    if (url.pathname === "/entries" && request.method === "GET") {
      const postSlug = String(url.searchParams.get("post") ?? "").trim();
      if (!postSlug || !SLUG_RE.test(postSlug)) {
        return json({ error: "invalid post" }, 400, origin);
      }

      const { results } = await env.DB.prepare(
        `SELECT
           e.id,
           e.name,
           e.comment,
           e.created_at,
           COALESCE(e.is_owner, 0) AS is_owner,
           e.reply_to_id,
           p.name AS reply_to_name
         FROM entries e
         LEFT JOIN entries p ON p.id = e.reply_to_id
         WHERE e.post_slug = ?
         ORDER BY datetime(e.created_at) ASC, e.id ASC
         LIMIT 200`,
      )
        .bind(postSlug.slice(0, MAX_SLUG))
        .all<EntryRow>();

      // Intentionally omit email from public responses.
      return json({ entries: results ?? [] }, 200, origin);
    }

    if (url.pathname === "/owner-reply" && request.method === "POST") {
      if (!env.OWNER_REPLY_SECRET) {
        return json({ error: "owner reply not configured" }, 503, origin);
      }

      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return json({ error: "invalid json" }, 400, origin);
      }

      const secret = String(body.secret ?? "");
      if (!secretsEqual(secret, env.OWNER_REPLY_SECRET)) {
        return json({ error: "unauthorized" }, 401, origin);
      }

      const postSlug = cleanText(String(body.post_slug ?? ""), MAX_SLUG);
      const comment = cleanComment(String(body.comment ?? ""), MAX_COMMENT);
      const replyToRaw = body.reply_to_id;
      const replyToId =
        typeof replyToRaw === "number"
          ? replyToRaw
          : Number.parseInt(String(replyToRaw ?? ""), 10);

      if (!postSlug || !SLUG_RE.test(postSlug)) {
        return json({ error: "invalid post" }, 400, origin);
      }
      if (!comment) {
        return json({ error: "missing fields" }, 400, origin);
      }
      if (!Number.isInteger(replyToId) || replyToId < 1) {
        return json({ error: "reply_to_id required" }, 400, origin);
      }

      const parent = await env.DB.prepare(
        `SELECT id, name, post_slug, COALESCE(is_owner, 0) AS is_owner, reply_to_id
         FROM entries
         WHERE id = ?
         LIMIT 1`,
      )
        .bind(replyToId)
        .first<{
          id: number;
          name: string;
          post_slug: string;
          is_owner: number;
          reply_to_id: number | null;
        }>();

      if (!parent || parent.post_slug !== postSlug) {
        return json({ error: "parent comment not found" }, 404, origin);
      }
      // One-level nesting only: reply to a visitor comment, not to a Luci reply.
      if (parent.is_owner || parent.reply_to_id) {
        return json({ error: "can only reply to a top-level comment" }, 400, origin);
      }

      const email = cleanText(
        env.NOTIFY_EMAIL ?? "owner@cupofluci.local",
        MAX_EMAIL,
      ).toLowerCase();

      const result = await env.DB.prepare(
        `INSERT INTO entries (post_slug, name, email, comment, is_owner, reply_to_id, ip_hash)
         VALUES (?, ?, ?, ?, 1, ?, NULL)
         RETURNING id, name, comment, created_at, is_owner, reply_to_id`,
      )
        .bind(postSlug, OWNER_DISPLAY_NAME, email, comment, replyToId)
        .first<EntryRow>();

      return json(
        {
          entry: result
            ? { ...result, reply_to_name: parent.name }
            : result,
        },
        201,
        origin,
      );
    }

    if (url.pathname === "/entries" && request.method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return json({ error: "invalid json" }, 400, origin);
      }

      // Honeypot — bots fill this; humans never see it.
      if (typeof body.company === "string" && body.company.trim() !== "") {
        return json({ ok: true }, 201, origin);
      }

      const postSlug = cleanText(String(body.post_slug ?? ""), MAX_SLUG);
      const name = cleanText(String(body.name ?? ""), MAX_NAME);
      const email = cleanText(String(body.email ?? ""), MAX_EMAIL).toLowerCase();
      const comment = cleanComment(String(body.comment ?? ""), MAX_COMMENT);

      if (!postSlug || !SLUG_RE.test(postSlug)) {
        return json({ error: "invalid post" }, 400, origin);
      }
      if (!name || !email || !comment) {
        return json({ error: "missing fields" }, 400, origin);
      }
      if (!isEmail(email)) {
        return json({ error: "invalid email" }, 400, origin);
      }

      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown";
      const ipHash = await hashIp(ip);

      const recent = await env.DB.prepare(
        `SELECT id FROM entries
         WHERE ip_hash = ?
           AND post_slug = ?
           AND created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 seconds')
         LIMIT 1`,
      )
        .bind(ipHash, postSlug)
        .first();

      if (recent) {
        return json({ error: "too many requests" }, 429, origin);
      }

      const result = await env.DB.prepare(
        `INSERT INTO entries (post_slug, name, email, comment, ip_hash)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, name, comment, created_at`,
      )
        .bind(postSlug, name, email, comment, ipHash)
        .first<EntryRow>();

      await notifyComment(env, { name, email, comment, post_slug: postSlug });

      return json({ entry: result }, 201, origin);
    }

    if (url.pathname === "/contact" && request.method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return json({ error: "invalid json" }, 400, origin);
      }

      if (typeof body.company === "string" && body.company.trim() !== "") {
        return json({ ok: true }, 201, origin);
      }

      const name = cleanText(String(body.name ?? ""), MAX_NAME);
      const email = cleanText(String(body.email ?? ""), MAX_EMAIL).toLowerCase();
      const country = cleanText(String(body.country ?? ""), MAX_COUNTRY);
      const city = cleanText(String(body.city ?? ""), MAX_CITY);
      const state = cleanText(String(body.state ?? ""), MAX_STATE);
      const message = cleanComment(String(body.message ?? ""), MAX_MESSAGE);
      const human = cleanText(String(body.human ?? ""), 40).toLowerCase();

      if (!name || !email || !country || !city || !message) {
        return json({ error: "missing fields" }, 400, origin);
      }
      if (!isEmail(email)) {
        return json({ error: "invalid email" }, 400, origin);
      }
      if (country === "U.S.A." && !state) {
        return json({ error: "missing state" }, 400, origin);
      }
      if (human !== CONTACT_HUMAN) {
        return json({ error: "human check failed" }, 400, origin);
      }

      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown";
      const ipHash = await hashIp(ip);

      const recent = await env.DB.prepare(
        `SELECT id FROM contacts
         WHERE ip_hash = ?
           AND created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 seconds')
         LIMIT 1`,
      )
        .bind(ipHash)
        .first();

      if (recent) {
        return json({ error: "too many requests" }, 429, origin);
      }

      const result = await env.DB.prepare(
        `INSERT INTO contacts (name, email, country, city, state, message, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id, name, email, country, city, state, created_at`,
      )
        .bind(name, email, country, city, state, message, ipHash)
        .first();

      await notifyContact(env, { name, email, country, city, state, message });

      return json({ contact: result }, 201, origin);
    }

    return json({ error: "not found" }, 404, origin);
  },
};
