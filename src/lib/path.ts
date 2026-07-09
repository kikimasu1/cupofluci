/** Build a path that respects Astro `base` (needed for GitHub Pages). */
export function path(href = "/") {
  const base = import.meta.env.BASE_URL || "/";
  if (href === "/") return base;
  const normalized = href.startsWith("/") ? href : `/${href}`;
  return `${base.replace(/\/$/, "")}${normalized}`;
}
