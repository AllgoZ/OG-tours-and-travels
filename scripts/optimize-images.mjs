// Builds the web-ready masters in src/assets/images from assets/originals.
// Crops only (no retouching) so the real vehicle and its registration are untouched.
// Camera timestamp overlays in the originals are removed by cropping them out of frame.
// next/image then produces the responsive AVIF/WebP sizes at build/request time.
//
// Run: npm run images
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "assets/originals";
const OUT = "src/assets/images";
await mkdir(OUT, { recursive: true });

const jpg = { quality: 84, mozjpeg: true };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** [output, source, crop {left, top, width, height}] */
const crops = [
  // Hero / showcase photographic still: front three-quarter, timestamp (y > 1390) cropped out.
  ["hero.jpg", "three-quarter-hero.jpg", { left: 0, top: 300, width: 1156, height: 1020 }],
  // Front straight-on photo for gallery
  ["front.jpg", "front-straight.jpg", { left: 0, top: 330, width: 1199, height: 1090 }],
  // Detail band: grille, headlamps and plate, timestamp (y > 1440) cropped out.
  ["front-detail.jpg", "front-straight.jpg", { left: 0, top: 900, width: 1199, height: 500 }],
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

// ---------- Blog cover images (editorial, composed on graphite) ----------
// Real vehicle crops/cut-outs on the brand's dark palette, each distinct. Marked as
// example imagery for business review (see content/blog frontmatter).
const COVER_W = 1600;
const COVER_H = 1000;
async function cover(out, { source, extract, lime = false, fit = "cover", pad = 0 }) {
  const grain = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_W}" height="${COVER_H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="#1B2028"/><stop offset="1" stop-color="#10141B"/>
        </linearGradient>
      </defs>
      <rect width="${COVER_W}" height="${COVER_H}" fill="url(#g)"/>
      ${lime ? `<rect x="0" y="0" width="6" height="${COVER_H}" fill="#C6F36B"/>` : ""}
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
      <stop offset="0" stop-color="#1B2028"/><stop offset="1" stop-color="#10141B"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="72" y="104" width="54" height="6" fill="#C6F36B"/>
    <text x="72" y="190" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="21" letter-spacing="5" fill="#C6F36B">OG TOURS AND TRAVELS</text>
    <text x="72" y="276" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="62" fill="#F5F6F8">GO BEYOND</text>
    <text x="72" y="346" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="62" fill="#F5F6F8">THE ORDINARY.</text>
    <text x="72" y="404" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#929BA8">Force Urbania group travel &amp; private vehicle hire</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: van, left: W - 560 - 40, top: Math.round(H / 2 - (vanMeta.height ?? 280) / 2 + 60) }])
    .jpeg({ quality: 88 })
    .toFile("public/og.jpg");
  console.log("wrote public/og.jpg");
}

// ---------- Brand mark -> icons (v2 palette: lime road line on midnight) ----------
{
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#10141B"/><path d="M19 56 29.5 9h5L45 56Z" fill="#232933"/><path d="M32 14v8M32 27.5v10M32 43v13" stroke="#C6F36B" stroke-width="3.4" stroke-linecap="round" fill="none"/></svg>`;
  await writeFile("src/app/icon.svg", mark);
  await sharp(Buffer.from(mark), { density: 384 }).resize(180, 180).png().toFile("src/app/apple-icon.png");
  await sharp(Buffer.from(mark), { density: 384 }).resize(512, 512).png().toFile("src/app/icon.png");
  console.log("wrote icons");
}
