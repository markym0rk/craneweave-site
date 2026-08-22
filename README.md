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
  the primary `.pen-btn`. Everything else is ink or graphite.
- **The plate** (`--plate`, cream) exists only behind the paper-craft imagery.
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
mega-menus + drawer, pen marks drawn once in view, the request widget (accessible
listbox → stage → live estimate), FAQ, the pricing estimator, the `/start/` flow, the
intake forms, the mobile sticky CTA. `track()` fires funnel events into
`window.plausible` if a Plausible script is ever added; it is a no-op otherwise.

## Imagery

`assets/img/` holds the paper-craft renders (generated with Meshy, exported as WebP):
the crane-on-manuscript hero, seven vertical thumbnails (`icon-*`), the
Match/Prepare/Review and Baseline/Enroll/Coordinate/Report step scenes, and the band
plates (`band-*`). `og-default.png` is a crop of the hero crane. The founders' photos are
warm-monochrome via CSS.

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
