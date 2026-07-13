import { getCollection } from "astro:content";

export async function getPosts() {
  const posts = await getCollection("article");
  return posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
