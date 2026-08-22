#!/usr/bin/env python3
"""Assert the head tags every page must get exactly right.

Run from anywhere:  python3 scripts/check_head_tags.py
Exit status 0 = all good, 1 = at least one failure (prints every failure).

This exists because title/description/canonical/og:url drift is invisible in
review: a copy-pasted head looks fine on the page and only shows up as
duplicate-content or wrong-URL sharing after deploy. The checks are:

  1. Every page in REQUIRED is still on disk (catches a deleted/renamed page).
  2. Each page has EXACTLY ONE <title>, meta description, canonical, og:url,
     and none of them is empty.
  3. og:url == canonical on every page.
  4. canonical == https://craneweave.com/<the page's own directory>/ — the
     check that actually catches a head pasted from another page.
  5. Titles are unique across pages; descriptions are unique across pages.

Adding a page: drop it in REQUIRED. Any other index.html found on disk is
checked too, so a new page cannot ship unchecked.
"""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://craneweave.com"

ROOT = Path(__file__).resolve().parent.parent

# The twelve content pages plus the two legal pages (the v3 sitemap). Every one of these must
# exist; anything else matching */index.html is checked as well.
REQUIRED = [
    "index.html",
    "college/index.html",
    "bsmd/index.html",
    "mba/index.html",
    "law/index.html",
    "med/index.html",
    "recruiting/index.html",
    "organizations/index.html",
    "programs/index.html",
    "coaches/index.html",
    "pricing/index.html",
    "about/index.html",
    "privacy/index.html",
    "terms/index.html",
    "start/index.html",
]

SKIP_DIRS = {"node_modules", "vendor", "_site", ".git", ".github", "assets", "scripts"}


class Head(HTMLParser):
    """Collect the four head tags. Stops reading at </head>."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titles: list[str] = []
        self.descriptions: list[str] = []
        self.canonicals: list[str] = []
        self.og_urls: list[str] = []
        self._in_title = False
        self._done = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._done:
            return
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "title":
            self._in_title = True
            self.titles.append("")
        elif tag == "meta":
            if a.get("name", "").lower() == "description":
                self.descriptions.append(a.get("content", "").strip())
            elif a.get("property", "").lower() == "og:url":
                self.og_urls.append(a.get("content", "").strip())
        elif tag == "link":
            rels = a.get("rel", "").lower().split()
            if "canonical" in rels:
                self.canonicals.append(a.get("href", "").strip())

    handle_startendtag = handle_starttag

    def handle_data(self, data: str) -> None:
        if self._in_title and self.titles:
            self.titles[-1] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "head":
            self._done = True


def expected_canonical(rel_path: str) -> str:
    """https://craneweave.com/ for index.html, .../slug/ for slug/index.html."""
    directory = rel_path[: -len("index.html")]
    return f"{SITE}/{directory}"


def pages() -> list[str]:
    found = {p.relative_to(ROOT).as_posix() for p in ROOT.glob("*/index.html")
             if p.parent.name not in SKIP_DIRS}
    if (ROOT / "index.html").is_file():
        found.add("index.html")
    return sorted(found | set(REQUIRED))


def main() -> int:
    failures: list[str] = []
    titles: dict[str, str] = {}
    descriptions: dict[str, str] = {}

    for rel in pages():
        path = ROOT / rel
        if not path.is_file():
            failures.append(f"{rel}: page is missing from disk")
            continue

        parser = Head()
        parser.feed(path.read_text(encoding="utf-8"))

        for label, values in (
            ("<title>", parser.titles),
            ('<meta name="description">', parser.descriptions),
            ('<link rel="canonical">', parser.canonicals),
            ('<meta property="og:url">', parser.og_urls),
        ):
            if len(values) != 1:
                failures.append(f"{rel}: expected exactly one {label}, found {len(values)}")
            elif not values[0].strip():
                failures.append(f"{rel}: {label} is empty")

        if len(parser.canonicals) == 1 and len(parser.og_urls) == 1:
            canonical, og_url = parser.canonicals[0], parser.og_urls[0]
            if canonical != og_url:
                failures.append(
                    f"{rel}: og:url != canonical\n"
                    f"    canonical: {canonical}\n"
                    f"    og:url:    {og_url}"
                )

        if len(parser.canonicals) == 1:
            want = expected_canonical(rel)
            if parser.canonicals[0] != want:
                failures.append(
                    f"{rel}: canonical does not match this page's own URL\n"
                    f"    found:    {parser.canonicals[0]}\n"
                    f"    expected: {want}"
                )

        if len(parser.titles) == 1:
            titles[rel] = " ".join(parser.titles[0].split())
        if len(parser.descriptions) == 1:
            descriptions[rel] = " ".join(parser.descriptions[0].split())

    for label, values in (("title", titles), ("description", descriptions)):
        seen: dict[str, str] = {}
        for rel, value in values.items():
            if value in seen:
                failures.append(
                    f"{rel}: {label} is identical to {seen[value]}'s\n"
                    f"    {value}"
                )
            else:
                seen[value] = rel

    checked = len([r for r in pages() if (ROOT / r).is_file()])
    if failures:
        print(f"FAIL — {len(failures)} problem(s) across {checked} page(s):\n")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"OK — {checked} pages: one each of title/description/canonical/og:url, "
          f"canonicals match their own URLs, og:url == canonical, "
          f"all titles and descriptions unique.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
