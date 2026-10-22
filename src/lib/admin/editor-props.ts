import "server-only";
import { blogCovers } from "@/lib/blog-covers";
import { coverPublicUrl } from "@/lib/covers";
import { getSiteUrl } from "@/lib/site";
import { business } from "@/config/business";
import type { EditorInitial } from "@/components/admin/PostEditor";
import type { AdminPost } from "./posts";

/** Props the editor needs that don't depend on a particular post. */
export function editorEnv() {
  return {
    legacyCovers: Object.entries(blogCovers).map(([name, img]) => ({ name, src: img.src })),
    bucketBase: coverPublicUrl(""),
    siteUrl: getSiteUrl(),
    siteName: business.displayName,
  };
}

export function blankPost(): EditorInitial {
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    tags: "",
    author: "",
    cover: "",
    coverWidth: "",
    coverHeight: "",
    coverAlt: "",
    seoTitle: "",
    seoDescription: "",
    canonical: "",
    publishedAt: new Date().toISOString(),
    modifiedAt: "",
    draft: true,
    reviewStatus: "needs-business-review",
    reviewedAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function toEditorInitial(p: AdminPost): EditorInitial {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    category: p.category,
    tags: (p.tags ?? []).join(", "),
    author: p.author ?? "",
    cover: p.cover ?? "",
    coverWidth: p.cover_width ? String(p.cover_width) : "",
    coverHeight: p.cover_height ? String(p.cover_height) : "",
    coverAlt: p.cover_alt ?? "",
    seoTitle: p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
    canonical: p.canonical ?? "",
    publishedAt: p.published_at,
    modifiedAt: p.modified_at ?? "",
    draft: p.draft,
    reviewStatus: p.review_status,
    reviewedAt: p.reviewed_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
