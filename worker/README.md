# Portfolio chatbot — Cloudflare Worker (OpenAI proxy + RAG)

This tiny Worker holds the OpenAI key as a **secret** (never shipped to the browser),
grounds answers in your profile (`worker.js` → `PROFILE`), and answers with `gpt-4o-mini`.
The static terminal calls it; if it's unreachable, the terminal falls back to offline retrieval.

## Deploy (one time, ~5 min)

```bash
# 1. install the CLI (once)
npm install -g wrangler

# 2. log in to your Cloudflare account (opens a browser)
wrangler login

# 3. from this folder, set your OpenAI key as a secret (it is NOT saved to git)
cd worker
wrangler secret put OPENAI_API_KEY
#   → paste your sk-... key when prompted

# 4. deploy
wrangler deploy
```

`wrangler deploy` prints a URL like:
`https://walterzoff-portfolio-bot.<your-subdomain>.workers.dev`

## Connect it to the site

Open `../terminal/index.html`, find `const API_URL = "";` near the top of the script,
and paste the Worker URL:

```js
const API_URL = "https://walterzoff-portfolio-bot.<your-subdomain>.workers.dev";
```

Commit + push. The terminal now answers with OpenAI, grounded in your profile.

## Cost & abuse (public endpoint — read this)

- Model is `gpt-4o-mini` and `max_tokens` is capped at 320 → each answer costs a fraction of a cent.
- **Set a hard spend limit** in the OpenAI dashboard (Billing → Usage limits) so a bot storm can't surprise you.
- The Worker only accepts requests from `https://walterzoff.github.io` (CORS allow-list in `worker.js`).
- For stronger protection later: add **Cloudflare Turnstile** (free CAPTCHA) or a per-IP rate limit with **Workers KV**. Ask and I'll wire it.

## Update the profile
Edit the `PROFILE` text in `worker.js` and `wrangler deploy` again. (The offline fallback lives in `../terminal/index.html` `KB` — keep them roughly in sync.)
