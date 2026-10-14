// Interaction QA (v2): form validation + WhatsApp redirect (with date, time, all fields),
// FAQ, full-screen menu, contact bar, blog navigation, reduced motion, no-JS. Run against
// serve-qa.sh (real configured numbers).
//   node scripts/qa-interact.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const WA = "919159541288";
const TEL = "+918124012407";
let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? "  ✔" : "  ✖", msg);
  if (!cond) failures++;
};

const browser = await chromium.launch();

// ---------- Mobile: form, FAQ, menu, contact bar ----------
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  // Intercept the WhatsApp redirect so we can assert the URL without leaving the page.
  let captured = null;
  await page.route("https://wa.me/**", (route) => {
    captured = route.request().url();
    route.abort();
  });
  await page.goto(base, { waitUntil: "networkidle" });

  console.log("Trip form");
  await page.locator("#enquire").scrollIntoViewIfNeeded();
  ok(/until you press Send/i.test(await page.locator("#enquire").innerText()), "copy does not claim the enquiry was sent");
  await page.getByRole("button", { name: /send enquiry/i }).click();
  ok((await page.locator('[aria-invalid="true"]').count()) === 5, "empty submit flags all 5 required fields");
  ok(await page.locator("#trip-pickup").evaluate((e) => e === document.activeElement), "focus moves to first invalid field");
  ok(captured === null, "no redirect while invalid");

  await page.fill("#trip-pickup", "Chennai Central");
  await page.fill("#trip-destination", "Pondicherry");
  await page.fill("#trip-date", "2020-01-01");
  await page.fill("#trip-time", "08:30");
  await page.fill("#trip-passengers", "0");
  await page.getByRole("button", { name: /send enquiry/i }).click();
  ok((await page.locator("#trip-date-error").textContent())?.includes("past"), "past date rejected");
  ok((await page.locator("#trip-passengers-error").count()) === 1, "invalid passenger count rejected");
  ok((await page.inputValue("#trip-pickup")) === "Chennai Central", "input preserved after failed validation");
  ok(captured === null, "still no redirect while invalid");

  const future = new Date(Date.now() + 5 * 864e5);
  const pad = (n) => String(n).padStart(2, "0");
  const iso = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;
  await page.fill("#trip-date", iso);
  await page.fill("#trip-passengers", "10");
  await page.fill("#trip-requirements", "Two extra stops");
  await page.getByRole("button", { name: /send enquiry/i }).click();
  await page.waitForTimeout(400);
  ok(captured !== null && captured.startsWith(`https://wa.me/${WA}?text=`), "redirects to the correct WhatsApp number");
  const msg = decodeURIComponent(captured.split("?text=")[1]);
  ok(/Pickup Location: Chennai Central/.test(msg), "message has pickup");
  ok(/Destination: Pondicherry/.test(msg), "message has destination");
  ok(/Travel Date: /.test(msg) && /\d{4}/.test(msg), "message has travel date");
  ok(/Pickup Time: 8:30 AM/.test(msg), "message has pickup time");
  ok(/Number of Passengers: 10/.test(msg), "message has passenger count");
  ok(/Additional Requirements: Two extra stops/.test(msg), "message has additional requirements");

  // The aborted redirect may detach the document; reload to continue cleanly.
  await page.goto(base, { waitUntil: "networkidle" });

  console.log("FAQ");
  const q = page.getByRole("button", { name: /how is the rental price calculated/i });
  await q.scrollIntoViewIfNeeded();
  ok((await q.getAttribute("aria-expanded")) === "false", "collapsed by default");
  await q.focus();
  await page.keyboard.press("Enter");
  ok((await q.getAttribute("aria-expanded")) === "true", "Enter expands");
  await page.waitForTimeout(350);
  ok(await page.getByRole("region", { name: /how is the rental price calculated/i }).isVisible(), "answer visible when expanded");
  await page.keyboard.press("Space");
  ok((await q.getAttribute("aria-expanded")) === "false", "Space collapses");

  console.log("Mobile menu (full-screen)");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.waitForTimeout(450);
  ok(await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Vehicle" }).isVisible(), "menu opens with items");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok(
    await page.getByRole("button", { name: /open menu/i }).evaluate((e) => e === document.activeElement),
    "Escape closes and returns focus to toggle",
  );
  // reopen and navigate
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.waitForTimeout(450);
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Services" }).click();
  await page.waitForTimeout(500);
  ok((await page.getByRole("button", { name: /close menu/i }).count()) === 0, "menu closes after selecting a link");

  console.log("Contact bar");
  await page.evaluate(() => window.scrollTo(0, 0));
  const bar = page.getByRole("region", { name: /quick contact/i });
  ok(await bar.isVisible(), "visible on mobile");
  const box = await bar.boundingBox();
  ok(box.y + box.height <= 801 && box.height < 95, `compact (${Math.round(box.height)}px) and inside viewport`);
  ok((await bar.getByRole("link", { name: /call now/i }).getAttribute("href")) === `tel:${TEL}`, "tel: link uses the call number");
  ok(/^https:\/\/wa\.me\/919159541288/.test(await bar.getByRole("link", { name: /whatsapp/i }).getAttribute("href")), "WhatsApp link uses the WhatsApp number");
  await page.locator("#trip-pickup").scrollIntoViewIfNeeded();
  await page.focus("#trip-pickup");
  await page.waitForTimeout(300);
  ok((await bar.getAttribute("data-hidden")) === "true", "bar steps aside while a form field is focused");

  ok(errors.length === 0, "no console errors during interactions " + errors.join("|"));
  await ctx.close();
}

