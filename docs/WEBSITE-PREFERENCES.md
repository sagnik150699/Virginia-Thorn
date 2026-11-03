# Website preferences

What the owner wants from the site: content, design, SEO and privacy decisions, the shared to-do list, and the checks before publishing. Written in plain language because Virginia may read it. When a decision changes, update it here in the same change.

## Owner and audience

- The site belongs to Virginia Thorn, actor, singer and voice-over artist, based in London and East Sussex.
- Visitors who want to book her are sent to the contact page: since 2026-11-03 the landing page's two "Connect with Virginia" buttons go to `contact.html`, not to Spotlight (Sagnik's decision), so the contact form backend in Open tasks is now the main booking route.
- Virginia develops the site herself through Claude Code and does not write code. Any kind of change is open to her, from wording to design, new pages and new features; Claude does the technical work, explains each change in plain words and asks her whenever there is a real choice to make.
- Sagnik Bhattacharya built the site; at the November 2026 handover every account behind it passes to Virginia (see "Accounts you own" in `docs/GETTING-STARTED.md`).

## Content

- Claude never deletes or rewords Virginia's copy, credits, images or links on its own; what they say is hers to decide, and changing them is fine when she asks.
- 2026-11-03, Sagnik: the content-preservation deploy gate (the former check e and the `[allow-removals]` marker) was removed, because Virginia edits her own content freely and must never be blocked by it. The private-data check stays: when it fires, Claude asks Virginia and allow-lists only what she approves.
- Standalone pages made for search, such as the UK voice-over landing page, stay out of the nav and footer unless Virginia asks.
- 2026-11-03, Sagnik: the landing page's copy stays word for word as written, because it was written for AI search engines. The only text changes allowed were removing the 24-48 hour and same-day delivery promises, which Virginia cannot meet, and shortening the closing button label to "Connect with Virginia →".
- Wherever the copy names Coding Liquids, the name links to https://codingliquids.com.
- The sentence about the e-learning courses she voices (home and bio pages) links to her Udemy profile, https://www.udemy.com/user/virginiathorn/, next to the Coding Liquids link; `llms.txt` lists both.

## Design

- A dark, editorial look: near-black backgrounds, warm cream text and a single gold accent.
- Headings in Cormorant Garamond, body text in Inter. Both are self-hosted woff2 files in `public/assets/fonts`, so no font is fetched from Google.
- Colours, sizes and spacing come from the tokens in the `:root` block at the top of `public/styles.css`, so one change there restyles the whole site consistently.
- Readable for everyone: text keeps at least 4.5:1 contrast on every dark surface (the muted text colour was raised for this on 2026-11-03), and links inside running text carry a faint gold underline, so they never rely on colour alone.
- Entrance animations are welcome but must respect `prefers-reduced-motion`: visitors whose device asks for less motion see every element straight away, without animation.

## SEO conventions

- The goal: rank for voice-over work in the UK, and also for acting and folk music, with London and East Sussex as her places. No keyword stuffing anywhere.
- Page titles read `<Page> — Virginia Thorn`; the home page is `Virginia Thorn — Actor, Singer, Voice Over Artist`. Titles and meta descriptions may carry "voice-over artist, London / UK" wording, but visible copy never changes for SEO without Virginia's say-so.
- Canonical tags, `og:url` and `sitemap.xml` use https://virginiathorn.com, even before the domain switch, so nothing has to change when it happens.
- Image file names are lower-case and hyphenated and carry who or what, her role and one place term where true, for example `virginia-thorn-voice-over-artist-uk-home-studio-sennheiser-mkh416.jpg` or `virginia-thorn-actor-headshot-london-01.jpg`. Alt text is a natural sentence that names her role and place only when they genuinely apply.
- When an image is renamed, the `sitemap.xml` image entries (their titles included) and any `og:image` follow the new name (`docs/MEMORY-MAP.md` lists every place an image path can appear).
- Keep `llms.txt` in step with the site's real sections.

## Privacy and tracking (decided 2026-11-03)

- Google Analytics 4 is the only tracking. Its Measurement ID goes in `ANALYTICS_MEASUREMENT_ID` at the top of `public/script.js`; while that is empty, as it is today, nothing is tracked.
- The cookie banner offers Accept and Reject, and "Cookie settings" at the foot of every page reopens it. By the owner's choice, analytics is on by default and switches off when a visitor rejects. UK cookie rules (PECR) expect visitors to opt in to analytics; the switch for that is `ANALYTICS_DEFAULT_CONSENT` at the top of `public/script.js` (`'granted'` today, `'denied'` for opt-in).
- YouTube videos are embedded from the privacy-enhanced youtube-nocookie.com domain. Reject switches off analytics only; YouTube sets cookies only once a video is played, and the privacy policy says so.
- The privacy page (`public/privacy.html`) names Virginia Thorn as the person responsible and sends requests to the contact page and her Spotlight profile. It prints no email or postal address.

## Open tasks

