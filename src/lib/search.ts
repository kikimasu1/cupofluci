/** Safe client-side search helpers (no user RegExp / no HTML injection). */

export const MAX_QUERY_LENGTH = 80;

/** Allow letters (incl. CJK), numbers, spaces, and a few punctuation marks. */
const SAFE_QUERY_RE = /^[\p{L}\p{N}\s'"’“”.,!?+\-:/]+$/u;

export type SearchDoc = {
  id: string;
  title: string;
  description: string;
  date: string;
  body: string;
  href: string;
};

export function sanitizeQuery(raw: string): { ok: true; query: string } | { ok: false; reason: "empty" | "invalid" | "too_long" } {
  const query = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!query) return { ok: false, reason: "empty" };
  if (query.length > MAX_QUERY_LENGTH) return { ok: false, reason: "too_long" };
  if (!SAFE_QUERY_RE.test(query)) return { ok: false, reason: "invalid" };
  return { ok: true, query };
}

function normalizeHaystack(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/** Plain substring match — never compile user input as RegExp. */
export function matchesQuery(doc: SearchDoc, query: string): boolean {
  const q = normalizeHaystack(query);
  const hay = normalizeHaystack(
    [doc.title, doc.description, doc.body, doc.date].join("\n"),
  );
  return hay.includes(q);
}

export function searchDocs(docs: SearchDoc[], rawQuery: string) {
  const cleaned = sanitizeQuery(rawQuery);
  if (!cleaned.ok) return { cleaned, results: [] as SearchDoc[] };
  const results = docs.filter((doc) => matchesQuery(doc, cleaned.query));
  return { cleaned, results };
}
