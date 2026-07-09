export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  NOTIFY_EMAIL?: string;
  RESEND_API_KEY?: string;
}

type EntryRow = {
  id: number;
  name: string;
  comment: string;
  created_at: string;
};

const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_COMMENT = 2000;

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
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept",
  );
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    // Dev-friendly default when secret not set yet
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

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function notify(env: Env, entry: { name: string; email: string; comment: string }) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "cupofluci guestbook <onboarding@resend.dev>",
      to: [env.NOTIFY_EMAIL],
      subject: `Guestbook: ${entry.name}`,
      text: `From: ${entry.name} <${entry.email}>\n\n${entry.comment}`,
    }),
  }).catch(() => {
    // Notification failure should not fail the public write.
  });
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

    if (env.ALLOWED_ORIGINS && !origin) {
      return json({ error: "origin not allowed" }, 403);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "cupofluci-guestbook" }, 200, origin);
    }

    if (url.pathname === "/entries" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT id, name, comment, created_at
         FROM entries
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT 100`,
      ).all<EntryRow>();

      // Intentionally omit email from public responses.
      return json({ entries: results ?? [] }, 200, origin);
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

      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const comment = String(body.comment ?? "").trim();

      if (!name || !email || !comment) {
        return json({ error: "missing fields" }, 400, origin);
      }
      if (name.length > MAX_NAME || email.length > MAX_EMAIL || comment.length > MAX_COMMENT) {
        return json({ error: "too long" }, 400, origin);
      }
      if (!isEmail(email)) {
        return json({ error: "invalid email" }, 400, origin);
      }

      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown";
      const ipHash = await hashIp(ip);

      // Simple rate limit: same IP hash within 60s
      const recent = await env.DB.prepare(
        `SELECT id FROM entries
         WHERE ip_hash = ? AND created_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-60 seconds')
         LIMIT 1`,
      )
        .bind(ipHash)
        .first();

      if (recent) {
        return json({ error: "too many requests" }, 429, origin);
      }

      const result = await env.DB.prepare(
        `INSERT INTO entries (name, email, comment, ip_hash)
         VALUES (?, ?, ?, ?)
         RETURNING id, name, comment, created_at`,
      )
        .bind(name, email, comment, ipHash)
        .first<EntryRow>();

      await notify(env, { name, email, comment });

      return json({ entry: result }, 201, origin);
    }

    return json({ error: "not found" }, 404, origin);
  },
};
