import { serializeJsonLd } from "@/lib/seo";

/** Renders one or more JSON-LD nodes. The serializer escapes `<`, `>`, `&` and U+2028/9 so no payload string can close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
