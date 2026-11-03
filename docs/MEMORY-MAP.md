# Memory map

Where everything lives and how the pieces fit, so a new chat can find its way without reading the whole codebase. Read only the section the task needs. When something described here changes, update this file in the same change.

## Repository layout

| Path | What it is |
| --- | --- |
| `public/` | The website. Everything in it is deployed, so never leave scratch files here. |
| `docs/` | This map, `WEBSITE-PREFERENCES.md`, `GETTING-STARTED.md`, and `screenshots/` for the README (not deployed). |
| `scripts/` | `check.js` (the checks GitHub runs before every deploy; optional locally), `static-server.js` (a tiny server for `public/`), `serve.js` (`npm run serve`). Not deployed. |
| `package.json`, `package-lock.json` | npm scripts `check`, `check:smoke` and `serve`; one dev dependency, puppeteer-core 24.43.1, used only by the optional browser test (it drives the installed Chrome and downloads no browser). `node_modules/` is git-ignored. Not deployed. |
| `firebase.json`, `.firebaserc` | Hosting settings (clean URLs, cache and security headers) and the project alias `virginia-thorn`. |
| `.github/workflows/` | `deploy-production.yml` runs a `check` job (`node scripts/check.js`) first and deploys `public/` only if it passes, on every push to `main`; `secret-scan.yml` runs gitleaks over the full history on every push and pull request, weekly, and on demand. |
| `README.md`, `LICENSE` | Public description of the repo; all rights reserved, because the copy and media belong to the client. |
| `skills-lock.json` | Lock file for the Firebase agent skills; not part of the site. |

There is no bundler or test suite; `package.json` exists only for the optional local tools described under "Checks and the deploy gate".

## Pages

20 hand-written HTML pages in `public/`:

| Page | Notes |
| --- | --- |
| `index.html` | Home. The only page with the split `.hero` and a nav that starts transparent. |
| `bio`, `reels`, `headshots`, `music`, `voiceover`, `projects`, `contact` | The seven menu sections (`.html`). |
| `privacy.html` | The privacy policy: indexed and in the sitemap, linked from every footer, not in the menu. |
| `best-voice-over-artist-uk.html` | Landing page for UK voice-over search (see "Landing page for UK voice-over search"). |
| `projects/*.html` | Eight project pages: `arts-council`, `in-your-dreams`, `kindertransport`, `nhs-roleplay`, `out-of-this-world`, `philips-hue`, `savage-in-limbo`, `truth-lies`. They sit one folder down, so every asset, stylesheet and script path starts with `../`. |
| `cv.html` | Noindex, disallowed in `robots.txt`, linked from no page and left out of the sitemap. |
| `404.html` | Noindex. Firebase serves it for any unknown address, in any folder, so all its paths are root-relative (`/styles.css`, `/script.js`, `/index.html` and so on). |

Other files in `public/`: `styles.css` and `script.js` (the only stylesheet and script); `assets/fonts/` (woff2 files plus `fonts.css` with the `@font-face` rules); `assets/images/` (folders `home`, `projects`, `music`, `reels`, `voiceover`, `cv`); `assets/audio/` (`voiceover`, `music`); the favicons; `sitemap.xml`, `robots.txt` and `llms.txt`. Nothing is loaded from other sites except the YouTube embeds on `reels.html` and `music.html` (from youtube-nocookie.com) and, once a Measurement ID is set, Google Analytics.

## Images

- On 2026-11-03 all 53 images were renamed with `git mv` to lower-case, hyphenated, descriptive names (who or what, her role, one place term where true, as set out in `docs/WEBSITE-PREFERENCES.md`), and all 154 references were rewritten: `src`, `og:image`, `twitter:image`, JSON-LD and the 66 `sitemap.xml` image entries, whose titles were rewritten too.
- The full old → new map lives in git history: `git log --follow -- <new path>` shows a file's earlier name.
- Every `<img>` carries `width` and `height`, so the page does not jump while pictures load; `img { height: auto }` in `styles.css` keeps them scaling.

## Page chrome, copied by hand into every page

Every page, the landing page included since 2026-11-03, repeats the same frame, in this order (where a part is missing on some pages, it says so):

