Server (Admin API)

Stack: Node 20+, Express 4, pg, ethers v6

Environment (set in Render):
- ADMIN_API_TOKEN: Admin Bearer token for all /admin endpoints
- DATABASE_URL: Postgres connection string
- RPC_URL: Arbitrum One RPC (e.g. https://arb1.arbitrum.io/rpc)
- ADMIN_EVM_PRIVATE_KEY: 0x... private key for permissible on-chain actions
- PGSSL: set to true if your Postgres requires TLS without CA (Render)

Scripts:
- npm run server:dev — start locally with tsx
- npm run server:build — compile TS to dist
- npm run server:start — run compiled server
- npm run migrate — run SQL migrations

Deploy on Render
- Web Service
- Build Command: npm ci && npm run server:build
- Start Command: node server/dist/index.js
- Add a Render Postgres and set DATABASE_URL
- After deploy, run npm run migrate once (or run on boot if desired)

Notes
- All /admin routes require Authorization: Bearer {ADMIN_API_TOKEN}
- /webhooks/wallet-created is public and rate-limited; consider adding HMAC in front if needed
- On-chain actions attempt calls and will return skipped/not-authorized when the admin key lacks permission or contract does not expose the function
