import "server-only";
import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stays under the ~4.5 MB request cap of serverless hosts
const MAX_INPUT_PIXELS = 40_000_000;
const MIN_WIDTH = 600;
const MAX_SIDE = 8000;
const OUTPUT_MAX_SIDE = 2000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

export interface ProcessedCover {
  buffer: Buffer;
  name: string; // <20 hex>.webp, derived from the processed bytes (identical images dedupe)
  width: number;
  height: number;
}

export class CoverError extends Error {}

/**
 * Validates and normalises an uploaded image. The browser's MIME type and the filename are ignored:
 * the bytes are decoded by sharp, which determines the real format. The result is re-encoded to WebP,
 * which drops EXIF/GPS metadata and any non-image payload appended to the file, and is limited in size.
 */
export async function processCoverUpload(input: Buffer): Promise<ProcessedCover> {
  if (input.length === 0) throw new CoverError("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new CoverError("The image is larger than 4 MB. Resize or compress it and try again.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).metadata();
  } catch {
    throw new CoverError("That file is not a readable image. Use a JPEG, PNG, WebP or AVIF file.");
  }
  // sharp reports AVIF as "heif" with the av1 codec; HEIC (hevc) and other containers stay rejected.
  const isAvif = meta.format === "heif" && (meta as { compression?: string }).compression === "av1";
  if (!isAvif && (!meta.format || !ALLOWED_FORMATS.has(meta.format))) {
    throw new CoverError("Unsupported image type. Use a JPEG, PNG, WebP or AVIF file.");
  }
  if ((meta.pages ?? 1) > 1) throw new CoverError("Animated images are not supported. Use a still image.");
  const { width = 0, height = 0 } = meta;
  if (width < MIN_WIDTH) throw new CoverError(`The image is only ${width}px wide. Use at least ${MIN_WIDTH}px so it stays sharp.`);
  if (width > MAX_SIDE || height > MAX_SIDE) throw new CoverError(`The image is larger than ${MAX_SIDE}px on one side. Resize it first.`);

  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate() // apply EXIF orientation, then metadata is dropped on output
      .resize({ width: OUTPUT_MAX_SIDE, height: OUTPUT_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const name = `${createHash("sha256").update(data).digest("hex").slice(0, 20)}.webp`;
    return { buffer: data, name, width: info.width, height: info.height };
  } catch {
    throw new CoverError("The image could not be processed. Try exporting it again as JPEG or PNG.");
  }
}