1. `<head>`: title, favicons, font preloads (`font-10.woff2`, Cormorant Garamond, and `font-17.woff2`, Inter; the home page also preloads `font-05.woff2`, the Cormorant italic), `assets/fonts/fonts.css`, then `styles.css`, plus SEO tags that vary by page: description, canonical and Open Graph on every public page; Twitter tags and JSON-LD structured data on the home page, the seven sections and `privacy.html`; a robots tag on the top-level pages; keywords on the home page only. `404.html` and `cv.html` have no canonical or sharing tags. If the font files change, update the preload links together with `fonts.css`.
2. `.page-transition` (five `.curtain` divs), then `#preloader`, which `404.html` and the project pages do not have.
3. `nav#navbar` (logo, `.nav-links`, the `#navToggle` button), then `#navMobile`, the mobile overlay, which is a second copy of the same links. Sub-pages hardcode `class="nav scrolled"` and mark their own menu link `nav-link active` (project pages mark Projects; `404.html`, `cv.html` and `privacy.html` mark none); the home nav gains `.scrolled` on scroll.
4. `<main>`, wrapping everything between the nav and the footer: `.page-hero` on sub-pages, or the split `.hero` on the home page, then the page's sections.
5. `footer.footer`: logo, `.footer-social` links, `.footer-copy`, and the `.footer-legal` line with "Privacy Policy" and "Cookie settings" (`href="#" data-cookie-settings`).
6. Lightbox markup where it is used, then `<script src="script.js">` (`../script.js` in `projects/`, `/script.js` in `404.html`).

So a change to the nav, footer or head meta means editing all 19 framed pages, and the nav twice in each.

**Adding a page:** start from an existing page at the same folder depth so the frame, paths and footer are right. If it belongs in the menu, add it to `.nav-links` and `#navMobile` in every page; the desktop menu is tuned for seven links (it tightens at 1100px and switches to the hamburger menu below 960px), so recheck those widths. Add it to `sitemap.xml` (check d warns when an indexable page is missing), and to `llms.txt` if it is a real section.

## Landing page for UK voice-over search

`best-voice-over-artist-uk.html` (2026-11-03) is a standalone page written for "best voice over artist UK" searches and AI answers: why a real voice-over artist beats AI voices, with a button to contact her directly.
It is in `sitemap.xml` and `llms.txt` but deliberately not linked from the nav or footer; keep it that way unless Virginia asks.
Since 2026-11-03 it carries the normal site frame (nav, footer, cookie banner), opens with a two-column hero (copy left, the Karen Scott headshot right, stacked on phones), has three more photos further down, and its two gold "Connect with Virginia" buttons go to `contact.html`. Its copy must stay word for word (it was written for AI search engines); only the delivery-time promises were removed, because they cannot be met.

## styles.css: two layers plus the privacy section, and source order matters

- **Base layer**, from the top down to the `REDUCED MOTION` banner (roughly the first 2,300 lines): the `:root` tokens (colours, type scale, spacing, layout widths, radii, shadows, transitions, underline), reset, the underline for links inside running text (`.section p a` and `.section li a` without a class, and `.bio-content h2 a`), then components roughly in page order (navigation, hero, cards, bio, quote, headshots, reels, music, voice over, audio players, projects, project detail, contact, CV, footer, page hero, lightbox), then the `RESPONSIVE` block and the `prefers-reduced-motion` block. A few component sections carry their own small media queries: the headshots gallery shows its photographer credit as a slim caption under `@media (hover: none)`, because touch screens cannot hover, and the CV section caps its image at `min(600px, 100%)` and narrows its padding at 768px and 480px so `cv.html` fits phones.
- **Enhancement layer**, after that: quote text-on-image fix, page-transition curtain, hero keyframes, custom cursor, floating particles, reveal variants, animated gradient borders, button ripple and glow, section dividers, 3D tilt, image shimmer, nav hover, parallax, sub-page hero entrance, footer entrance, then `RESPONSIVE — ANIMATION OVERRIDES` (`max-width: 768px`) and a touch-device block.
- **`PRIVACY & COOKIES`**, the last section: the cookie banner and the footer's legal line, with their own 640px, 480px and reduced-motion rules.
- Later rules win at equal specificity, so check the trailing blocks before adding a responsive override. Breakpoints in use (all `max-width`): 1180, 1100, 1024, 960, 768, 640, 480.
- Each section starts with a boxed `═══` banner comment with a capitalised title; search for the title to jump there.

