import { readFileSync } from "node:fs";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { fileUpdatedOn } from "./file-updated";

/** Render a content page markdown file, filling <!--LAST_UPDATED--> from git. */
export async function renderDatedPage(relativePath: string) {
  const updated = fileUpdatedOn(relativePath);
  const raw = readFileSync(relativePath, "utf8");
  const body = raw.replace(/^---[\s\S]*?---\r?\n/, "").replace(
    "<!--LAST_UPDATED-->",
    `**Last Updated: ${updated}**`,
  );
  const processor = await createSatteriMarkdownProcessor();
  const { code } = await processor.render(body);
  return { updated, code };
}
