Deployment and Deploy Previews

Overview
- Frontend: Vite 6 + React 19 + Tailwind CSS v4 (@tailwindcss/vite)
- Backend: Node 20 + Express 4 (server/), Postgres (pg), ethers v6 (Render web service)
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
- Runtime config: public/config.json is fetched at runtime and overrides defaults for:
  - bundlerUrl, rpcUrl, entryPoint, accountFactory, disposableFactory, policyId
  - NEAR: nearNetwork, nearNodeUrl, nearWalletUrl, nearHelperUrl, nearDefaultTokens, nearDefaultNfts
  - adminApiBase: Base URL of the Render backend (https://<service>.onrender.com)
- To change defaults per environment, update public/config.json in the deploy. It is served with no-cache headers by Netlify (see netlify.toml).

Backend (Render)
- Code: server/ (TypeScript). See server/README.md for details.
- Environment variables (set in Render, not committed):
  - ADMIN_API_TOKEN — required for admin endpoints
  - DATABASE_URL — Postgres connection string
  - ADMIN_EVM_PRIVATE_KEY — 0x... used for permissible on-chain actions
  - RPC_URL — Arbitrum One RPC; start with mainnet 42161
- Build Command: npm ci && npm run server:build
- Start Command: node server/dist/index.js
- After deploy: run migrations once (npm run migrate) or configure an on-boot script

Security and routing
- Admin path (frontend): /ciphsecure — not linked in nav.
- Frontend sends X-Robots noindex headers for /ciphsecure via netlify.toml.
- All admin APIs protected with Authorization: Bearer <ADMIN_API_TOKEN>.
- Do not hardcode secrets. Only read from environment on Render.

Limitations documented
- Immediate sweeping is only possible when the admin key is authorized by the wallet contract. Otherwise, propose/execute recovery flows apply.
- DisposableAccount sweep is not applicable for “existing” accounts (executeAndBurn transfers at creation).
- If a contract method is not available or the admin key lacks permissions, the API returns skipped/not-authorized and logs an admin action entry.

Acceptance checklist
- /ciphsecure renders a protected admin dashboard (no nav links; not indexed) with wallet list, actions, and KPIs.
- Frontend invokes /webhooks/wallet-created on successful wallet creation and persists records.
- Admin API is secured by token; unauthorized requests are rejected.
- Disable action updates status and logs an admin action; sweep/propose/execute endpoints attempt on-chain actions when permissible and log tx hashes; otherwise clearly return skipped/not-authorized.
- netlify.toml updated for /ciphsecure headers; CSP/connect-src allows the backend domain (connect-src already allows https:).
