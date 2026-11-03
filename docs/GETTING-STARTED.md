# Getting started

A plain-English guide for Virginia, and for whoever sets up her PC. No coding knowledge is needed.

## What this is

- This folder holds the files of Virginia's website (its pages, photos and recordings) and the notes Claude works from.
- You develop the website by talking to Claude Code. Any kind of change is possible: wording, photos, design, new pages or new features. Claude does the technical work, explains each change in plain English (what changed, what you will see, why) and asks you whenever there is a real choice to make.
- When a change is ready, Claude "pushes" it, which means sending it to the online copy of these files on GitHub. GitHub checks it and then publishes the website at https://virginia-thorn.web.app within a few minutes.
- The address virginiathorn.com does not show this website yet; switching it over is on the open-task list in `docs/WEBSITE-PREFERENCES.md`.

## One-time setup on a new PC

These steps are for Windows. Open PowerShell (press the Windows key, type "PowerShell", press Enter) and run the commands one at a time. If `winget` asks you to accept its terms, type `Y`. After installing something, open a new PowerShell window before using it.

- [ ] **Git**, which records every change and sends changes to GitHub:

    ```powershell
    winget install --id Git.Git -e
    ```

    Then tell Git who you are. The name is how Claude tells whose PC it is working on. The email is shown publicly on every change you publish, so use the private address GitHub offers (on GitHub: Settings, Emails, "Keep my email addresses private") unless you are happy for your own address to be public. The last line keeps line endings the way this project expects; the Git installer usually sets it already.

    ```powershell
    git config --global user.name "Virginia Thorn"
    git config --global user.email "the-email-you-use-on-GitHub"
    git config --global core.autocrlf true
    ```

- [ ] **A GitHub account that can publish to the repository.** Create one at https://github.com/signup if needed. Until the November 2026 handover, accept the collaborator invitation for the repository; after it, the repository is in your own account. The first time Claude publishes a change, a window asks you to sign in to GitHub; that is expected.
- [ ] **The website files.** This copies the repository into a new `Virginia-Thorn` folder inside Documents:

    ```powershell
    cd $HOME\Documents
    git clone https://github.com/sagnik150699/Virginia-Thorn.git
    ```

    Once the repository moves to your GitHub account its address changes; GitHub keeps forwarding the old one.

- [ ] **Claude Code.** It needs a paid Claude plan (the free plan does not include Claude Code).

    ```powershell
    irm https://claude.ai/install.ps1 | iex
    ```

- [ ] **VS Code and the Claude Code extension.** Install VS Code from https://code.visualstudio.com, then in VS Code open Extensions (Ctrl+Shift+X), search for "Claude Code" and install Anthropic's extension. Sign in when it asks. You can then do everything from inside VS Code: the folder on the left, the Claude Code panel beside it, and a terminal at the bottom if a command is ever needed.

    In a new PowerShell window, `claude --version` should print a version number. The first time you start `claude`, it opens your browser so you can sign in.

- [ ] **Node.js** (the LTS version, 20 or newer), which runs the preview and the optional checks, and **Google Chrome**, which the optional browser check uses (skip Chrome if it is already installed):

    ```powershell
    winget install --id OpenJS.NodeJS.LTS -e
    winget install --id Google.Chrome -e
    ```

- [ ] **Optional: the browser check.** Only needed to run `npm run check:smoke` on this PC. Run once inside the website folder; it adds a `node_modules` folder, which is never committed or published:

    ```powershell
    cd $HOME\Documents\Virginia-Thorn
    npm install
    ```

- [ ] **Optional: gitleaks**, so the optional checks on this PC also scan for passwords and keys (GitHub scans every push anyway):

    ```powershell
    winget install --id Gitleaks.Gitleaks -e
    ```

- [ ] **Optional: Firebase CLI**, only for `firebase serve`, a second way to preview. `npm run serve` (below) already behaves like the live site. If it asks you to sign in (`firebase login`), use the Google account that owns the Firebase project.

    ```powershell
    npm install -g firebase-tools
    ```

- [ ] **Check the setup.** In a new PowerShell window, run these. Each of the first lines should print a version number (gitleaks only if you installed it); the last one, an optional test, should end with a summary saying nothing failed. If something does not work, start Claude Code and ask it to fix that step.

    ```powershell
    cd $HOME\Documents\Virginia-Thorn
    git --version
    node --version
    gitleaks version
    claude --version
    npm run check
    ```

## Everyday use

