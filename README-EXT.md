# Cipher Wallet — Seedless (Chrome MV3 Extension)

This folder contains a Chrome Manifest V3 extension that mirrors the web app’s seedless model and adds EVM (EIP-1193 with 4337 routing) and NEAR connectivity.

Status: v1 scaffold implemented. It builds with Vite and loads in Chrome with onboarding, basic EVM/NEAR connectivity, and a minimal popup + dashboard.

## Structure

```
extension/
  manifest.json
  assets/
    config.json         # extension fallback config (edit with your RPC/bundler/factory)
    icons/icon-*.png    # store icons (16/32/48/128/256)
  src/
    background/index.ts # service worker (MV3)
    content/index.ts    # content script that injects providers and bridges messages
    inject/ethereum.ts  # page-injected EIP-1193 provider
    inject/near.ts      # page-injected NEAR shim (wallet-selector + Sender-like)
    popup/index.html + index.tsx
    options/index.html + index.tsx
    dashboard/index.html + index.tsx
    shared/*            # crypto, storage, types, EVM/NEAR helpers
```

The extension reuses AA helpers from the web app: `src/lib/aa.ts` is imported into the extension bundle for 4337.

## Build & install

- Edit `extension/assets/config.json` with your network settings:
  - `rpcUrl` (EVM), `entryPoint`, `accountFactory`, `bundlerUrl`, `policyId` (optional)
  - `nearNetwork`, `nearNodeUrl`, `nearWalletUrl`, `nearHelperUrl`
- Build:

```
bun run build:ext
# or: npm run build:ext / yarn build:ext / pnpm build:ext
```

- Package (zip):

```
bun run zip:ext
```

- Load in Chrome:
  - Visit chrome://extensions
  - Enable Developer mode
  - Load unpacked → select `extension/dist`

## Onboarding (Seedless)

- First open shows Create / Access:
  - Create Seedless Wallet: generates an EVM owner key and a NEAR implicit key, encrypts them with AES-GCM using a device key, and stores in `chrome.storage.local`.
  - Access Seedless Wallet: upload an encrypted recovery JSON and enter passphrase to restore keys.
- Recovery file schema (v1):

```json
{
  "version": 1,
  "kdf": { "algo": "PBKDF2", "salt": "base64", "iterations": 250000 },
  "cipher": { "algo": "AES-GCM", "iv": "base64" },
  "payload": {
    "evm": { "ownerPrivKey": "base64(ciphertext)" },
    "near": { "secretKey": "base64(ciphertext)" }
  }
}
```

Internally, a device-generated AES-GCM key is used for at-rest encryption. The Options page allows enabling a passphrase which wraps that device key via PBKDF2 and AES-GCM. When enabled, unlocking is required each background session.

## Connectivity

- EVM (EIP-1193): `window.ethereum` is injected. Supported methods in v1:
  - `eth_requestAccounts` → returns the smart account address (counterfactual if undeployed)
  - `personal_sign`, `eth_signTypedData_v4` → signs with EVM owner key
  - `eth_sendTransaction` → routes to 4337 UserOperation via bundler (fallback to direct send if sponsorship/estimation fails). Activity is tracked.

- NEAR: a shim is injected for both Wallet Selector-style and Sender-like flows. Implements `signIn`, `getAccounts`, `signOut`, and `signAndSendTransactions` using the implicit key.

- Site approvals: per-origin approvals are stored. In this v1 scaffold, approvals are optimistic via a simple action; a richer approval UI in the popup can be added next iteration.

## UI

- Popup: shows onboarding (Create/Access), addresses, recent activity, links to Dashboard and Options.
- Dashboard (full page): sections for Portfolio (placeholder), Send (basic NEAR send form), Activity, and Settings link.
- Options: passphrase enable/disable/lock/unlock and notes for export/import.

## Security

- Keys are always encrypted at rest in `chrome.storage.local` using AES-GCM with a random IV per operation.
- Passphrase mode wraps the device key using PBKDF2 (250k iterations) and AES-GCM. The passphrase is never stored; an in-memory session key unlock is required for each service worker lifecycle.

## Chrome Web Store listing copy

- Name: "Cipher Wallet — Seedless"
- Short description: "Seedless smart wallet with EVM + NEAR, disposable accounts, and unified activity."
- Full description:
  - Cipher Wallet — Seedless is a seedless smart wallet for EVM and NEAR. Create or access your wallet without a seed phrase. Connect to dapps via EIP-1193 and NEAR’s wallet selector, sign messages and send transactions. EVM transactions are routed via Account Abstraction (ERC‑4337). View balances and unified activity in a lightweight popup or full dashboard.
  - Security: Keys are encrypted at rest with AES‑GCM. Optional passphrase protection derives keys via PBKDF2. No analytics are collected without explicit consent (toggle in Options when available).
- Privacy disclosure:
  - Seedless design — no seed phrase stored.
  - Keys encrypted at rest; optional passphrase unlock.
  - No analytics without consent.

## Notes & next steps

- Implement approval prompts in the popup for per-origin EVM/NEAR connections and per-tx confirmations.
- Balance fetching and token/NFT discovery to match the web app patterns.
- Export/Import recovery UI in Dashboard and Options.
- EIP‑6492 capability annotations and EIP‑1271 verification (later iteration).
