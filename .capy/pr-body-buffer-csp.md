Summary
- Fixes blank screen caused by Node built-ins no longer being polyfilled in Vite 6 (Buffer usage via safe-buffer → base-x → bs58).
- Adds minimal globals and tweaks Vite config so browser deps resolve cleanly in dev/build.
- Relaxes CSP to allow required https/wss connections (WalletConnect relay, NEAR, RPCs) while keeping other security headers and caching.

Changes
- package.json: add dependencies buffer@^6.0.3 and process@^0.11.10.
- src/main.tsx: inject Buffer and process on window before rendering.
- vite.config.ts: define global as globalThis and optimize deps to include buffer/process.
- netlify.toml: broaden CSP default-src to include https/data/blob; allow 'unsafe-eval' in script-src; expand connect-src to 'self' https: wss: blob:. Kept img/style/font-src and all other headers. Kept caching for /assets and no-cache for /config.json.

Impact
- App loads without Buffer.from crash on first visit and routes render (/, /dashboard).
- WalletConnect pairing and NEAR selector will not be blocked by CSP (wss/https allowed).
- Keeps a conservative CSP we can tighten later by enumerating exact hosts from production logs.

Notes
- Build verified locally with Vite 6. No runtime auto-polyfills are relied upon anymore.
- We will iterate on CSP to lock down connect-src once endpoints are finalized.