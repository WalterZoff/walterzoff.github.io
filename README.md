# walterzoff.github.io

Personal portfolio — single self-contained `index.html` (no build step, no dependencies).

## Edit
- **Content & links:** open `index.html`. Real links live in the `LINKS` config block near the bottom of the `<script>`; skills live in the `STACK` object. Project cards are plain HTML in the `#work` section.
- **Colors/fonts:** the `:root` block at the top of `<style>`.

## Publish on GitHub Pages (free, no domain)
1. Create a **public** repo named exactly `walterzoff.github.io`.
2. Push this folder to it (see commands below).
3. GitHub Pages turns on automatically for `<username>.github.io` repos. In ~1 minute the site is live at **https://walterzoff.github.io**.
   - If it doesn't appear: repo → **Settings → Pages** → Source = `Deploy from a branch`, Branch = `main` / `/root`.

```bash
git remote add origin https://github.com/walterzoff/walterzoff.github.io.git
git branch -M main
git push -u origin main
```

## Put it on LinkedIn
- **Featured** section → Add → Link → paste the URL (shows a preview card on your profile).
- **Contact info → Website** → add the URL.
- Optionally reference it in your headline / about.
