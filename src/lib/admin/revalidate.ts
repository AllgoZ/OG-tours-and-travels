import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Publishing workflow: the public blog is statically generated, so after an admin changes anything that
 * is (or was) public we invalidate exactly these cached routes. They regenerate on their next visit.
 * Called only from server actions that have already passed requireAdmin(); the paths are fixed in code
 * (plus validated slugs), so there is no endpoint an outsider can point at arbitrary paths.
 *
 * Self-hosted note: revalidation updates the cache of THIS server instance. Behind several instances,
 * redeploy instead (see docs/admin-cms.md).
 */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function revalidatePublicBlog(slugs: Array<string | null | undefined> = []): string[] {
  const done: string[] = [];
  const run = (path: string, type?: "page" | "layout") => {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
    done.push(type ? `${path} (${type})` : path);
  };

  for (const slug of new Set(slugs)) {
    if (slug && SLUG.test(slug)) run(`/blog/${slug}`);
  }
  // Other articles show related / previous / next links, so every article page is refreshed lazily.
  run("/blog/[slug]", "page");
  run("/blog/page/[n]", "page");
  run("/blog");
  run("/"); // "Latest stories" on the home page
  run("/sitemap.xml");
  run("/blog/feed.xml");
  return done;
}
