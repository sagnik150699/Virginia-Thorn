# CLAUDE.md

Portfolio website of Virginia Thorn, actor, singer and voice-over artist: plain HTML, one stylesheet, one script, no framework, no bundler, no build step.
Everything in `public/` is the published website. The root `package.json` only holds optional local tools (the checks and a preview server) and is not deployed; `docs/` holds the notes listed at the end.

## Who you are working with

- **Virginia, the site owner, is the user.** She develops the site from her own PC through Claude Code and has no coding background. Every kind of change is in scope (copy, design, new pages, features): Claude does the technical work, explains each change in plain language (what changed, what she will see, why) and asks her to decide when there is a real choice. Avoid jargon; if a technical word is unavoidable, explain it in a few words.
- **Sagnik Bhattacharya** set the site up. From the handover in November 2026 Virginia runs it on her own and he is not involved; until then he may also work here from his own PC.

## Commands

```bash
npm run serve          # preview at http://127.0.0.1:8765/ (clean URLs, the 404 page and audio seeking work); needs no install
npm run check          # optional, when something is in doubt: checks a-g in a few seconds
npm install            # only for the optional browser test below (puppeteer-core drives the installed Chrome)
npm run check:smoke    # optional: adds check h, every page in headless Chrome at 1440x900 and 390x844, about 15 s
firebase serve         # optional alternative preview, if the Firebase CLI is installed
```

## Hosting

- The live build is https://virginia-thorn.web.app, updated within a few minutes by every push to `main` that passes GitHub's checks.
- virginiathorn.com is NOT pointed at this build yet: check changes locally or on virginia-thorn.web.app, never on the main domain.

## Committing and publishing

- Pull before you start work. When a change is ready, Claude commits and pushes; never make the owner wait on local checks. Temporary exception until the handover in November 2026: on Sagnik's PC (its `git config user.name` is Sagnik Bhattacharya) he commits and pushes himself, so leave the changes in the working copy and report.
- Commit messages: one line, imperative, plain words, saying what changed and why, under about 72 characters (for example "Fix sideways scrolling on the CV page on phones"); never just "update", "fix" or "changes"; no `Co-Authored-By` trailer.
- On every push GitHub runs `node scripts/check.js` and deploys only when it passes. If a push did not go live, open the failed run in the repository's Actions tab, fix what the `check` job lists and push again. For a removal the owner asked for, put `[allow-removals]` in a commit message (an empty commit with that note is enough), so check e accepts it.
- Rename an image, recording or page with `git mv`, then update every reference (pages, `sitemap.xml`, share tags, JSON-LD); check e reports `renamed: old → new` instead of a removal, and checks c and d fail on any reference left on the old name.
- Check f flags email addresses, phone numbers, UK postcodes and keys in changed files. Never allow-list a hit yourself: ask the owner, then add the exact text and who approved it to `ALLOWED_PRIVATE_DATA` in `scripts/check.js`.
- A standalone page (no site navigation, `id="navbar"`) needs no `styles.css` or `script.js`, only `<title>`, charset and viewport. A public page left out of `sitemap.xml` only gives a warning: add it there, or mark it noindex.

## Hard rules

- **Never delete content on your own.** Copy, credits, images and outbound links are Virginia's: change or remove them only when she asks. Design, markup and CSS changes are fine.
- **The repo is public.** Keep `.env*`, key files and `firebase-debug*.log` out of git, and read every change for private details the checks cannot recognise.
- **Never publish private information.** Anything said only in conversation is private unless the owner says it may be public.
- **One to-do list.** Open tasks live in `docs/WEBSITE-PREFERENCES.md`, and that list is shared between PCs through git. When you finish one, mark it done there with the date in the same change; add new tasks there, nowhere else.
- **End of session.** Before a session ends, write down what was learnt: non-obvious facts about the site go into `docs/MEMORY-MAP.md`, preferences and decisions into `docs/WEBSITE-PREFERENCES.md`, finished or new tasks into its Open tasks list. Those files are how lessons travel between PCs; keep private details out of them.
- **Subagents.** Use subagents for each distinct task and keep the main chat small; point agents at file paths rather than pasting file contents. Pick the model per task (Fable or Opus for judgement-heavy work, Sonnet for routine passes, Haiku for cheap scans); subagents may spawn their own subagents when a task splits further. There is no need to save tokens: spawn Opus or Fable freely whenever a task benefits, and a subagent may call up a stronger model for reference; keeping the main chat small is about a clear, fresh context, not cost.
- **Line endings.** Working-copy files are CRLF; scripts that rewrite files must keep CRLF.
- **Styles.** Always use the `:root` tokens in `public/styles.css`, never raw values.

## Read when needed

- `docs/MEMORY-MAP.md`: how the site is built. Where everything lives, the contracts between the HTML, `styles.css` and `script.js`, the privacy module, hosting and caching, the checks, and how to verify a change.
- `docs/WEBSITE-PREFERENCES.md`: what the owner wants. Content, design and SEO conventions, privacy and tracking decisions, the open tasks and the before-publishing checklist.
- `docs/GETTING-STARTED.md`: the owner's plain-English guide. Setting up a new PC, everyday use, what to keep private, the accounts she owns, and what to do when something goes wrong.

Open only the file and section a task needs. When something described in them changes, update that file in the same change rather than adding detail here; this file stays short.
