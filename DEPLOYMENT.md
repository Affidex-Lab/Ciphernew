Deployment and Deploy Previews

Overview
- Frontend: Vite 6 + React 19 + Tailwind CSS v4 (@tailwindcss/vite)
- Build: Vite static build to dist
- Hosting: Netlify (SPA)

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

Environment and runtime configuration
- Compile-time vars: import.meta.env (VITE_*) are optional; the app doesn’t require them to build.
- Runtime config: public/config.json is fetched at runtime and overrides defaults for:
  - bundlerUrl, rpcUrl, entryPoint, accountFactory, disposableFactory, policyId
  - NEAR: nearNetwork, nearNodeUrl, nearWalletUrl, nearHelperUrl, nearDefaultTokens, nearDefaultNfts
- To change defaults per environment, update public/config.json in the deploy. It is served with no-cache headers by Netlify (see netlify.toml).

Netlify configuration
- File: netlify.toml (root)
- Settings:
  [build]
    publish = "dist"
    command = "npm run build"
  [build.environment]
    NODE_VERSION = "20"
  Redirects: SPA redirect from /* to /index.html
  Headers: Security headers including CSP; index.html is marked no-cache. Assets are long-cache with immutable.

Troubleshooting
- If Netlify install fails with peer dependency errors:
  - Ensure package-lock.json is in sync (run npm install --package-lock-only locally, commit, push).
  - If a third-party peer stays behind, set temporarily in Netlify UI or netlify.toml: NPM_FLAGS="--legacy-peer-deps". Prefer fixing the dependency constraint first.
- Clear Netlify build cache from the UI if stale caches cause odd failures.
- To increase verbosity, set temporary env: NETLIFY_BUILD_DEBUG=1.

Deploy Previews
- Native Netlify Deploy Previews are recommended (enable in the Netlify site connected to this repo).
- GitHub Action fallback (if native previews cannot be enabled):
  - Workflow: .github/workflows/netlify-preview.yml
  - Triggers on pull_request and posts a preview URL when the following repo secrets are configured:
    - NETLIFY_AUTH_TOKEN: Personal token (Netlify user) with deploy rights to the site.
    - NETLIFY_SITE_ID: Your Netlify site ID.
  - It uses Node 20, runs npm ci && npm run build, then netlify deploy --dir dist with the PR branch as the alias.

Security headers and CSP
- netlify.toml defines global headers with a restrictive CSP. WalletConnect, NEAR endpoints, and JSON RPC hosts are allowed via connect-src. If a new endpoint is needed and blocked, extend connect-src accordingly.

Contracts folder
- contracts/ contains a separate Hardhat project. It does not participate in the Netlify install/build. No action required.

Acceptance checklist
- npm ci && npm run build succeeds locally on Node 20.
- Netlify build completes successfully on main with publish dir dist.
- Deploy Previews post a preview URL on PRs (via native Netlify or the provided GitHub Action when secrets are present).
- SPA routing works (/* redirected to /index.html).
