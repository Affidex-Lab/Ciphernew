Deployment and Deploy Previews

Overview
- Frontend: Vite 6 + React 19 + Tailwind CSS v4 (@tailwindcss/vite)
- Backend: Node 20 + Express 4 (server/), Postgres (pg), ethers v6 (Render web service). Render blueprint provided in render.yaml.
- Build: Vite static build to dist
- Hosting: Netlify (SPA) for frontend, Render for backend

Build command and publish directory
- Build command: npm run build
- Publish directory: dist

Node and npm
- Node: 20.x (LTS). Set in netlify.toml via [build.environment].
- npm: Use the default that Netlify provides for Node 20. Locally, npm 10+ works.

Install and build locally in CI conditions
- Clean install: npm ci
- Build: npm run build
- Full CI-like run: npm ci && npm run build

Environment and runtime configuration (frontend)
- Compile-time vars: import.meta.env (VITE_*) are optional; the app doesn’t require them to build.
- Runtime config: public/config.json is fetched at runtime and can include optional apiBase for admin API.
  - Additionally, the frontend reads VITE_API_BASE (highest priority) for the admin API base URL; fallback is relative path for local dev.
  - EVM/NEAR wallet config keys remain as before (bundlerUrl, rpcUrl, entryPoint, accountFactory, disposableFactory, policyId, etc.)
- To change defaults per environment, update public/config.json in the deploy. It is served with no-cache headers by Netlify (see netlify.toml).

Backend (Render)
- Code: server/ (TypeScript). See server/README.md for details.
- Environment variables (set in Render, not committed):
  - ADMIN_API_TOKEN — required for admin endpoints
  - DATABASE_URL — Postgres connection string (Render blueprint maps from "cipherwalletmvp"; if not found, set manually in the service)
  - ADMIN_EVM_PRIVATE_KEY — 0x... used for permissible on-chain actions
  - RPC_URL — Arbitrum One RPC; start with mainnet 42161
  - ADMIN_ALLOWED_ORIGINS — comma-separated origins allowed by CORS (e.g., http://localhost:5173, https://<your-netlify-site>.netlify.app)
  - ADMIN_RATE_LIMIT — requests/minute for admin endpoints (default 120)
  - WEBHOOK_RATE_LIMIT — requests/minute for webhooks (default 60)
- Build Command: cd server && npm ci && npm run build && npm run migrate
- Start Command: cd server && npm start
- After deploy: Render runs migrate during build per render.yaml

Security and routing
- Admin path (frontend): /ciphsecure — not linked in nav.
- Frontend sends X-Robots noindex headers for /ciphsecure via netlify.toml.
- All admin APIs protected with Authorization: Bearer <ADMIN_API_TOKEN>.
- Do not hardcode secrets. Only read from environment on Render.
- CSV endpoints available: GET /admin/wallets.csv and /admin/stats.csv?period=daily|weekly|monthly

Limitations documented
- Immediate sweeping is only possible when the admin key is authorized by the wallet contract. Otherwise, propose/execute recovery flows apply.
- DisposableAccount sweep is not applicable for “existing” accounts (executeAndBurn transfers at creation).
- If a contract method is not available or the admin key lacks permissions, the API returns skipped/not-authorized and logs an admin action entry.

Acceptance checklist
- /ciphsecure renders a protected admin dashboard (no nav links; not indexed) with wallet list, actions, and KPIs.
- Frontend invokes /webhooks/wallet-created on successful wallet creation and persists records.
- Admin API is secured by token; unauthorized requests are rejected.
- Disable action updates status and logs an admin action; sweep/propose/execute endpoints attempt on-chain actions when permissible and log tx hashes; otherwise clearly return skipped/not-authorized.
- netlify.toml updated for /ciphsecure headers; connect-src already allows https:. Once you share your Render API URL, optionally add it explicitly to CSP connect-src for clarity.