This is the site's one to-do list, shared between PCs through git (until the November 2026 handover, Sagnik's and Virginia's). When a task is finished, on any PC, tick it here with the date as part of the same change, so it lands in the same commit as the work: `- [x] Task (done 2026-11-03)`. Add new tasks here, nowhere else.

### Handover (November 2026)

- [ ] **GitHub:** transfer the repository to Virginia's GitHub account (or make her its owner), then push a small change to confirm the deploy workflow and its `FIREBASE_SERVICE_ACCOUNT_VIRGINIA_THORN` secret still work after the transfer. Update the clone address in `docs/GETTING-STARTED.md`.
- [ ] **Firebase:** make Virginia an owner of the Firebase project `virginia-thorn`.
- [ ] **Domain:** make sure Virginia has the login for the registrar and DNS of virginiathorn.com.
- [ ] **Google Analytics:** put the Analytics property in Virginia's Google account.
- [ ] **CLAUDE.md:** once the steps above are done, remove the temporary Sagnik exception from the Git rule.

### Website

- [ ] **Point virginiathorn.com at Firebase Hosting. Urgent:** since 2026-11-03 the old Squarespace site shows a "Website Expired" page, so the domain shows nothing of Virginia's work.
- [ ] **Google Analytics (Virginia):** create or find the GA4 property and paste its Measurement ID (looks like G-XXXXXXXXXX) into `ANALYTICS_MEASUREMENT_ID` at the top of `public/script.js`; until then the banner shows but nothing is tracked. The old Squarespace site has expired, so its ID could not be read from it.
- [ ] **Contact form backend:** `contact.html` is markup only, so the form sends nothing yet. Plan: a Firebase Cloud Function receives the form, Cloudflare Turnstile keeps bots out, and messages are delivered to Virginia's email; the email provider is still to choose. Build it once Virginia approves the receiving address, and keep that address out of the repo.
  - The two "Connect with Virginia" buttons on `public/best-voice-over-artist-uk.html` already point at `contact.html` (changed 2026-11-03 at Sagnik's request), so visitors land on a form that sends nothing until this is built: treat it as urgent.
- [ ] **After the DNS switch:** confirm the site in Google Search Console, submit `sitemap.xml`, and check that the landing page `best-voice-over-artist-uk.html` is indexed.
- [ ] **Photo credit on the landing page (Virginia):** its hero now shows the Karen Scott headshot that other pages credit; decide whether the landing page should carry the credit too (it means adding a line of text to the page).
- [ ] **Optional performance work:** responsive and WebP images. (Font preloads were added on 2026-11-03.)
- [ ] **To review (Virginia):** noticed during the image work on 2026-11-03 and left unchanged, because the copy and pictures are hers to decide:
  - [ ] the home page's Philips Hue card shows the Pocket Of Light / Arts Council graphic;
  - [ ] the picture now named `virginia-thorn-actor-savage-in-limbo-lantern-theatre-brighton.jpg` (formerly `savage-limbo-project.jpg`) looks like the blue-lit stage shoot rather than the Savage In Limbo set; if so, its name and alt text need changing too;
  - [ ] the In Your Dreams card on the Projects page is tagged 2023, but its poster says April 2024;
  - [ ] the Projects page spells "Kinderstransport".
  - Ten image files (11.8 MB) are not shown on any page: the six reel thumbnails in `assets/images/reels/` (only `sitemap.xml` lists them; the reels page uses YouTube embeds), `virginia-thorn-actor-singer-london-on-stage-widescreen.jpg`, `virginia-thorn-folk-singer-songwriter-london-green-note-video-still.jpg`, `virginia-thorn-british-female-voice-over-artist-london.png` and `pocket-of-light-theatre-arts-council-england-funding-virginia-thorn-actor-02.jpg` (unreferenced). They are yours: say if they should be used somewhere or removed (removing also means taking them out of `sitemap.xml`).
- [x] Privacy page, cookie banner and privacy-enhanced YouTube embeds (done 2026-11-03).
- [x] Coding Liquids and Udemy links in the copy (done 2026-11-03).
- [x] Descriptive image file names and alt text (done 2026-11-03).
- [x] Landing page for UK voice-over search, `public/best-voice-over-artist-uk.html` (done 2026-11-03).
- [x] Short CLAUDE.md, with the detail moved to `docs/MEMORY-MAP.md` and this file (done 2026-11-03).

## Before publishing

A push to `main` goes live within a few minutes, once GitHub's checks pass:

1. GitHub runs the checks on every push and publishes only if they pass; run `npm run check` yourself only when something is in doubt.
2. The content is Virginia's: Claude changes or removes copy, images, credits or links only when she asks. No check enforces this (decided 2026-11-03), so it is up to Claude to follow it.
3. Privacy: check e flags email addresses, phone numbers, postcodes and keys, but it cannot recognise everything (a home address written out in words, for example), so read the change too. Only Virginia can approve publishing private details.
4. Preview with `npm run serve` when it helps. After the push, look at the result on https://virginia-thorn.web.app, not on virginiathorn.com.
5. If the change finishes an open task, tick it above in the same commit.
