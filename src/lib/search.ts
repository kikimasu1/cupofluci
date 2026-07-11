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

export type SearchSnippet = {
  before: string;
  match: string;
  after: string;
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

function findMatchIndex(text: string, query: string): number {
  return normalizeHaystack(text).indexOf(normalizeHaystack(query));
}

function sentenceAround(text: string, matchIndex: number, matchLength: number): string {
  const maxBefore = 60;
  const maxAfter = 100;

  let start = matchIndex;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1] ?? "")) {
    if (matchIndex - start >= maxBefore) break;
    start -= 1;
  }
  if (matchIndex - start > maxBefore) {
    start = Math.max(0, matchIndex - maxBefore);
  }

  let end = matchIndex + matchLength;
  while (end < text.length && !/[.!?\n]/.test(text[end] ?? "")) {
    if (end - (matchIndex + matchLength) >= maxAfter) break;
    end += 1;
  }
  if (end < text.length && /[.!?]/.test(text[end] ?? "")) {
    end += 1;
  }

  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** Best-effort excerpt around the first query hit for search results. */
export function extractSnippet(doc: SearchDoc, query: string): SearchSnippet | null {
  const fields = [doc.body, doc.description, doc.title].filter(Boolean);

  for (const field of fields) {
    const matchIndex = findMatchIndex(field, query);
    if (matchIndex === -1) continue;

    const snippet = sentenceAround(field, matchIndex, query.length);
    const localIndex = findMatchIndex(snippet, query);
    if (localIndex === -1) continue;

    const matchLength = query.length;
    return {
      before: snippet.slice(0, localIndex),
      match: snippet.slice(localIndex, localIndex + matchLength),
      after: snippet.slice(localIndex + matchLength),
    };
  }

  return null;
}
