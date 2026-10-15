// Builds the web-ready masters in src/assets/images from assets/originals.
// Crops only, plus one retouch: the number plate is painted out (see PLATES below).
// The untouched originals in assets/originals are never modified.
// Camera timestamp overlays in the originals are removed by cropping them out of frame.
// next/image then produces the responsive AVIF/WebP sizes at build/request time.
//
// Run: npm run images
import sharp from "sharp";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGINALS = "assets/originals";
const SRC = "node_modules/.cache/og-images-src"; // originals + number plates painted out
const OUT = "src/assets/images";
await mkdir(OUT, { recursive: true });
await mkdir(SRC, { recursive: true });

// ---------- Hide the number plate ----------
// Boxes (x, y, w, h in source pixels) around the plate incl. its frame. Each box is filled
// with a left-to-right blend of the pixels just outside it, so it blends into the bumper /
// body panel, then the edge is feathered with a light blur.
const PLATES = {
  "cutout-front.png": [[506, 1106, 302, 90]],
  "cutout-rear.png": [[687, 982, 291, 82]],
  "cutout-side.png": [[112, 498, 80, 30]],
  "three-quarter-hero.jpg": [[708, 1064, 176, 86]],
  "front-straight.jpg": [[613, 1316, 281, 80]],
};

async function paintOut(file, boxes) {
  const { data, info } = await sharp(path.join(ORIGINALS, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 4;
  for (const [bx, by, bw, bh] of boxes) {
    // Row by row, blend from the pixels just left of the box to those just right of it, so
    // horizontal body stripes / panel gradients carry straight across the hidden plate.
    for (let y = by; y < by + bh && y < H; y++) {
      const l = [0, 0, 0], r = [0, 0, 0];
      for (let k = 2; k <= 4; k++) {
        const li = px(bx - k, y), ri = px(bx + bw + k - 1, y);
        for (let c = 0; c < 3; c++) { l[c] += data[li + c] / 3; r[c] += data[ri + c] / 3; }
      }
      for (let x = bx; x < bx + bw && x < W; x++) {
        const t = (x - bx) / (bw - 1), i = px(x, y);
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(l[c] + (r[c] - l[c]) * t); // alpha untouched
      }
    }
  }
  const out = path.join(SRC, file);
  const png = file.endsWith(".png");
  let img = sharp(data, { raw: { width: W, height: H, channels: 4 } });
  // Feather: blend a lightly blurred copy back over the patched boxes only.
  const blurred = await img.clone().blur(2.5).raw().toBuffer();
  for (const [bx, by, bw, bh] of boxes) {
    for (let y = Math.max(0, by - 3); y < Math.min(H, by + bh + 3); y++) {
      for (let x = Math.max(0, bx - 3); x < Math.min(W, bx + bw + 3); x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] < 200) continue;
        data[i] = blurred[i]; data[i + 1] = blurred[i + 1]; data[i + 2] = blurred[i + 2];
      }
    }
  }
  img = sharp(data, { raw: { width: W, height: H, channels: 4 } });
  await (png ? img.png({ compressionLevel: 9 }) : img.removeAlpha().jpeg({ quality: 95, mozjpeg: true })).toFile(out);
  console.log("plate hidden:", file);
}

for (const f of await readdir(ORIGINALS)) {
  if (PLATES[f]) await paintOut(f, PLATES[f]);
  else await copyFile(path.join(ORIGINALS, f), path.join(SRC, f));
}

const jpg = { quality: 84, mozjpeg: true };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** [output, source, crop {left, top, width, height}] */
const crops = [
  // Hero / showcase photographic still: front three-quarter, timestamp (y > 1390) cropped out.
  ["hero.jpg", "three-quarter-hero.jpg", { left: 0, top: 300, width: 1156, height: 1020 }],
  // Front straight-on photo for gallery
  ["front.jpg", "front-straight.jpg", { left: 0, top: 330, width: 1199, height: 1090 }],
];

for (const [out, src, region] of crops) {
  await sharp(path.join(SRC, src)).extract(region).jpeg(jpg).toFile(path.join(OUT, out));
  console.log("wrote", out);
}

