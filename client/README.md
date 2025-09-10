# Cipher Wallet Client (Universal Deploy)

This is a static SPA built with Vite + React. It can be deployed to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3/CloudFront, Nginx, etc.).

Build
- Node 18+ (20 recommended)
- Install: `npm install`
- Build: `npm run build`
- Output: `dist/`

Runtime configuration (no code changes)
Pick one of the following methods to configure the app per environment:

1) Environment variables at build time (Vite)
- Create `.env` and set:
```
VITE_BUNDLER_URL=<json-rpc>
VITE_ENTRYPOINT=0x...
VITE_FACTORY=0x...
VITE_SPONSORSHIP_POLICY_ID=sp_...
```
- `npm run build`

2) Static config file (runtime)
- Copy `public/config.example.json` to `public/config.json` and fill values. The app fetches `/config.json` at startup.
- You can upload/replace `config.json` without rebuilding.

3) In-app overrides (no file/env)
- Open the site and paste values in the Configure panel, then click Save. They persist in localStorage.
- Click Reset to restore server config.

Single Page App routing
- This app is an SPA; route fallbacks must serve `/index.html`.
- Netlify: provided `netlify.toml` with SPA redirect.
- Vercel: add `vercel.json` rewrites (`/*` → `/index.html`).
- Cloudflare Pages: SPA fallback is automatic or configure 404→index.
- GitHub Pages: set 404.html to serve index (or use `spa-github-pages`).
- Nginx:
```
location / { try_files $uri /index.html; }
```

Security
- Never commit secrets. Use `.env.example` and runtime `config.json` without secrets. Pimlico API key is public-scoped; restrict usage in your dashboard.