## Entrance animations: a contract between CSS and script.js

These elements start at `opacity: 0` and appear only when a trigger class is added:

| Elements | Visible once | Set by |
| --- | --- | --- |
| `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale`, `.reveal-blur` | they get `.visible` | an IntersectionObserver in `script.js`, once, when scrolled into view |
| `.hero-*` (home) | `.hero` gets `.loaded` | preloader dismissal: window `load` + 400 ms, or a 2.5 s fallback |
| `.footer .nav-logo`, `.footer .footer-social`, `.footer .footer-copy`, `.footer .footer-legal` | `.footer` gets `.visible` | a second IntersectionObserver, on the footer |
| `.page-hero-title`, `.page-hero .section-label` | the page loads | CSS alone |

Reusing one of these classes outside its trigger leaves the element invisible for good (this happened with `.footer-social` on the contact page). The `prefers-reduced-motion: reduce` blocks force everything visible; the one for `.footer-legal` sits in the `PRIVACY & COOKIES` section.

## script.js: settings, modules and markup contracts

The file opens with two settings, `ANALYTICS_MEASUREMENT_ID` and `ANALYTICS_DEFAULT_CONSENT` (see "Privacy, cookies and analytics"), and a `pageshow` handler that cleans up after back/forward-cache restores. Then comes one `DOMContentLoaded` block of independent modules, and the global lightbox functions at the end. The modules:

- page-transition curtain; preloader (its dismissal sets `.hero.loaded`)
- nav: `.scrolled` on scroll, mobile toggle, active-link highlighting (compares without `.html`, so clean URLs still match)
- reveal and footer observers; smooth scrolling for `#` anchors
- custom cursor, and 3D tilt on `.news-card` and `.project-card` (only on non-touch screens wider than 768px)
- `[data-parallax]` (no page uses it at present), floating particles, button ripple and magnetic hover
- page transition on internal links: a plain left click on a link whose `href` does not start with `#`, `http` or `mailto` plays the curtain and navigates after 400 ms. Ctrl, Cmd, Shift and Alt clicks, other mouse buttons, links with a `target` other than `_self`, and `download` links are left to the browser, so "open in new tab" works.
- the custom audio player
- last, the cookie banner and analytics consent

Markup contracts:

- **Audio player** (`voiceover.html`, `music.html`): `.audio-card.vo-audio-card[data-src="…mp3"]` containing `.player-btn` with `.player-icon-play` and `.player-icon-pause`, `.player-progress > .player-progress-fill`, and `.player-time`; the card title is an `h3` (`.audio-card-title`). The audio object is created on first use with `preload = 'none'`; starting one card stops any other.
- **Lightbox** (home, headshots, music and six project pages): inline `onclick="openLightbox(this)"`, where the argument is the `<img>` or a wrapper containing one; clicking the overlay (`onclick="closeLightbox()"`) or pressing Escape closes it. A page that uses it must include the `#lightbox` / `#lightboxImg` markup before `script.js`.
- **Contact form** (`contact.html`): markup only, with no `<form>` element, no action and no backend, so the button does nothing. Since 2026-11-03 the landing page's buttons send visitors here, so the backend (see the Open tasks in WEBSITE-PREFERENCES.md) is urgent.

## Privacy, cookies and analytics

Built on 2026-11-03.

