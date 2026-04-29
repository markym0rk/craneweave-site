# Craneweave site

Static site for craneweave.com. Hosted on GitHub Pages with Jekyll for the blog.

## Structure

```
.
├── index.html                          # Homepage (standalone, no Jekyll dependency)
├── _config.yml                         # Jekyll config
├── _layouts/
│   ├── default.html                    # Site-wide layout (nav, footer)
│   └── post.html                       # Blog post layout
├── _posts/
│   └── YYYY-MM-DD-slug.md              # Blog posts (write these in Markdown)
├── blog/
│   └── index.html                      # Blog listing page
└── README.md
```

## Writing a new post

1. Create a new file in `_posts/` named `YYYY-MM-DD-your-slug.md`
2. Add frontmatter at the top:

```markdown
---
title: Your post title
date: 2026-05-15
author: Mark Kim
author_role: Co-founder, Craneweave
description: One-sentence summary for SEO and social shares.
---

Your post content in Markdown.

## Section headings work

**Bold** and *italic* both render. [Links work too](https://example.com).

> Pull quotes get the editorial treatment.
```

3. Commit and push. GitHub Pages rebuilds automatically.
4. The post appears at `/blog/your-slug/` and on the blog index.

## Local preview (optional)

If you want to preview before pushing:

```bash
bundle install
bundle exec jekyll serve
```

Site runs at `http://localhost:4000`.

If you don't have Ruby installed, just push to GitHub — it'll build there. Local preview is convenience, not required.

## Deploying to GitHub Pages

1. Push this whole directory to a GitHub repo.
2. Repo settings → Pages → Build from `main` branch, root.
3. Add custom domain `craneweave.com` if pointed at GitHub via DNS.

## Cross-posting workflow

Publish on craneweave.com first. Wait 7–14 days. Then republish on LinkedIn Pulse with a "Originally published at craneweave.com" footer linking back to the canonical URL. This avoids duplicate content issues while capturing both surfaces.
