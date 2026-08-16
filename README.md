# craneweave.com

Founder-led college admissions coaching — undergrad program with a BS/MD special track.
Static Jekyll site on GitHub Pages (custom domain via `CNAME`).

## Pages

| Path | Purpose |
|---|---|
| `/` | Families conversion page (price-variant tested) |
| `/bsmd/` | BS/MD track — premium price, no variants |
| `/coaches/` | Coach supply page + application form |
| `/privacy/`, `/terms/` | Minors' data policy · deposit/refund terms |

Old B2B URLs (`/about/`, `/blog/…`) redirect to `/` via `jekyll-redirect-from`
(front matter on `index.html`).

## Checks

`python3 scripts/check_head_tags.py` — asserts every page has exactly one
`<title>`, meta description, canonical, and `og:url`; that `og:url` equals the
canonical; that the canonical is the page's own URL; and that no two pages share
a title or a description. Run it after any content pass. CI runs it on every
push and PR (`.github/workflows/head-tags.yml`).

## How the price test works

`assets/site.js` assigns each first-time visitor one of **$199 / $299 / $449**
(uniform random), persists it in `localStorage` + cookie (`cw_px_v`), and paints it
into every `[data-price]` element. `[data-price-bsmd]` renders variant + $100.
`/bsmd/` is priced flat at $399 in its HTML — it is the premium, no-variant test.
Every analytics event is stamped with `{variant, page, src}`.

## Before pushing traffic — fill these in

In `assets/site.js` (`CFG` at the top):

- `STRIPE_LINK` / `STRIPE_LINK_BSMD` — Stripe Payment Links for the $50 deposit.
  Until set, the reserve form falls back to a mailto to `team@craneweave.com`.
- `FORM_ENDPOINT` — endpoint (e.g. Formspree) for interest capture + coach applications.

Also add an analytics script (Plausible or GA4) to each page's `<head>` —
`site.js` auto-forwards events to `plausible()`/`gtag()` when present.

And replace the founder admissions-history lines marked `TODO(founders)` in
`index.html` and `bsmd/index.html` with the real one-liners.
