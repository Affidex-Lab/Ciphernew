Summary
- Contracts: Align with existing front-end self-call flows by adding onlySelf admin functions to CipherAccount:
  - setFrozenBySelf(bool)
  - configureGuardiansBySelf(address[], uint256, uint256)
  - proposeRecoveryBySelf(address)
  - Extract shared logic into internal helpers to keep behavior identical across paths.
- UI: Improve end-to-end flows
  - Make chainId detection dynamic via eth_chainId for recoveryId (no more hard-coded 421614)
  - Wire the “Create Seedless Wallet” hero CTA to the deploy flow (ensureOwner + deployAccount)

Why
- The SPA encodes account.execute(account, 0, data) for admin actions and expects self-call functions. Without them, sponsored self-call flows failed.
- recoveryId was computed with a hard-coded chainId (421614), which breaks on other networks or future migrations.
- The primary CTA previously didn’t initiate deployment; wiring it streamlines demos and onboarding.

Impact
- No breaking changes. Existing owner/guardian methods remain.
- Self-call flows now work through EntryPoint with owner-signed userOps.
- Recovery ID now reflects the actual chain at runtime.
- The primary CTA triggers seedless wallet deployment using the configured account factory.

Next steps (separate PRs)
- Routing + dashboard refactor with a dedicated /approve page (QR + success states)
- Passkey (P‑256) owner path on a 7212 L2 with ECDSA fallback
- Tests for self-call flows and burn/recovery invariants
- Transaction firewall v1: simulate → humanize → warn
