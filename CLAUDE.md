# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static portfolio site for actor/singer/voice-over artist Virginia Thorn. Plain HTML, one CSS file, one JS file, self-hosted fonts/images/audio. No framework, no bundler, no package.json, no tests, no linter. Everything that ships lives in `public/`; the repo root only holds Firebase config, the deploy workflow, README and LICENSE (all rights reserved, the copy and media belong to the client).

## Commands

There is no build step. Preview by serving `public/` with any static server:

```bash
cd public && python -m http.server 8765 --bind 127.0.0.1
# or, to get Firebase's cleanUrls behaviour (/bio instead of /bio.html):
firebase serve
```

Deploy happens automatically: every push to `main` runs `.github/workflows/deploy-production.yml`, which deploys `public/` to Firebase Hosting project `virginia-thorn` (live channel). Manual equivalent: `firebase deploy --only hosting`.

Useful sanity checks, since nothing runs automatically:

```bash
node --check public/script.js
python -c "s=open('public/styles.css').read();print(s.count('{'),s.count('}'))"   # must match
gitleaks detect --source . -v      # same scan CI runs; full history, not just the working tree
```

`.github/workflows/secret-scan.yml` runs gitleaks over the whole history on every push and PR and weekly. The repo is public on GitHub, so treat anything committed as published; `.gitignore` already excludes `.env*`, key/certificate files, Firebase service-account JSON and `.claude/`.

## Hosting state (easy to get wrong)

- `virginiathorn.com` still points at the old Squarespace site. The Firebase build is only reachable at `https://virginia-thorn.web.app` until DNS is switched. Verify changes there or locally, never on the main domain.
- `firebase.json` sets `cleanUrls: true`, so on Firebase `/bio.html` 301s to `/bio`. Internal links, `<link rel="canonical">` and `sitemap.xml` all still use `.html`; it works, but keep them consistent if you change one.
- `firebase.json` also sets long cache headers: CSS/JS/HTML 7 days, images 30 days, fonts and MP3s 1 year immutable. There is no cache-busting, so returning visitors can see stale CSS/JS for up to a week after a deploy.
- `firebase.json` header rules merge: Hosting applies every rule whose glob matches the request (later rules override same-named keys), so the `**` security-header rule (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) combines with the per-type cache rules. HSTS is added by Firebase itself. Note the globs match the request path, so clean URLs like `/bio` are only covered by `**`, not by `**/*.html`. The local Hosting emulator does not emit these headers at all, so verify them on the deployed URL.

## Architecture

### Pages are hand-duplicated, not templated

18 pages: `index.html`, seven top-level pages (`bio`, `reels`, `headshots`, `music`, `voiceover`, `projects`, `contact`), `cv.html` (noindex, disallowed in `robots.txt`), `404.html`, and eight detail pages in `public/projects/` that reference assets with `../`. Every page repeats the same chrome by copy: page-transition curtains, preloader, `nav#navbar` with `.nav-links`, `#navToggle` and the separate `#navMobile` overlay, then a `.page-hero` (sub-pages) or the split `.hero` (index only), sections, footer, optional lightbox markup, and `<script src="script.js">`. A change to the nav, footer, or head meta has to be applied to all 18 files; the mobile nav is a second copy of the links inside each file. Sub-pages hardcode `class="nav scrolled"` and `class="nav-link active"`; the index nav is transparent and gains `.scrolled` on scroll.

Adding a page means: create it with the full chrome, add it to both nav lists in every page, add it to `sitemap.xml`, and update `llms.txt` if it is a real section.

### styles.css is two layers, and source order matters

Roughly the first 2,250 lines are the design system (`:root` tokens for colours, type scale, spacing, radii, shadows, transitions), components, and the responsive blocks. After that comes an "enhancement" layer (page-transition curtain, enhanced hero keyframes, custom cursor, particles, reveal variants, animated gradient card borders, button ripple/glow, footer entrance, and a second `@media (max-width: 768px)` block near the very end). Later rules override earlier ones at equal specificity, so before adding a responsive override check the trailing blocks; the breakpoints in use are 1180, 1100, 1024, 960, 768, 640 and 480. Always use the `:root` tokens rather than raw values.

### Entrance animations are a contract between CSS and script.js

Several classes start at `opacity: 0` and only become visible when something else adds a trigger class:

- `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale`, `.reveal-blur` get `.visible` from an IntersectionObserver in `script.js`.
- `.hero-*` elements animate only once `.hero.loaded` is set, which happens when the preloader is dismissed (window `load` + 400ms, with a 2.5s fallback).
- `.footer .nav-logo`, `.footer .footer-social`, `.footer .footer-copy` animate only under `.footer.visible`.
- `.page-hero-title` and `.page-hero .section-label` animate purely in CSS on load.

Reusing one of these classes outside its trigger leaves the element permanently invisible (this happened with `.footer-social` on the contact page). The `prefers-reduced-motion` block forces everything visible, which is also the trick for honest headless screenshots: plain `chrome --headless --screenshot` captures titles and reveals at opacity 0 and stretches the `100vh` hero to the window height, so emulate reduced motion, wait for `.preloader.hidden`, scroll through the page, then take a full-page shot (puppeteer-core with the installed Chrome works).

### script.js feature modules and the markup they expect

One `DOMContentLoaded` block with independent modules: nav scroll/toggle, reveal observers, smooth anchor scroll, custom cursor and 3D card tilt (desktop, non-touch, width > 768 only), `[data-parallax]`, floating particles, button ripple and magnetic hover, and a page-transition that intercepts clicks on relative internal links and delays navigation by 400ms (a `pageshow` handler cleans up after back/forward cache restores). Two things have markup contracts:

- Custom audio player: `.audio-card.vo-audio-card[data-src]` containing `.player-btn` with `.player-icon-play` / `.player-icon-pause`, `.player-progress > .player-progress-fill`, and `.player-time`. Audio objects are created lazily with `preload = 'none'`; only one card plays at a time.
- Lightbox: global `openLightbox(el)` / `closeLightbox()` are called from inline `onclick`. `el` may be a wrapper containing an `<img>` or the `<img>` itself. Any page that uses them must include the `#lightbox` / `#lightboxImg` markup before `script.js`.

The contact form is markup only: there is no `<form>` element, no action and no backend, so the submit button does nothing. Bookings go through the Spotlight link.

## Working conventions

- **Never delete content.** Copy, credits, images and outbound links are the client's material. Design, layout, CSS and markup restructuring are welcome; removing a paragraph, image or link is not. Before finishing a design change, diff the visible text, `src` list and `href` list of each edited page against `git HEAD` and confirm they are identical.
- Files in the working copy are CRLF (git autocrlf). Scripts that rewrite files should preserve or restore CRLF, otherwise every line shows as changed and git warns on each file.
- Commit messages should not carry a `Co-Authored-By` trailer.
- Keep `.claude/`, `.env` files and `firebase-debug*.log` out of version control (README guidance; the Firebase logs are already in `.gitignore`).
