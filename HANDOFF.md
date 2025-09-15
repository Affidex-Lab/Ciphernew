# Cipher Wallet — Handoff (current state and next steps)

This document captures everything implemented in this jam, what changed, what’s live, and what remains to ship a clean MVP consistent with the intended user flow.


## 0) TL;DR
- Cleaned up contract <-> UI mismatch and merged self-call admin support.
- Fixed RPC usage (apikey required) and added a live runtime config.
- Deployed a CipherAccountFactory to Arbitrum Sepolia and wired it into the app.
- Introduced proper routing and a dedicated /approve page for guardians.
- Live site is ready to demo: seedless deploy, guardian config, freeze/unfreeze, recovery, and one‑time disposable transfer (0 ETH demo-friendly). 

Open questions: restructure UX so the landing shows CTAs only; move feature controls into dashboard/onboarding; add passkeys and transaction firewall; add tests and demo docs.


## 1) What’s live now
- Site: https://cipherwalletmvp.netlify.app/
- Runtime config (served at /config.json):
  - bundlerUrl: https://api.pimlico.io/v2/421614/rpc?apikey=pim_kBDzXSD66Uh8PFLaiUhEHZ
  - entryPoint (v0.7): 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108
  - disposableFactory (CREATE2): 0xfFa7a8DB30B46cEb36685b01D766fabE298080c1
  - accountFactory (CREATE2): 0x8a060835a49BaCD214da97B258D5d2FE58545330
  - sponsorshipPolicyId: sp_certain_mathemanic
- Chains: Arbitrum Sepolia (421614) — chainId is now detected dynamically via eth_chainId.


## 2) Work completed in this jam
- Contracts
  - CipherAccount: added onlySelf admin entry points so the UI’s self-call pattern works via EntryPoint.
    - setFrozenBySelf(bool)
    - configureGuardiansBySelf(address[], uint256, uint256)
    - proposeRecoveryBySelf(address)
    - Extracted shared logic into _configureGuardians/_proposeRecovery.
  - OZ v5 compatibility fix: use MessageHashUtils for toEthSignedMessageHash in contracts (DisposableAccount and CipherAccount), compile is green.
  - Deployed CipherAccountFactory on Arbitrum Sepolia: 0x8a060835a49BaCD214da97B258D5d2FE58545330
- Client
  - Dynamic chainId: added getChainId via eth_chainId and removed query-stripping on the RPC so Pimlico calls succeed.
  - Added public/config.json for runtime configuration without rebuilds.
  - Wired the “Create Seedless Wallet” CTA to trigger deploy flow.
  - Introduced routing and split pages:
    - / — Landing (hero + CTAs only)
    - /dashboard — existing app (seedless deploy, guardians, recovery, disposable flow)
    - /approve — dedicated guardian approval page (connect wallet → proposeRecovery(newOwner))
- Infrastructure
  - Netlify SPA redirect already in place; new routes work under the SPA.

PRs merged/opened:
- #3: Contracts + UI — self-call admin support and CTA wiring
- #4: Fix RPC apikey usage + add public/config.json
- #5: Routing + /approve page + updated config with CipherAccountFactory


## 3) Intended user flow (UX restructure recommendations)
Observation: previously all features were on the home page; this should be simplified. Recommended flow:
- Landing (/)
  - Keep marketing copy and two CTAs only: “Create Seedless Wallet” (primary, navigates to onboarding/dashboard) and “Open App”.
  - Mention disposable one‑time transfers in copy, but don’t show feature controls on the hero.
- Onboarding (/onboarding) [to build next]
  - Preferred path: passkeys (P‑256 on EIP‑7212 chains) with ECDSA fallback.
  - Select guardians (N-of-M, e.g., 2-of-3) and set recovery delay (demo-friendly option).
  - First deploy of seedless account via CipherAccountFactory.
- Dashboard (/dashboard)
  - Account details, status (frozen/active), guardians list, recovery timeline.
  - Actions: Set guardians, Freeze/Unfreeze, Propose/Execute recovery.
  - One‑time Private Transfer (disposable) — place here after wallet exists (or allow use without seedless, but default to within dashboard).
  - Settings (/settings or drawer): Bundler, EntryPoint, Factories, Sponsorship.
- Guardian approval (/approve)
  - Minimal page for guardians with clear deep link, QR code, success states.


## 4) How to demo now (runbook)
- Seedless deploy
  1) Go to /dashboard → Generate Owner Key → Deploy Account.
  2) Status card will show userOp hash; once confirmed, a tx link appears.
