import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type { Heading } from "./blog-core";

/**
 * Markdown → sanitised HTML + heading list. Article bodies are injected with
 * dangerouslySetInnerHTML, so the HTML is run through an allow-list sanitiser regardless of
 * where the Markdown came from (repo file or database): raw HTML in Markdown is never trusted.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "del", "code", "pre", "blockquote",
    "hr", "br", "table", "thead", "tbody", "tr", "th", "td", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    img: ["src", "alt", "loading", "decoding"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: /^https?:/i.test(attribs.href ?? "") ? { ...attribs, rel: "noopener noreferrer" } : attribs,
    }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
  },
  // Body images are allowed ONLY from our own public blog-covers bucket (uploaded through the CMS).
  exclusiveFilter: (frame) => frame.tag === "img" && !isOwnImage(frame.attribs.src),
};

/** Public base URL of the blog-covers bucket, or null when Supabase is not configured. */
function ownImagePrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/blog-covers/` : null;
}

function isOwnImage(src: string | undefined): boolean {
  const prefix = ownImagePrefix();
  return Boolean(src && prefix && src.startsWith(prefix) && !src.slice(prefix.length).includes("/") && !src.includes(".."));
}

const PLAIN: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

/** Heading text as the reader sees it: markup stripped, entities for & decoded. */
const plainText = (html: string) => sanitizeHtml(html, PLAIN).replace(/&amp;/g, "&").trim();

export function renderMarkdown(markdown: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const renderer = new marked.Renderer();
  const slugCount = new Map<string, number>();
  renderer.heading = ({ tokens, depth }) => {
    // The page title is the only H1: a stray "# " in the body is demoted to H2.
    const level = Math.min(4, Math.max(2, depth));
    const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
    const base = slugify(plainText(text));
    const count = slugCount.get(base) ?? 0;
    slugCount.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    if (level === 2 || level === 3) headings.push({ id, text, level });
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  const raw = marked.parse(markdown, { renderer, async: false }) as string;
  const html = sanitizeHtml(raw, SANITIZE);
  // TOC labels are plain text (any markup in a heading is stripped).
  return {
    html,
    headings: headings.map((h) => ({ ...h, text: plainText(h.text) })),
  };
}