1. Open VS Code, choose File > Open Folder and pick the website folder (for example `Documents\Virginia-Thorn`), then open the Claude Code panel from the icon in the left-hand bar. Type what you want in your own words.

    If you prefer a plain terminal instead: open PowerShell, go to the folder and start Claude Code:

    ```powershell
    cd $HOME\Documents\Virginia-Thorn
    claude
    ```

    The Claude desktop app can also open the folder in Claude Code.

2. Ask Claude to get the latest version from GitHub first, so you work on the newest copy.
3. Describe the change in your own words, for example "Add my new reel to the Voice Over page" or "Make the headings on the Music page larger".
4. Claude explains what it will do and asks you whenever there is a real choice.
5. Claude shows you the result on your own PC first. It starts a preview with `npm run serve` (no install needed); open http://127.0.0.1:8765/ in your browser to look around. Only your PC can see it, and Ctrl+C in its window stops it.
6. When you are happy, Claude saves the change and publishes it (in Git terms, it commits and pushes) without making you wait for checks; a few minutes later, open https://virginia-thorn.web.app.

GitHub checks every push and publishes only when the checks pass. If a change did not go live, Claude opens the failed run in the repository's Actions tab, reads the `check` job, fixes what it lists and pushes again. When something is in doubt, `npm run check` runs the same checks on this PC in a few seconds; `npm run check:smoke` also opens every page in a hidden Chrome (about 15 seconds, after the optional `npm install`).

The words, photos, credits and links are yours to decide: Claude changes or removes them only when you ask, and never deletes content on its own. GitHub's checks back this up: if something disappears, the change is not published, unless you asked for the removal and Claude marks it `[allow-removals]`.

## What to keep private

- The repository is public. Anyone can read its files and their full history, so anything published stays findable even after it is removed.
- Never paste passwords, API keys, private email addresses, phone numbers or home addresses into the chat unless they are meant for the public website. Claude treats anything said in the chat as private unless you say it may be published.
- GitHub's checks look for email addresses, phone numbers, postcodes and keys before anything is published, but they cannot catch everything. If something private slips in, tell Claude straight away so it stays out of the files. If it was already published, change that password or key first, then ask Claude how to remove it from the history.
- Your Google Analytics Measurement ID is not a secret (every visitor's browser can see it), so it is fine to give it to Claude.

## Where things are

| What | Where |
| --- | --- |
| The rules Claude follows here | `CLAUDE.md` |
| How the site is built | `docs/MEMORY-MAP.md` |
| Your preferences and the open-task checklist | `docs/WEBSITE-PREFERENCES.md` |
| The website itself | the `public` folder |
| The checks | `scripts/check.js`: GitHub runs it on every push, and `npm run check` runs it on this PC |
| The Privacy Policy page | `public/privacy.html`, linked with "Cookie settings" at the foot of every page |
| The landing page for UK voice-over searches | `public/best-voice-over-artist-uk.html`, deliberately not in the menu or footer |
| The Google Analytics slot | the line `const ANALYTICS_MEASUREMENT_ID = '';` at the top of `public/script.js`. When you have a Measurement ID (it looks like G-XXXXXXXXXX), paste it between the quotes, or give it to Claude and ask it to add it. |
| Analytics on by default, or only after Accept | `ANALYTICS_DEFAULT_CONSENT`, just below the slot: `'granted'` today; `'denied'` means visitors must press Accept first |

## Accounts you own

After the November 2026 handover these accounts are yours. Changes to them are made on each service's website, signed in as you, not in this folder:

- **GitHub**: the repository, and the deploy secret `FIREBASE_SERVICE_ACCOUNT_VIRGINIA_THORN` (repository Settings, Secrets and variables, Actions) that lets GitHub publish to Firebase.
- **Firebase**: the project `virginia-thorn`, which hosts the website.
- **The domain registrar** for virginiathorn.com, where the address is pointed at the website (DNS).
- **Google Analytics**: the property whose Measurement ID goes in the slot above.

## If something goes wrong

- **Check the live site**: open https://virginia-thorn.web.app and press Ctrl+F5. virginiathorn.com does not show this website yet.
- **See whether publishing worked**: on GitHub, open the repository and click Actions. The latest "Deploy to Firebase Hosting" run first checks the change, then publishes it. A green tick means it went live; a red cross means it did not, and the live site stays as it was. Ask Claude to read the error and fix it.
- **Undo a change**: ask Claude to "revert the last change and push again". The previous version is live again within minutes, and nothing is lost, because Git keeps the full history.
- **Claude seems confused**: start a new Claude Code session. The rules and notes live in these files, and changes that are not yet published stay in the folder.
- **Anything about the accounts** (GitHub, Firebase, the domain registrar, Google Analytics) is handled by the account owner, which after the handover is you. Claude can talk you through the steps; signing in and approving changes happens on those services' websites.
