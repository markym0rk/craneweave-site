# craneweave.com

Expert coaching made effortless — a managed coaching platform for applications, recruiting, and AI
skills. Static site on GitHub Pages (Jekyll, custom domain via `CNAME`). Plain HTML; the only Jekyll
feature in use is `jekyll-redirect-from` on `index.html`.

The full specification is `../craneweave-design-system.md`; the copy's source of truth is
`../craneweave-next-site-copy.md`. This file is the map.

## Architecture — two paths, 18 pages

| Path | Overview | Under it |
|---|---|---|
| Students and applicants | `/students/` | `/college/` `/bsmd/` `/mba/` `/law/` `/med/` `/recruiting/` `/programs/` |
| Professionals and teams | `/professionals/` | `/ai-coaching/` `/organizations/` (+ `/recruiting/`, cross-listed) |

Plus `/` · `/coaches/` · `/pricing/` · `/about/` · `/start/` · `/privacy/` · `/terms/`.

Nav is two mega-menus ("Students and applicants" 8 items, "Professionals and teams" 4) with 56px drawn
thumbnails and a `.menu-foot` escape hatch, then Coaches / Pricing / About / Help. The burger appears at
≤1100px; the layout collapse and the sticky bar come at ≤1000px. The footer carries 8 + 3 + 4 + 4 links,
the first column running in two sub-columns at ≥1101px. **Nav, drawer, footer and sticky bar are
repeated in all 18 files — an edit to any of them is an 18-file edit.**

## The funnel

Everything is **pre-launch**: no page takes money. The funnel is a reservation — "No payment today",
"You'll review your coach match and expected start date before enrolling."

- **Individuals** pick a plan: Core $299/month (4 reviews, 72-hour), Plus $499/month (7 reviews,
  48-hour, priority matching), Five-Month Plan $1,999 (30 reviews across five months).
- **Teams** reserve a pilot (`/organizations/#pilot`); **programs** reserve a student cohort
  (`/programs/#cohort`). Both get a written scope and price.

`/start/` is the reservation flow — four paths (student · professional · team · program), three steps,
persisted in `localStorage` under `cw.start`, `noindex`. It reads `?path=`, `?goal=`, `?stage=`,
`?plan=`, `?email=`, jumps to the furthest justified step, and clears the query string with
`history.replaceState`. `/students/`'s goal picker, the vertical pages' plan rows and the pricing
estimator all hand off into it. `/ai-coaching/`, `/organizations/`, `/programs/` and `/coaches/` post
their own forms instead and never touch `/start/`.

Each route's nav / drawer / sticky CTA points at the same destination with the same words; the drawer
and sticky buttons take `.pen-btn` only when that destination actually enters the funnel.

## Design system

`assets/cw.css` (1,030 lines) — tokens first (`:root`), then components, then a "Platform architecture"
block at the end. No hex literals below the tokens block; everything references custom properties.

- **Teal means "a human reviewed this."** The pen marks, the artifact sheet's underline and coach note,
  the signature `.chip` and the hollow `.chip.seat` (a coach not yet matched), the turnaround label, the
  primary `.pen-btn`, and the one accent inside each drawing. Everything else is ink or graphite.
  `.pen-btn` is reserved for links that enter the funnel (`/start/`, `#reserve`, `#pilot`, `#cohort`,
  `#apply`); in-page anchors use the ink `.btn`.
- **`.plate` is a frame, not a surface.** No fill, no radius, no clipping; the drawing inside is
  `object-fit:contain` and `mix-blend-mode:multiply`, so its white becomes whatever ground it sits on.
  Two exceptions: `.cta-band .plate` is a white sheet with a radius and a shadow (ink can't multiply
  onto the deep band), and `.desk .desk-bg` is an absolutely-positioned drawn desk with the artifact
  `.sheet` sitting on top of it as a sibling.
