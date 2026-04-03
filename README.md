# Virginia Thorn Static Site

Static portfolio site for Virginia Thorn, designed and built by Sagnik Bhattacharya, prepared for Firebase Hosting as a fully static deployment.

## Stack

- Plain HTML, CSS, and JavaScript
- Firebase Hosting for deployment
- Self-hosted fonts, images, and audio under `public/assets`

## Author

This website was written and prepared for static hosting by Sagnik Bhattacharya.

## Project Structure

- `public/` static site files served by Firebase
- `public/assets/images/` local image assets
- `public/assets/audio/` local audio assets
- `public/assets/fonts/` local font files and stylesheet
- `firebase.json` Firebase Hosting config
- `.firebaserc` default Firebase project alias

## Local Preview

If Firebase CLI is installed:

```bash
firebase serve
```

Or deploy directly:

```bash
firebase deploy
```

## GitHub Publish Notes

This repo has been cleaned so the site does not depend on Squarespace for runtime hosting or asset delivery.

Before publishing, keep these rules in mind:

- Do not commit local tool folders such as `.claude/`
- Do not commit Firebase debug logs
- Do not add service account files, `.env` files, or private keys
- The site intentionally keeps outbound links and embeds for services like YouTube, Bandcamp, Spotlight, IMDb, and social platforms

## Security Notes

- No private keys or service account credentials are included in the repo
- Firebase Hosting is configured as a static site only
- Fonts, audio, images, CSS, and JS are served locally from the repo
- `.firebaserc` contains the Firebase project ID only; it is not a secret

## Content Note

Some site content is intentionally public-facing personal portfolio material, including a CV screenshot in `public/assets/images/cv/cv-screenshot.png`. Review that content before publishing if you want to reduce personal information exposure.
