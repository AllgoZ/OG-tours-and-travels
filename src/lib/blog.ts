import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const isProd = process.env.NODE_ENV === "production";

export interface PostFrontmatter {
  title: string;
  excerpt: string;
  cover: string; // basename in src/assets/images, e.g. "blog-group-road-trip.jpg"
  coverAlt: string;
  author?: string;
  date: string; // ISO (published)
  updated?: string; // ISO
  category: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonical?: string;
  draft?: boolean;
  /** Example content pending owner sign-off (flagged in dev + launch check). */
  reviewStatus?: "needs-business-review" | "approved";
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface Post extends PostFrontmatter {
  slug: string;
  html: string;
  readingMinutes: number;
  headings: Heading[];
}

export interface PostSummary extends PostFrontmatter {
  slug: string;
  readingMinutes: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function listFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  // Only post files: *.md, excluding README.md and underscore-prefixed helper files.
  return fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"));
}

function readRaw(slug: string): { data: PostFrontmatter; content: string } | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { data: data as PostFrontmatter, content };
}

function readingTime(markdownContent: string): number {
  const words = markdownContent.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Published = not a draft (drafts are hidden in production but visible in dev). */
function isPublished(fm: PostFrontmatter): boolean {
  return !(fm.draft && isProd);
}

export function getAllSlugs(): string[] {
  return listFiles()
    .map((f) => f.replace(/\.md$/, ""))
    .filter((slug) => {
      const raw = readRaw(slug);
      return raw ? isPublished(raw.data) : false;
    });
}

export function getAllPosts(): PostSummary[] {
  return getAllSlugs()
    .map((slug) => {
      const raw = readRaw(slug)!;
      return { ...raw.data, slug, readingMinutes: readingTime(raw.content) };
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Every post including drafts (for launch review tooling). */
export function getAllPostsIncludingDrafts(): PostSummary[] {
  return listFiles()
    .map((f) => f.replace(/\.md$/, ""))
    .map((slug) => {
      const raw = readRaw(slug)!;
      return { ...raw.data, slug, readingMinutes: readingTime(raw.content) };
    });
}

export function getPost(slug: string): Post | null {
  const raw = readRaw(slug);
  if (!raw || !isPublished(raw.data)) return null;

  const headings: Heading[] = [];
  const renderer = new marked.Renderer();
  const slugCount = new Map<string, number>();
  renderer.heading = ({ tokens, depth }) => {
    const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
    const base = slugify(text);
    const count = slugCount.get(base) ?? 0;
    slugCount.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    if (depth === 2 || depth === 3) headings.push({ id, text, level: depth });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  const html = marked.parse(raw.content, { renderer, async: false }) as string;
  return { ...raw.data, slug, html, readingMinutes: readingTime(raw.content), headings };
}

/** Related posts: same category first, then most recent, excluding the current slug. */
export function getRelatedPosts(slug: string, limit = 2): PostSummary[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  const sameCat = others.filter((p) => p.category === current?.category);
  const rest = others.filter((p) => p.category !== current?.category);
  return [...sameCat, ...rest].slice(0, limit);
}

/** Previous (older) and next (newer) in chronological order. */
export function getAdjacentPosts(slug: string): { prev: PostSummary | null; next: PostSummary | null } {
  const all = getAllPosts(); // newest first
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return { prev: all[idx + 1] ?? null, next: all[idx - 1] ?? null };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