- `public/privacy.html` is the plain-English UK privacy policy. Every footer links to it and to "Cookie settings" (see "Page chrome").
- The cookie banner is not in the HTML: the last module in `script.js` builds it on a first visit, after the preloader, with Accept, Reject and a Privacy Policy link. "Cookie settings" reopens it; Escape closes only a reopened banner and never records a choice. When a page loads `/script.js` (the 404 page), the banner's link becomes `/privacy.html`.
- The choice is stored as `vt-cookie-consent` = `accepted|<ISO time>` or `rejected|<ISO time>`, in localStorage and in a 12-month `SameSite=Lax` cookie (`Secure` on https). A choice older than 12 months counts as no choice.
- The two settings at the very top of `script.js` control Google Analytics. `ANALYTICS_MEASUREMENT_ID`: empty means no tracking at all (the state today); the GA4 ID goes here. `ANALYTICS_DEFAULT_CONSENT`: `'granted'` runs analytics until the visitor rejects (the owner's choice); `'denied'` runs it only after Accept (the opt-in switch); any other value acts as `'denied'`.
- When analytics is allowed, `script.js` loads gtag.js with Consent Mode v2 (analytics granted, every ad signal denied, `anonymize_ip`). When it is denied, gtag is never loaded, `ga-disable-<id>` is set, a denied consent update is sent if gtag already ran, and the `_ga` / `_ga_*` cookies (plus legacy `_gid` / `_gat`) are deleted for the host and its parent domains.
- Styles live in the `PRIVACY & COOKIES` section at the end of `styles.css`. The banner sits at z-index 1500 (above the nav, below the lightbox, cursor and curtain), and the footer adds `--cookie-banner-space` to its bottom padding while the banner is showing.
- The YouTube embeds (5 on `reels.html`, 2 on `music.html`) use youtube-nocookie.com, and check c fails on any `youtube.com/embed`. Reject switches off analytics only: YouTube still loads in privacy-enhanced mode and sets cookies only once a video is played, which the policy says.

## Hosting, caching and headers

- Deploy: `deploy-production.yml` runs its `check` job (`node scripts/check.js --base` with `main` as it was before the push), then deploys `public/` to Firebase Hosting project `virginia-thorn` (live channel) only if the check passed. The service-account key is the GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT_VIRGINIA_THORN`, never a file in the repo. `firebase deploy --only hosting` deploys by hand but skips the checks.
- `cleanUrls: true`: `/bio.html` redirects (301) to `/bio`. Internal links, canonical tags and `sitemap.xml` still use `.html`; that works, but keep them consistent if you change one.
- Caching: `Cache-Control: public, no-cache` on `**` (so clean URLs such as `/bio` are covered) and on `.html`, `.css` and `.js` files. Browsers and the CDN check back on every visit and get a quick 304 when nothing changed, so a changed page, stylesheet or script shows on the next visit with no version numbers to bump. Images are cached for 30 days, fonts and MP3s for 1 year (immutable), so a replaced image, font or recording only reaches returning visitors if it gets a new name.
- Header rules merge: every rule whose glob matches the request applies, and later rules win on the same key. So the `**` rule's security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) and `no-cache` apply everywhere, and the image, font and MP3 rules override its `Cache-Control`. Firebase adds HSTS itself.
- Neither local preview sends these headers (`npm run serve` sends `no-store`), so check them on the deployed URL; the `no-cache` policy is new on 2026-11-03 and still to be confirmed there after the next deploy. `firebase serve` writes `firebase-debug.log` (git-ignored); delete it afterwards so local secret scans stay clean.
- Files whose own name starts with a dot (such as `.env`) are never deployed, because of the `ignore` list in `firebase.json`; files inside a dot-folder such as `.well-known/` still are (checked against the Firebase CLI's file listing).

## Search engines and AI crawlers

- `sitemap.xml`: the 18 public pages (home, seven sections, privacy, the landing page, eight projects), with `<image:image>` entries for their photos. Check d checks it.
- `robots.txt`: allows everything except `/cv.html`, points to the sitemap, and explicitly allows the main AI crawlers.
- `llms.txt`: a plain-text summary of Virginia, her links (Udemy and Coding Liquids included), the site's sections and the landing page, for AI tools.
- An image path can appear in `src` attributes, `og:image` and `twitter:image` tags, the home page's JSON-LD and `sitemap.xml`. Checks c and d fail on any of them that points at a missing file, so a rename cannot leave a stale reference behind.

## Checks and the deploy gate

Commits and pushes are not checked on this computer; GitHub is the gate. On every push it runs `scripts/check.js` (Node 24) and deploys only when it passes, comparing with `main` as it was before the push (deploy). Locally, `npm run check` and `npm run check:smoke` are optional, for when something is in doubt. The script prints PASS, WARN, FAIL or SKIP per check with timings, then a plain-English summary; warnings never fail, and exit 0 means nothing failed. Options: `--smoke`, `--base <commit>`, `--quiet`.

- a. `node --check` on every `.js` in `public/`.
- b. Balanced braces in every `.css` (comments and strings skipped), with the line of any unmatched brace.
- c. Every relative `href`, `src`, `srcset`, `poster`, `data-src`, inline and stylesheet `url()`, and every full `https://virginiathorn.com/...` address (canonical, og:image, JSON-LD, `llms.txt`, `robots.txt`) points at a real file, matching upper and lower case as Firebase does. Every page has `<title>`, `<meta charset="UTF-8">` and viewport; pages with the site navigation (an element with `id="navbar"`) must also load `styles.css` and `script.js`, while a standalone page may bring its own styling. JSON-LD parses; no iframe uses `youtube.com/embed`.
- d. `sitemap.xml`: every `<loc>` and `<image:loc>` must exist, no page may be listed twice, and noindex pages (`404.html`, `cv.html`, any page marked noindex) must not be listed. An indexable page missing from the sitemap is a warning that names the page, so the owner can decide.
- e. Changed and new files (not git-ignored, not binary): email addresses, UK and international phone numbers, UK postcodes, Google, Stripe, GitHub and AWS keys, private keys, service-account key fields. The allow-list `ALLOWED_PRIVATE_DATA` in `check.js` holds only owner-approved text (today one entry: the made-up `your@email.com` placeholder in the contact form mock-up); values are hidden in GitHub's public logs.
- f. `gitleaks dir .` and `gitleaks detect` (history), skipped when gitleaks is not installed (as in GitHub's check job, where `secret-scan.yml` runs gitleaks separately).
- g. `--smoke` only, after a one-time `npm install`: every page in headless Chrome at 1440x900 and 390x844 through `scripts/static-server.js`, with every other website blocked. Fails on console or script errors, failed or 400+ local requests, a preloader that never hides, or `scrollWidth` larger than `clientWidth`. Skipped when puppeteer-core or Chrome is missing; `CHROME_PATH` can point at the browser.

## Verifying a change

- **Preview**: `npm run serve` needs no install. It serves `public/` the way Firebase does (clean URLs, the 404 page), supports Range requests so the audio players can seek, sends `no-store` so every reload shows the latest edit, and lists missing files in its window. `python -m http.server` cannot seek audio.
- **Honest screenshots** for a visual review (check g already catches errors and sideways scrolling): plain `chrome --headless --screenshot` misleads here, because titles and reveal blocks are still at opacity 0 and the `100vh` hero stretches to the window height. Use puppeteer-core (installed by `npm install`) driving the installed Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`: emulate `prefers-reduced-motion: reduce`, wait for `.preloader.hidden`, scroll through the page to fire the observers and lazy images, then take a full-page shot. Widths worth checking: 1440, 1024, 820, 390.
- **README screenshots** were taken with motion on instead: Playwright at 1440×900 and 2× scale, scroll through to fire every reveal, then call `finish()` on each finite entry of `document.getAnimations()` (the particle loops are infinite).
- Keep screenshots and other scratch output outside the repo: `public/` is deployed, and check e scans every new file git does not ignore.

## Where to look

| To change or check | Look in |
| --- | --- |
| Menu links | `.nav-links` and `#navMobile` in all 19 framed pages |
| Footer links, credit, privacy and cookie links | `footer.footer` in all 19 framed pages |
| Colours, fonts, sizes, spacing | `:root` at the top of `styles.css`; font files and `fonts.css` in `assets/fonts/`, plus the preload links in every `<head>` |
| A page's title, description or share image | that page's `<head>` |
| Phone and tablet layout | the `RESPONSIVE` block and the final `max-width: 768px` block in `styles.css` |
| Animations | the enhancement layer of `styles.css` and the matching module in `script.js` |
| Voice-over samples | `voiceover.html` audio cards and `assets/audio/voiceover/` |
| Music | `music.html` and `assets/audio/music/` |
| Showreels and videos | `reels.html` (YouTube embeds); live videos also on `music.html` |
| Headshots | `headshots.html` and the lightbox |
| Projects | the featured cards on `index.html`, the list on `projects.html`, the write-ups in `projects/` |
| Contact and bookings | `contact.html` |
| UK voice-over landing page | `best-voice-over-artist-uk.html` |
| Privacy policy, cookie banner, analytics | `privacy.html`; the settings at the top of `script.js` and its last module; `PRIVACY & COOKIES` in `styles.css` |
| Search engines and AI summaries | `sitemap.xml`, `robots.txt`, `llms.txt` |
| Caching, headers, redirects | `firebase.json` |
| Checks, deploy and secret scan | `scripts/check.js`, `.github/workflows/` |
