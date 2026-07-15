import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

/** Last change date for a repo file as YYYY-MM-DD (git, with mtime fallback). */
export function fileUpdatedOn(relativePath: string): string {
  try {
    const fromGit = execSync(`git log -1 --format=%cs -- ${relativePath}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromGit)) return fromGit;
  } catch {
    // fall through
  }

  try {
    const mtime = statSync(resolve(relativePath)).mtime;
    return mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
