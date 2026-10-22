/**
 * Editorial SEO / AEO guidance for the editor. Pure. These are practical checks on the stored
 * content, NOT a score: nothing here predicts or promises rankings, citations or traffic.
 */
export interface SeoCheckInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  cover: string;
  coverAlt: string;
  /** True when another post already uses this slug (checked server-side). */
  slugTaken?: boolean;
}

export type SeoLevel = "error" | "warn" | "tip";
export interface SeoFinding {
  id: string;
  level: SeoLevel;
  message: string;
}

export interface OutlineItem {
  level: number;
  text: string;
}

/** Markdown headings outside fenced code blocks. */
export function outline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) items.push({ level: m[1].length, text: m[2] });
  }
  return items;
}

/** Internal links in Markdown source: site-relative paths (not protocol-relative) and anchors. */
export function internalLinks(markdown: string): string[] {
  const links: string[] = [];
  for (const m of markdown.matchAll(/\[[^\]]*\]\((\/(?!\/)[^)\s]*|#[^)\s]*)[^)]*\)/g)) links.push(m[1]);
  return links;
}

export function analyzeSeo(i: SeoCheckInput): SeoFinding[] {
  const f: SeoFinding[] = [];
  const add = (id: string, level: SeoLevel, message: string) => f.push({ id, level, message });

  if (!i.title.trim()) add("title-missing", "error", "Add a title. It becomes the page's only H1.");
  if (i.slugTaken) add("slug-taken", "error", "Another article already uses this slug. Choose a different one.");
  if (!i.content.trim()) add("content-empty", "error", "The article body is empty.");

  const seoTitle = i.seoTitle.trim();
  if (!seoTitle) add("seo-title-missing", "warn", "No SEO title: the article title will be used in search results.");
  else if (seoTitle.length > 60) add("seo-title-long", "warn", `The SEO title is ${seoTitle.length} characters; around 60 or fewer usually displays in full.`);
  else if (seoTitle.length < 25) add("seo-title-short", "tip", `The SEO title is only ${seoTitle.length} characters; a more descriptive title can help searchers.`);

  const desc = i.seoDescription.trim();
  if (!desc) add("seo-desc-missing", "warn", "No meta description: the excerpt will be used as the description.");
  else if (desc.length > 160) add("seo-desc-long", "warn", `The meta description is ${desc.length} characters; it may be truncated beyond roughly 160.`);
  else if (desc.length < 70) add("seo-desc-short", "tip", `The meta description is ${desc.length} characters; 70–160 gives room to say what the page answers.`);

  const excerpt = i.excerpt.trim();
  if (!excerpt) add("excerpt-missing", "error", "Add an excerpt; it appears on cards and is the fallback description.");
  else if (excerpt.length > 300) add("excerpt-long", "tip", "A long excerpt is truncated on cards; keep the key point in the first sentence.");

  if (i.canonical.trim()) {
    try {
      const u = new URL(i.canonical.trim());
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("scheme");
      add("canonical-set", "tip", "A custom canonical tells search engines this article's preferred URL is elsewhere. Leave it empty unless the article is also published on another site.");
    } catch {
      add("canonical-invalid", "error", "The canonical URL is not a valid web address.");
    }
  }

  if (!i.cover) add("cover-missing", "tip", "No cover image: the default cover will be shown.");
  else if (!i.coverAlt.trim()) add("cover-alt-missing", "warn", "Describe the cover image in the alt text (for screen readers and image search).");

  const heads = outline(i.content);
  const h1 = heads.filter((h) => h.level === 1);
  if (h1.length > 0) add("body-h1", "warn", "The article title is already the page's H1. Use ## for section headings; a # in the body is shown as a ## heading.");
  const sections = heads.filter((h) => h.level >= 2);
  const words = i.content.trim().split(/\s+/).filter(Boolean).length;
  if (i.content.trim() && sections.length === 0 && words > 250) {
    add("no-headings", "tip", "Break a long article into sections with ## headings; they build the table of contents and make answers easier to find.");
  }
  let prev = 1;
  for (const h of sections) {
    if (h.level > prev + 1) {
      add("heading-skip", "warn", `The heading “${h.text}” jumps from H${prev} to H${h.level}. Use headings in order (## then ###).`);
      break;
    }
    prev = h.level;
  }
  if (sections.some((h) => h.level === 3) && !sections.some((h) => h.level === 2)) {
    add("h3-without-h2", "warn", "There are ### subsections but no ## sections.");
  }

  const links = internalLinks(i.content);
  if (i.content.trim() && links.length === 0) {
    add("no-internal-links", "tip", "No internal links yet. Link to a related article (/blog/their-slug) or the enquiry form (/#enquire) where it helps the reader.");
  }

  if (words > 0 && words < 150) add("thin", "tip", `The article is about ${words} words. Short pages are fine when they fully answer the question; make sure this one does.`);

  return f;
}

export function wordCount(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}
