# Jswu — Portfolio

A personal portfolio site. Pure static HTML / CSS / JS, no build step.

**Live:** https://&lt;your-username&gt;.github.io/&lt;repo-name&gt;/

## Stack

- Vanilla HTML / CSS / JavaScript
- Google Fonts (Space Grotesk, Instrument Serif, JetBrains Mono)
- No bundler, no framework

## Local preview

```bash
python3 -m http.server 5188
# open http://localhost:5188
```

## Deploy to GitHub Pages

### Option A — Push this folder as the repo root

```bash
git init
git add .
git commit -m "init: portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source = `main` / `/ (root)`** → Save.

### Option B — Use GitHub Actions (auto-deploy)

The included `.github/workflows/deploy.yml` will publish on every push to `main`.
On GitHub: **Settings → Pages → Source = GitHub Actions**.

## Notes

- `.nojekyll` is included so GitHub Pages serves files starting with `_` correctly.
- All image assets are JPG-compressed for fast load.
