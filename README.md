# craneweave.com

Expert coaching made effortless — admissions, recruiting, and AI coaching for teams.
Static site on GitHub Pages (Jekyll, custom domain via `CNAME`). Plain HTML; the only
Jekyll feature in use is `jekyll-redirect-from` on `index.html`.

## Pages

`/` · `/college/` · `/bsmd/` · `/mba/` · `/law/` · `/med/` · `/recruiting/` ·
`/organizations/` · `/programs/` · `/coaches/` · `/pricing/` · `/about/` ·
`/privacy/` · `/terms/`

Old `/students/` and `/blog/…` URLs redirect to `/`.

## Design system

`assets/cw.css` — tokens first (`:root`), then components. No hex literals below the
tokens block; everything references custom properties.

- **Teal means "a human reviewed this."** Coach annotations and their underlines,
  signature chips, the primary CTA, coach-voice quotes. Nowhere else.
- **Tracked uppercase means "a person's name or a document's label."** Bylines and
  artifact-sheet labels only.
- Type: Newsreader (display, sentence case) · Public Sans (body/UI) · Courier Prime
  (only inside artifact sheets, for submitted work).
- The one shadow is the paper lift on sheets; the only animations are the artifact
  underline draw and ≤150ms hover transitions.

`assets/cw.js` is the only script, and nothing depends on it to render: hero mark,
artifact underline (IntersectionObserver, once), goal-picker routing, intake forms.

Text in `[square brackets]` is a placeholder for a real fact — grep for `[` to find
what still needs filling in.

## Forms

Every intake form (find your coach, hold my place, pilot proposal, cohort quote, coach
application) validates client-side and then posts JSON to `CFG.FORM_ENDPOINT` in
`assets/cw.js`. Until an endpoint is set, submission opens a pre-filled email to
`team@craneweave.com`; without JavaScript the form itself falls back to `mailto:`.

## Checks

`python3 scripts/check_head_tags.py` — asserts every page has exactly one `<title>`,
meta description, canonical, and `og:url`; that canonical is the page's own URL and
equals `og:url`; and that no two pages share a title or description. CI runs it on every
push and PR (`.github/workflows/head-tags.yml`).

Local preview: `python3 -m http.server 8000` from the repo root (links are
root-relative). The front matter on `index.html` shows as text locally; Jekyll strips it
on deploy.
