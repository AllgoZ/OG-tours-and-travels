import type { PostFrontmatter } from "./blog-core";

/**
 * Pure JSON-LD builders (no I/O) so the structured data can be unit-tested against the same
 * post model the page renders. Every field comes from the published post or confirmed config;
 * nothing is invented (no ratings, prices, reviews, availability).
 */
type Json = Record<string, unknown>;

export interface SeoContext {
  /** Validated production origin, or null while the domain is unconfirmed. */
  siteUrl: string | null;
  businessName: string;
  defaultAuthor: string;
  /** Absolute URL of the article's own cover when it has an uploaded one (else the site-wide image). */
  imageUrl?: string;
}

export function articleJsonLd(post: PostFrontmatter & { slug: string }, ctx: SeoContext): Json {
  const { siteUrl: url } = ctx;
  const author = post.author ?? ctx.defaultAuthor;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    inLanguage: "en",
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: ctx.businessName,
      ...(url && { logo: { "@type": "ImageObject", url: `${url}/icon.png` } }),
    },
    ...(url && {
      mainEntityOfPage: { "@type": "WebPage", "@id": `${url}/blog/${post.slug}` },
      image: ctx.imageUrl ?? `${url}/og.jpg`,
    }),
    articleSection: post.category,
    ...(post.tags && post.tags.length > 0 && { keywords: post.tags.join(", ") }),
  };
}

export function breadcrumbJsonLd(post: { title: string; slug: string }, siteUrl: string | null): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", ...(siteUrl && { item: `${siteUrl}/` }) },
      { "@type": "ListItem", position: 2, name: "Journal", ...(siteUrl && { item: `${siteUrl}/blog` }) },
      { "@type": "ListItem", position: 3, name: post.title, ...(siteUrl && { item: `${siteUrl}/blog/${post.slug}` }) },
    ],
  };
}

/** FAQPage for questions that are visibly answered on the page (src/content/faq.ts). */
export function faqJsonLd(items: { question: string; answer: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

/**
 * Serialises JSON-LD for a <script> tag. Escapes every character that could terminate or
 * confuse the script block or HTML parser: <, >, & and the JS line separators U+2028/2029.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");
}
