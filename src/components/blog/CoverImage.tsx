import Image from "next/image";
import { blogCovers, coverImage } from "@/lib/blog-covers";
import { coverPublicUrl } from "@/lib/covers";

interface CoverImageProps {
  cover: string;
  coverWidth?: number;
  coverHeight?: number;
  alt: string;
  quality?: number;
  sizes: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

/**
 * One place that knows how to render a post cover: a legacy bundled image (static import) or an
 * uploaded Storage image (remote URL with stored dimensions, so layout never shifts).
 */
export function CoverImage({ cover, coverWidth, coverHeight, alt, ...rest }: CoverImageProps) {
  const uploaded = Boolean(cover) && !(cover in blogCovers) && coverWidth && coverHeight;
  if (uploaded) {
    return <Image src={coverPublicUrl(cover)} width={coverWidth} height={coverHeight} alt={alt} {...rest} />;
  }
  return <Image src={coverImage(cover)} alt={alt} {...rest} />;
}