// Transparent studio cut-outs: trim empty transparent margins only.
for (const out of ["cutout-side.png", "cutout-front.png", "cutout-rear.png"]) {
  await sharp(path.join(SRC, out))
    .trim({ background: TRANSPARENT, threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, out));
  console.log("wrote", out);
}

// ---------- Blog cover images (editorial, composed on white/pale blue) ----------
// Real vehicle crops/cut-outs on the brand's light palette, each distinct. Marked as
// example imagery for business review (see content/blog frontmatter).
const COVER_W = 1600;
const COVER_H = 1000;
async function cover(out, { source, extract, lime = false, fit = "cover", pad = 0 }) {
  const grain = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_W}" height="${COVER_H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4EEF2"/>
        </linearGradient>
      </defs>
      <rect width="${COVER_W}" height="${COVER_H}" fill="url(#g)"/>
      ${lime ? `<rect x="0" y="0" width="6" height="${COVER_H}" fill="#F5B50A"/>` : ""}
    </svg>`,
  );
  let img = sharp(path.join(SRC, source));
  if (extract) img = img.extract(extract);
  const buf = await img
    .resize({ width: COVER_W - pad * 2, height: COVER_H - pad * 2, fit, position: "centre", background: TRANSPARENT })
    .toBuffer();
  await sharp(grain)
    .composite([{ input: buf, gravity: "centre" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, out));
  console.log("wrote", out);
}

await cover("blog-group-road-trip.jpg", { source: "three-quarter-hero.jpg", extract: { left: 0, top: 300, width: 1156, height: 1020 } });
await cover("blog-urbania-rental.jpg", { source: "cutout-front.png", fit: "contain", pad: 90, lime: true });
await cover("blog-family-checklist.jpg", { source: "front-straight.jpg", extract: { left: 0, top: 330, width: 1199, height: 1090 } });
await cover("blog-weddings-events.jpg", { source: "cutout-side.png", fit: "contain", pad: 70, lime: true });
await cover("blog-multiple-passengers.jpg", { source: "cutout-rear.png", fit: "contain", pad: 90, lime: true });

// ---------- Social sharing image (1200x630) in the v2 palette ----------
{
  const W = 1200;
  const H = 630;
  const van = await sharp(path.join(SRC, "cutout-side.png"))
    .trim({ background: TRANSPARENT, threshold: 1 })
    .resize({ width: 560 })
    .toBuffer();
  const vanMeta = await sharp(van).metadata();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0D5B70"/><stop offset="1" stop-color="#1D3A68"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="72" y="104" width="54" height="6" fill="#F5B50A"/>
    <text x="72" y="190" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="21" letter-spacing="5" fill="#F5B50A">OG TOURS AND TRAVELS</text>
    <text x="72" y="276" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="62" fill="#FFFFFF">GO BEYOND</text>
    <text x="72" y="346" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="62" fill="#FFFFFF">THE ORDINARY.</text>
    <text x="72" y="404" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#C3D7DF">Force Urbania group travel &amp; private vehicle hire</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: van, left: W - 560 - 40, top: Math.round(H / 2 - (vanMeta.height ?? 280) / 2 + 60) }])
    .jpeg({ quality: 88 })
    .toFile("public/og.jpg");
  console.log("wrote public/og.jpg");
}

// ---------- Brand mark -> icons (teal tile with an amber road line) ----------
{
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0D5B70"/><path d="M19 56 29.5 9h5L45 56Z" fill="#0A4558"/><path d="M32 14v8M32 27.5v10M32 43v13" stroke="#F5B50A" stroke-width="3.4" stroke-linecap="round" fill="none"/></svg>`;
  await writeFile("src/app/icon.svg", mark);
  await sharp(Buffer.from(mark), { density: 384 }).resize(180, 180).png().toFile("src/app/apple-icon.png");
  await sharp(Buffer.from(mark), { density: 384 }).resize(512, 512).png().toFile("src/app/icon.png");
  console.log("wrote icons");
}
