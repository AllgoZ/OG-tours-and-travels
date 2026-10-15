# Supplied vehicle assets

`originals/` holds the untouched files supplied by the client (renamed for clarity, **not modified**).
Web-ready crops are generated from them by `npm run images` into `src/assets/images/`.

| Original (`assets/originals/`) | Web asset(s) | Placement |
|---|---|---|
| `three-quarter-hero.jpg` (WhatsApp Image …1.14.08 PM) | `hero.jpg` (crop; timestamp removed) | Vehicle gallery ("On the road"); `blog-group-road-trip.jpg` cover |
| `front-straight.jpg` (…1.14.07 PM (2)) | `front.jpg` | Gallery front photo; `blog-family-checklist.jpg` cover |
| `cutout-side.png` (Dark Gray Stag Graphic Minibus Cutout) | `cutout-side.png` (trimmed) | **Hero** (layered behind the headline); vehicle showcase; gallery; social image; `blog-weddings-events.jpg` cover |
| `cutout-front.png` (Urbania Van Front View) | `cutout-front.png` (trimmed) | Vehicle gallery ("Front"); `blog-urbania-rental.jpg` cover |
| `cutout-rear.png` (Dark Gray Force Urbania Rear Cutout) | `cutout-rear.png` (trimmed) | Vehicle gallery ("Rear"); `blog-multiple-passengers.jpg` cover; **featured blog cover** |
| `cutout-side.png` | `public/og.jpg` (generated 1200×630) | Open Graph / Twitter card image |
| `side-white-bg-UNUSED.png` (Dark Gray Urbania Van with Deer Decal) | — | **Not used**: duplicate of the side cut-out on a white background |
| `rear-side-UNUSED-third-party-branding.jpg` (…1.14.08 PM (1)) | — | **Not used**: lower-quality duplicate of the rear view |
| `three-quarter-roof-carrier-UNUSED-bystander.jpg` (…1.14.10 PM (3)) | — | **Not used**: a bystander is visible; roof-carrier tarp in shot |

## Notes on the rear cut-out

`cutout-rear.png` shows **"RRP Groups"** branding and three phone numbers on the right rear
window (one of which, 9159541288, is the configured WhatsApp number; 8124012407 is the call
number). The owner confirmed this image should be used **as supplied, unedited**. It appears
in the vehicle gallery and as the featured article cover.

## Rules followed

- Crops only, no retouching, no AI-generated vehicles: the real van (number plate painted out by `npm run images`) and
  decals are untouched.
- Camera timestamp overlays ("Galaxy S24 Ultra / date") were removed by cropping them out of frame.
- The vehicle is never cropped at the front, wheels or roof: cut-outs are shown contained
  (`object-fit: contain`) and photos at their natural aspect ratio.
- Responsive AVIF/WebP delivery and dimensions are handled by `next/image`.
- Blog cover images are generated composites of the real van on the brand's dark palette; they
  are example imagery and the posts they belong to are flagged for business review.
- The original `reference/` folder at the project root is left as supplied.

Regenerate everything with `npm run images`.