- **Compositions, mixed per page and never centered:** overlap heroes (`.hero`, `.hero-v`,
  `.hero-plain.with-plate` — the plate bleeds to the viewport's right edge via `--bleed`), the asym grid
  (`.asym`), the homepage `.path-grid` (two `.path-card`s over one ink rule), `.system-grid` (four-up,
  bottom-anchored drawings), `.strip` (three-up, drawings bottom-anchored the same way),
  `.asym` + `.plate.desk.wide` (the artifact on a drawn desk — there is no `.sample` class),
  `.cols2`, alternating `.band`s, and full-width ruled lists (`.plans`, `.doclist`,
  `.ruled` / `.ruled-plain` / `.ruled-inline`, `.season`, `.report`, `.bios`).
- **Newer components:** `.status` eyebrow (serif-italic "Now reserving launch spots" with a still ink
  dot — not tracked uppercase), `.crumb` breadcrumb (`nav > ol`, CSS `→`, on every page except `/`,
  `/start/`, `/privacy/` and `/terms/`),
  `.h3-display` (the one display step above the 24/28 h3 scale), `.choice.desc` + `legend.q`,
  `.goal-picker` + `[data-plans-gate]`/`[data-plans-empty]`, `.audience` + cross-fading `.aud-panel`s,
  `.plan-opts`, `.stage-pick`, `.cta-lede` / `.cta-note` / `.btn.ghost-light`, `.plain.callout`,
  `.label.dim`. The `.status` eyebrow is on the 14 pages that sell a coaching spot — everything but
  `/coaches/`, `/start/`, `/privacy/` and `/terms/`; `/coaches/` is the one page with a crumb and no
  eyebrow, because its reader is a coach applying, not a client reserving.
- **Hairline rules, not boxes.** Borders and shadows are reserved for genuine controls (inputs, menus,
  choice cards, option pills, steppers) and the artifact `.sheet`, which is a document.
- Type: Newsreader (display, sentence case) · Public Sans (body/UI) · Courier Prime (inside artifact
  sheets only; loaded only on the nine pages that have one).
- Motion tokens: `--ease-out`, `--ease-in-out`, `--ease-drawer`, `--t-*`. `--t-swap` (180ms) powers the
  `.swapping` release on live values. Everything respects `prefers-reduced-motion` (movement dropped,
  opacity kept).

`assets/cw.js` (701 lines) is the only script, and nothing depends on it to render. Eight sections:
1 nav + mega-menus + drawer · 2 marks, sheets and ink drawings revealed once in view (hero sheets draw
on `fonts.ready`; siblings in a row stagger 60ms) · 3 page pickers (`/students/` goal → stage → plans,
the vertical `#stage-pick`, `/professionals/` audience, `/ai-coaching/` plan) · 4 FAQ · 5 pricing
estimator · 6 the `/start/` reservation · 7 intake forms · 8 mobile sticky CTA. `track()` fires funnel
events into `window.plausible` if a Plausible script is ever added; it is a no-op otherwise.

## Imagery

Hand-drawn dip-pen spot illustrations on white — New Yorker / Economist register, a living slightly
uneven line, no hatching or shading, **one small teal accent per drawing** and nothing else coloured.
Origami fold-arrows appear only on the hero crane; plain objects get no creases and no arrows. Because
the drawings multiply onto the page, the white in the file must be true white and the crops must be
tight — there is no plate to hide a loose margin in. `assets/img/` holds 42 WebP (q90) files:

- **Heroes** — five flush-right 16:9 crops at 1600×900 (`hero-students`, `hero-professionals`,
  `hero-ai`, `hero-coaches`, `hero-programs`) plus `hero-wide` 1740×979 for `/`, each with a tight 4:3
  fallback below 1001px via `<picture>` (`scene-students`, `scene-professionals`, `scene-ai`,
  `band-coaches`, `band-cohort`, `hero-crane`).
- **Desk backdrops** — eight 1200×900 letterboxed drawings (`desk-review`, `desk-college`, `desk-bsmd`,
  `desk-mba`, `desk-law`, `desk-med`, `desk-recruiting`, `desk-ai`) that sit behind the artifact sheet.
  One object top right, one bottom right, a pen or pencil bottom left; the centre and top-left are empty
  white, no desk edge, no frame, nothing touching the trim — the sheet must cover only empty desk.
  `alt=""`. **Both desks hide at the same line, ≤1340px** — below it a `.hero-v` falls back to the
  rounded `--paper-shade` plate and a `.plate.desk.wide` is just its sheet. The hero desk is delivered
  through a `<picture>` gated on `(min-width: 1341px)` (the `<img>` `src` is a 1×1 GIF data-URI), so
  narrower viewports fetch nothing. Where the desk is drawn the sheet is `min(400px,62%)` of the wide
  plate, so the drawing reads as a surface the sheet lies on rather than a border around it.
- **Icons and path thumbnails** — eleven 800×800 squares (`path-students`, `path-professionals`,
  `icon-college/-bsmd/-mba/-law/-med/-recruiting/-ai/-org/-cohort`), cropped with ~11% padding, running
  at 56px in menus and choice cards, 150px in a `.path-card`, up to 440px in a CTA plate.
- **Scenes** — `step-match`, `step-prepare`, `step-review`, `step-report`, `step-baseline`,
  `step-coordinate`, `band-org`, `pricing-reviews` at 1200×900, bottom-anchored in strips and system
  grids so the baselines align; plus the square crops `step-review-sq`, `start-envelope-sq` and
  `hero-crane-sq` at 800×800.

The generation and post-processing pipeline lives **outside the repo** (a scratchpad script driving
Meshy `nano-banana-pro`); originals stay outside and only the finished WebP is committed. Prompt
templates, crop rules and the per-drawing QA checklist are in §9 of the design-system doc.

Non-hero drawings fade in the first time they scroll into view: mark the plate
`<div class="plate" data-ink>` and cw.js adds `.drawn` once the image has decoded. Hero plates and
`.desk-bg` images deliberately carry no `data-ink` — they must be there at first paint. With no JS the
plates are simply visible; with `prefers-reduced-motion` they are marked drawn immediately.

## Forms

Every intake (the `/start/` flow, `#ai-intake`, `#pilot-form`, `#cohort-plan`, `#apply-form`) validates
client-side and posts JSON to `CFG.FORM_ENDPOINT` in `assets/cw.js`. Fields carry `data-required` and a
per-field `data-err` message, and a corrected field clears its own error as you type; a failed radio
group marks every radio in it `aria-invalid`. While a form is sending it takes a `data-sending`
attribute (the double-submit guard) and its button takes `aria-busy="true"`, which **only dims** — the
button is never disabled and never loses pointer events. **Until an endpoint is set, nothing is
"received":** the page says so, opens the visitor's mail app with the request pre-filled, and offers the
text to copy.

## Adding a page

1. Copy the head block from the nearest sibling and give it a **unique** `<title>`, description,
   canonical and `og:url` (canonical == `og:url` == the page's own URL).
2. Add it to `REQUIRED` in `scripts/check_head_tags.py` and to `sitemap.xml`.
3. Add it to the two mega-menus, the drawer and the footer as appropriate — an 18-file edit — and set
   its route CTA in the nav, drawer and sticky bar.
4. Give it a `.crumb` (every page has one but `/`, `/start/`, `/privacy/` and `/terms/`), and a
   `.status` eyebrow if a plan or a pilot is chosen on it.
5. Only load `Courier+Prime` if the page has an artifact `.sheet`.

## Checks

`python3 scripts/check_head_tags.py` — asserts every page has exactly one `<title>`, meta description,
canonical, and `og:url`; that canonical is the page's own URL and equals `og:url`; and that no two pages
share a title or description. Its `REQUIRED` list names all 18 pages, and any other `*/index.html` found
on disk is checked too. CI runs it on every push and PR (`.github/workflows/head-tags.yml`).

Local preview: `python3 -m http.server 8000` from the repo root (links are root-relative). The front
matter on `index.html` shows as text locally; Jekyll strips it on deploy.

## Pending

- **`CFG.FORM_ENDPOINT` is empty.** Set it to a Formspree/Basin-style JSON endpoint in `assets/cw.js`
  before relying on leads; until then every submission falls back to email.
- **No analytics script is loaded.** `track()` is a no-op until a Plausible-style `window.plausible`
  exists on the page. Events already wired: `goal_pick`, `audience_pick`, `plan_pick`, `faq_open`,
  `estimator_click`, `start_step`, `start_done`, `start_fallback`, `form_done`, `form_fallback`,
  `sticky_click`.
