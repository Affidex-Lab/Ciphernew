Server (Admin API)

Stack: Node 20+, Express 4, pg, ethers v6, pino

Environment (set in Render):
- ADMIN_API_TOKEN: Admin Bearer token for all /admin endpoints
- DATABASE_URL: Postgres connection string (Render blueprint maps from "cipherwalletmvp"; set manually if mapping fails)
- RPC_URL: Arbitrum One RPC (e.g. https://arb1.arbitrum.io/rpc)
- ADMIN_EVM_PRIVATE_KEY: 0x... private key for permissible on-chain actions
- PGSSL: set to true if your Postgres requires TLS without CA (Render)
- ADMIN_ALLOWED_ORIGINS: comma-separated allowed origins for CORS (default: http://localhost:5173)
- ADMIN_RATE_LIMIT: requests per minute for /admin (default 120)
- WEBHOOK_RATE_LIMIT: requests per minute for /webhooks (default 60)

Scripts (run from server/):
- npm run dev — start locally with ts-node-dev
- npm run build — compile TS to dist
- npm start — run compiled server
- npm run migrate — run SQL migrations

Deploy on Render
- Use render.yaml at repo root (rootDirectory=server). This builds then runs migrations automatically.
- Build Command: npm ci && npm run build && npm run migrate
- Start Command: npm start
- Link a Render Postgres named cipherwalletmvp or set DATABASE_URL manually

Notes
- All /admin routes require Authorization: Bearer {ADMIN_API_TOKEN}
- /webhooks/wallet-created is public and rate-limited; add HMAC later if desired
- On-chain actions attempt calls and return sent/skipped/failed depending on authorization and contract methods
- CSV endpoints: GET /admin/wallets.csv and /admin/stats.csv?period=daily|weekly|monthly
