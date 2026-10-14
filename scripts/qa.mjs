// Browser QA against a running production server (npm run build && npm start).
//   node scripts/qa.mjs [baseUrl] [screenshotDir]
// Checks each viewport for horizontal overflow, console errors, broken images, H1 count,
// dead/invalid links and axe violations, and saves full-page screenshots.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "qa-screenshots";
await mkdir(shots, { recursive: true });

const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440];
const browser = await chromium.launch();
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log("   ✖", msg);
};

for (const width of widths) {
  const height = width < 768 ? 800 : 900;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: width < 1024,
    isMobile: width < 768,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));

  console.log(`\n== ${width}px`);
  await page.goto(base, { waitUntil: "networkidle" });

  // Scroll through to trigger lazy images and reveals.
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += height * 0.7) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(600);
  // Wait for all images (incl. lazy below-the-fold) to finish before the broken-image check.
  await page
    .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 })
    .catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > doc.clientWidth + 1 && getComputedStyle(el).position !== "fixed") {
        // ignore content inside a horizontal scroller
        let p = el.parentElement;
        let scrolled = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "clip" || o === "hidden") scrolled = true;
          p = p.parentElement;
        }
        if (!scrolled) offenders.push(el.tagName + "." + String(el.className).slice(0, 60));
      }
    }
    // "broken" = finished loading but has no pixels. A still-loading image is not broken.
    const imgs = [...document.images].map((i) => ({
      src: i.currentSrc || i.src,
      ok: !i.complete || i.naturalWidth > 0,
    }));
    const links = [...document.querySelectorAll("a")].map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent.trim().slice(0, 40),
    }));
    const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      offenders: offenders.slice(0, 6),
      h1: document.querySelectorAll("h1").length,
      imgs,
      links,
      ids: [...ids],
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
      desc: document.querySelector('meta[name="description"]')?.content ?? null,
      ogImage: document.querySelector('meta[property="og:image"]')?.content ?? null,
      jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
    };
  });

  if (r.scrollW > r.clientW) fail(`horizontal overflow: scrollWidth ${r.scrollW} > ${r.clientW}`);
  if (r.offenders.length) fail(`elements past viewport edge: ${r.offenders.join(", ")}`);
  if (r.h1 !== 1) fail(`expected 1 <h1>, found ${r.h1}`);
  for (const i of r.imgs) if (!i.ok) fail(`broken image: ${i.src}`);
  for (const l of r.links) {
    const h = l.href;
    if (!h || h === "#") fail(`dead link "${l.text}" -> ${h}`);
    else if (h.startsWith("#")) {
      // same-page anchor: target must exist on this page
      const id = h.slice(1);
      if (id && !r.ids.includes(id)) fail(`anchor target missing: ${h}`);
    } else if (h.startsWith("/#")) {
      // cross-page anchor to the home page — target lives on "/", not here; not checked
    } else if (h.startsWith("tel:") && !/^tel:\+\d{8,15}$/.test(h)) fail(`bad tel link ${h}`);
    else if (h.startsWith("https://wa.me/") && !/^https:\/\/wa\.me\/\d{8,15}(\?text=.*)?$/.test(h)) fail(`bad wa.me link ${h}`);
  }
  if (width === widths[0]) {
    console.log("   title:", r.title);
    console.log("   description:", r.desc?.slice(0, 80) + "…");
    console.log("   canonical:", r.canonical, "| og:image:", r.ogImage, "| json-ld blocks:", r.jsonld);
    console.log("   links:", r.links.length, "| images:", r.imgs.length);
  }

  // Mobile menu opens (interaction details covered in qa-interact.mjs)
  if (width < 1024) {
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.waitForTimeout(450);
    const expanded = await page.getByRole("button", { name: /close menu/i }).getAttribute("aria-expanded");
    if (expanded !== "true") fail("menu toggle did not report aria-expanded=true");
    if (width === 375) await page.screenshot({ path: path.join(shots, `menu-${width}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // Accessibility scan
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  for (const v of axe.violations) {
    fail(`axe ${v.impact}: ${v.id} — ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target?.join(" ")}`);
  }

  if (errors.length) for (const e of [...new Set(errors)]) fail(`console: ${e}`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(shots, `full-${width}.png`), fullPage: true });
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s) found.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