// ---------- Desktop: nav, gallery, blog ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  console.log("Desktop");
  ok(!(await page.getByRole("region", { name: /quick contact/i }).isVisible()), "contact bar hidden on desktop");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: "Vehicle" }).click();
  await page.waitForTimeout(1200);
  ok(
    await nav.getByRole("link", { name: "Vehicle" }).evaluate((e) => e.getAttribute("aria-current") === "page"),
    "active nav item follows section",
  );
  ok((await page.evaluate(() => getComputedStyle(document.querySelector("header")).position)) === "fixed", "header is fixed");
  const gal = page.getByRole("list", { name: /photo gallery/i });
  await gal.focus();
  ok(await gal.evaluate((e) => e === document.activeElement), "gallery is keyboard focusable");
  await page.getByRole("button", { name: /next photos/i }).click();
  await page.waitForTimeout(800);
  ok((await gal.evaluate((e) => e.scrollLeft)) > 100, "next button scrolls gallery");

  console.log("Blog");
  await page.goto(base + "/blog", { waitUntil: "networkidle" });
  ok((await page.locator("h1").innerText()).toLowerCase().includes("travel notes"), "blog index H1 present");
  const firstArticle = page.locator("article h3 a").first();
  await firstArticle.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(/\/blog\/[a-z0-9-]+$/, { timeout: 8000 }), firstArticle.click()]);
  ok(/\/blog\/[a-z0-9-]+$/.test(new URL(page.url()).pathname), "article link navigates to an article URL");
  ok((await page.locator("h1").count()) === 1, "article has exactly one H1");
  const toc = page.getByRole("navigation", { name: /on this page/i });
  ok(await toc.count() > 0, "article has a table of contents");
  // 404
  const res = await page.goto(base + "/blog/this-does-not-exist", { waitUntil: "networkidle" });
  ok(res.status() === 404, "unknown article returns HTTP 404");
  await ctx.close();
}

// ---------- Reduced motion ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  console.log("Reduced motion");
  ok((await page.evaluate(() => document.querySelectorAll('[data-reveal="hidden"]').length)) === 0, "no content hidden by scroll-reveal");
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector("h1 .word")).animationDuration);
  ok(parseFloat(dur) < 0.01, `hero word animation neutralised (${dur})`);
  await ctx.close();
}

// ---------- No JS ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base);
  console.log("No JavaScript");
  ok((await page.locator("h1").first().textContent()).includes("GO BEYOND"), "hero H1 present without JS");
  ok((await page.getByText("How is the rental price calculated?").count()) > 0, "FAQ content present in HTML");
  await page.goto(base + "/blog/plan-group-road-trip-tamil-nadu");
  ok((await page.getByText("Start with the group, not the destination").count()) > 0, "article body present in HTML (indexable)");
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} interaction check(s) failed.` : "\nAll interaction checks passed.");
process.exit(failures ? 1 : 0);
