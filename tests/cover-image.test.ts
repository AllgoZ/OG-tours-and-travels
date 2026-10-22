import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CoverError, MAX_UPLOAD_BYTES, processCoverUpload } from "@/lib/admin/cover-image";
import { UPLOADED_COVER_RE } from "@/lib/admin/post-input";

const img = (w: number, h: number, fmt: "png" | "jpeg" | "webp" | "avif" = "png") =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 80, b: 100 } } })[fmt]().toBuffer();

describe("cover image processing", () => {
  it.each(["png", "jpeg", "webp", "avif"] as const)("accepts %s and re-encodes it to WebP", async (fmt) => {
    const out = await processCoverUpload(await img(1200, 800, fmt));
    expect(out.name).toMatch(UPLOADED_COVER_RE);
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
    expect((await sharp(out.buffer).metadata()).format).toBe("webp");
  });

  it("downsizes very large images", async () => {
    const out = await processCoverUpload(await img(3000, 2000));
    expect(Math.max(out.width, out.height)).toBe(2000);
  });

  it("names the file from its content, so identical uploads are the same object (no duplicates)", async () => {
    const a = await processCoverUpload(await img(1200, 800));
    const b = await processCoverUpload(await img(1200, 800));
    const c = await processCoverUpload(await img(1300, 800));
    expect(a.name).toBe(b.name);
    expect(a.name).not.toBe(c.name);
  });

  it("strips metadata (EXIF / location) from the stored file", async () => {
    const withExif = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#123456" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "secret-owner", Software: "gps-tool" } } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await processCoverUpload(withExif);
    expect((await sharp(out.buffer).metadata()).exif).toBeUndefined();
    expect(out.buffer.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("judges the bytes, not the label: non-images, scripts and SVG are rejected", async () => {
    await expect(processCoverUpload(Buffer.from("<?php system($_GET['c']); ?>"))).rejects.toBeInstanceOf(CoverError);
    await expect(processCoverUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><script>alert(1)</script></svg>'))).rejects.toThrow(/Unsupported|readable/);
    await expect(processCoverUpload(Buffer.from("GIF89a" + "x".repeat(100)))).rejects.toBeInstanceOf(CoverError);
    await expect(processCoverUpload(Buffer.alloc(0))).rejects.toThrow(/empty/);
  });

  it("rejects images that are too small or too large (bytes or pixels)", async () => {
    await expect(processCoverUpload(await img(300, 200))).rejects.toThrow(/at least 600px/);
    await expect(processCoverUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1))).rejects.toThrow(/larger than 4 MB/);
    await expect(processCoverUpload(await img(9000, 100))).rejects.toThrow(/larger than 8000px/);
  });
});