- Guardians
  1) Enter 3 EOA addresses, Set Guardians (2-of-3, 48h currently).
  2) Freeze/Unfreeze toggles work via sponsored self-call.
- Recovery
  1) Enter newOwner, click Owner proposes (sponsored self-call creates the recovery id).
  2) Copy the approval link and share to guardians → they open /approve and click Approve (connect wallet, proposeRecovery(newOwner)).
  3) After threshold + delay: Execute from /dashboard.
- One‑time private transfer
  - Click One‑time Private Transfer → enter recipient and amount → review → send. For a quick demo, use amount=0 to avoid needing to pre-fund the disposable account (gas is sponsored but value still requires balance).


## 5) Remaining work (prioritized)
Near-term
- Onboarding route and move setup steps from dashboard.
- /approve improvements: QR code, clear success/error states, approval counter.
- Recovery delay control: make delay configurable; provide a short “demo” option (e.g., 60s) to allow instant Execute tests.
- Transaction firewall v1: simulate + humanize transactions, flag risky patterns (unlimited approvals, setApprovalForAll, suspicious selectors), and display token movements.
- Tests and hardening
  - Unit: self-call admin flows; guardian quorum and delay invariants; burn invariants.
  - E2E: seedless deploy; guardian set; recovery approve/execute; disposable single-use; sponsored flows.
- Docs
  - Update README/HANDOFF to include addresses and live demo steps.
  - Add a short “investor demo” script with screenshots.

Mid-term
- Passkeys (P‑256) owner path (EIP‑7212 chains) and ECDSA fallback
  - Add a P‑256 account factory and UI for WebAuthn onboarding; detect 7212 at runtime.
- Session keys and policy module
  - Issue scoped session keys; spending limits; selectors allowlist.


## 6) Security notes
- Never expose private keys in production; the “Generate Owner Key” is for demo only.
- Sponsorship policies should limit target contracts, gas ceilings, and value transfers.
- Guardians can freeze; validateUserOp blocks while frozen.
- The provided testnet key was used only for deploying the factory. Rotate or empty it after the demo if needed.


## 7) Addresses and configuration
- Chain: Arbitrum Sepolia (421614)
- EntryPoint (v0.7): 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108
- DisposableAccountFactory (CREATE2): 0xfFa7a8DB30B46cEb36685b01D766fabE298080c1
- CipherAccountFactory (CREATE2): 0x8a060835a49BaCD214da97B258D5d2FE58545330
- Bundler RPC (Pimlico): https://api.pimlico.io/v2/421614/rpc?apikey=pim_kBDzXSD66Uh8PFLaiUhEHZ
- Sponsorship Policy ID: sp_certain_mathemanic


## 8) Files and PRs touched
- Contracts
  - contracts/src/accounts/CipherAccount.sol — add *BySelf methods; OZ MessageHashUtils import.
  - contracts/src/accounts/DisposableAccount.sol — OZ MessageHashUtils import.
  - contracts/scripts/deploy-afactory.ts — deploy only CipherAccountFactory.
- Client
  - src/lib/aa.ts — getChainId, encode helpers.
  - src/App.tsx — chainId usage, CTA wiring.
  - src/AppRouter.tsx, src/pages/Landing.tsx, src/pages/Approve.tsx — routing and guardian approval page.
  - src/main.tsx — render AppRouter.
  - public/config.json — added/wired live values (bundler, entryPoint, factories, policy).
- PRs
  - #3 (merged): self-call admin support + CTA + chainId
  - #4 (merged): RPC apikey fix + config.json
  - #5 (merged): routing + /approve + config with factory


## 9) Known limitations
- Disposable programmatic script (Node) hit an ethers v6 BigNumberish encoding quirk; UI path works and is preferred for the demo. If CLI is desired, we can finalize a hardened script.
- Recovery uses a default 48h delay; add a demo-friendly override to test Execute quickly.


## 10) Next actions checklist
- [ ] Build /onboarding and move seedless setup.
- [ ] Add QR/success states to /approve and show N-of-M progress.
- [ ] Add recovery delay control in UI; keep 48h default for prod.
- [ ] Implement transaction firewall v1 (simulate + humanize + warnings).
- [ ] Add unit/E2E tests and demo script.
- [ ] Passkey (P‑256) validator path and factory on a 7212 L2.


## 11) Demo script (quick)
- Open /dashboard → Generate Owner Key → Deploy Account → wait for tx link.
- Set guardians (2-of-3) → Freeze → Unfreeze.
- Enter newOwner → Owner proposes → Copy /approve link → approve with 2 wallets → Execute (if delay reduced for demo).
- One‑time Private Transfer (0 ETH): enter recipient → Send → share tx link.
