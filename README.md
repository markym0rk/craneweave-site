# craneweave.com

Expert coaching made effortless — admissions, recruiting, and AI coaching for teams.
Static site on GitHub Pages (Jekyll, custom domain via `CNAME`). Plain HTML; the only
Jekyll feature in use is `jekyll-redirect-from` on `index.html`.

## Pages

`/` · `/college/` · `/bsmd/` · `/mba/` · `/law/` · `/med/` · `/recruiting/` ·
`/organizations/` · `/programs/` · `/coaches/` · `/pricing/` · `/about/` · `/start/` ·
`/privacy/` · `/terms/`

`/start/` is the sign-up flow (three steps, persisted in `localStorage` under `cw.start`,
`noindex`). The home request widget, the college/BS-MD hero forms, the plan rows and the
pricing estimator all hand off into it with `?goal=…&stage=…` or `?plan=…`.

Old `/students/` and `/blog/…` URLs redirect to `/`.

## Design system

`assets/cw.css` — tokens first (`:root`), then components. No hex literals below the
tokens block; everything references custom properties.

- **Teal means "a human reviewed this."** The pen marks (`.pen`, `.circled`), the
  artifact sheet's underline and coach note, the signature chip, the turnaround label,
  the primary `.pen-btn`, and the one accent inside each drawing. Everything else is ink
  or graphite.
- **`.plate` is a frame, not a surface.** It has no fill, no radius and no clipping; the
  drawing inside is `object-fit:contain` and `mix-blend-mode:multiply`, so its white
  becomes whatever ground it sits on (page white, `.shade` grey, a `.ix` hover row). Two
  exceptions: `.cta-band .plate` is a white sheet with a radius, a shadow and
  `isolation:isolate`, because ink can't multiply onto the deep band; and
  `.hero-v .hero-plate` is a `--paper-shade` block that holds the artifact `.sheet`
  rather than a drawing.
- **Compositions, mixed per page and never centered:** overlap heroes (`.hero`,
  `.hero-v`, `.hero-plain.with-plate` — the plate bleeds to the viewport's right edge via
  `--bleed`; the h1 and the widget cross it, running text stays left of it), the asym grid
  (`.asym` — serif lead left, content right), full-width ruled indexes and broadsheets
  under a left-aligned heading row (`.sec-head`, `.index`, `.doclist`, `.plans`,
  `.season`), three-up image strips (`.strip`), alternating bands (`.band`).
- **Hairline rules, not boxes.** Borders and shadows are reserved for genuine controls
  (the request widget, choice buttons, menus) and the artifact `.sheet`, which is a
  document.
- Type: Newsreader (display, sentence case) · Public Sans (body/UI) · Courier Prime
  (inside artifact sheets only; loaded only on pages that have one).
- Motion tokens: `--ease-out`, `--ease-in-out`, `--ease-drawer`, `--t-*`. Everything
  respects `prefers-reduced-motion` (movement dropped, opacity kept).

`assets/cw.js` is the only script, and nothing depends on it to render: sticky nav +
mega-menus + drawer, pen marks and drawings revealed once in view, the request widget (accessible
listbox → stage → live estimate), FAQ, the pricing estimator, the `/start/` flow, the
intake forms, the mobile sticky CTA. `track()` fires funnel events into
`window.plausible` if a Plausible script is ever added; it is a no-op otherwise.

## Imagery

Hand-drawn dip-pen spot illustrations on white — New Yorker / Economist register, a
living slightly uneven line, no hatching or shading, one small teal accent per drawing
and nothing else coloured. Origami fold-arrows appear only on the hero crane (the final
fold: wings pulled down and apart); plain objects get no creases and no arrows.
`assets/img/` holds them as WebP (q90): three flush-right 16:9 overlap-hero crops
(`hero-wide` 1740×979 for `/`, `hero-coaches` and `hero-programs` 1600×900), with tight
4:3 fallbacks below 1000px via `<picture>` (`hero-crane`, `band-coaches`, `band-cohort`);
seven square thumbnails (`icon-*`, 640×640); the Match/Prepare/Review and
Baseline/Enroll/Coordinate/Report step scenes, the band drawings (`band-*`) and
`pricing-reviews` / `start-envelope` at 1200×900, every one cropped to ~9–11% margins so
the set shares one optical scale (strip scenes are bottom-anchored so baselines align);
and square crops for the square slots — `band-cohort-sq` 640×640 (homepage goal index,
programs CTA), `start-envelope-sq` 800×800 (CTA bands, `/start/` rail, about CTA),
`step-review-sq` 800×800 (coaches CTA). `og-default.png` is a crop of the hero crane. The
founders' photos are warm-graphite via CSS.

Because the drawings multiply onto the page, the white in the file must be true white and
the crops must be tight — there is no plate to hide a loose margin in. Only `.band`
drawings get breathing room, via `padding:4%` on the image.

Non-hero drawings fade in the first time they scroll into view: mark the plate
`<div class="plate" data-ink>` and cw.js adds `.drawn` once the image has decoded. Hero
plates deliberately carry no `data-ink` — they must be there at first paint. With no JS
the plates are simply visible; with `prefers-reduced-motion` they are marked drawn
immediately.

## Forms

Every intake (the `/start/` flow, hold-my-place, pilot proposal, cohort quote, coach
application) validates client-side and posts JSON to `CFG.FORM_ENDPOINT` in
`assets/cw.js`. **Until an endpoint is set, nothing is "received":** the page says so,
opens the visitor's mail app with the request pre-filled, and offers the text to copy.
Set `FORM_ENDPOINT` to a Formspree/Basin-style JSON endpoint before relying on leads.

## Checks

`python3 scripts/check_head_tags.py` — asserts every page has exactly one `<title>`,
meta description, canonical, and `og:url`; that canonical is the page's own URL and
equals `og:url`; and that no two pages share a title or description. CI runs it on every
push and PR (`.github/workflows/head-tags.yml`).

Local preview: `python3 -m http.server 8000` from the repo root (links are
root-relative). The front matter on `index.html` shows as text locally; Jekyll strips it
on deploy.

Nav and footer are repeated in all 15 files — an edit to either is a 15-file edit.
