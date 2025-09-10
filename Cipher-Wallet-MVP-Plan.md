# Cipher Wallet MVP — Technical Plan

## 1) Goals and principles
- Prevent drain/fraud with safer defaults: no seed phrase handling, strong recovery, granular permissions, and human-readable transaction UX.
- Private-by-default usage paths: one-click disposable accounts to break linkage to a main wallet.
- Non-custodial posture with pragmatic fallbacks; never require users to manage raw secrets.
- L2-first experience; low-friction onboarding; gas abstracted for key flows.
- Modular, auditable, upgradeable via account abstraction.

## 2) Core features
- Seed-phraseless smart account:
  - Authenticate with device-native Passkeys where possible.
  - Recovery via guardians and multi-device, no seed phrase.
  - Granular policy controls: session keys, spending limits, allow/deny lists.
- Disposable wallet:
  - One-time, single-use smart account for a single transaction.
  - Optional in-tx self-destruct when viable; otherwise auto-burn to permanently disable.
  - Paymaster-subsidized gas to avoid linking via main wallet funding.

## 3) High-level architecture
- On-chain (EVM L2-first, EntryPoint v0.7, ERC-4337):
  - Modular smart account (EIP-6900 style) with pluggable validators and policies.
  - Recovery/guardian module with delays and quorum.
  - Disposable account factory with one-shot validation logic and optional self-destruct.
  - Paymaster for gas sponsorship with basic fraud controls and rate limits.
  - Optional signature aggregator for passkeys where needed.
- Off-chain services:
  - Bundler (managed provider initially).
  - Paymaster service with policy checks and quotas.
  - Optional MPC/TSS co-signer for non-7212 chains fallback.
  - Minimal orchestrator for device/guardian metadata, telemetry minimization, and notifications.
- Client apps:
  - Web extension + web app; mobile later.
  - Passkey authentication, session key issuance, simulation and transaction humanization.
  - Transaction firewall UX: flags risks, approval ceilings, suspicious contract detection.

## 4) Seed-phraseless designs (options and choice)
- Option A (preferred): Passkeys + EIP-7212 where available
  - Passkeys (WebAuthn, FIDO2, device secure enclave) sign P-256.
  - On chains that support EIP-7212 (secp256r1 precompile), validate P-256 directly in the account validator.
  - Benefits: pure non-custodial, no seed management, multi-device passkeys, strong UX.
- Option B (fallback): 2-of-3 MPC/TSS (device share + service share + optional recovery share)
  - Device authenticates via passkey; service co-signs under strict policy.
  - Benefits: broad chain support; seedless, recoverable. Tradeoff: semi-trusted service co-signer with strong controls and transparency.
- Option C (hybrid): Passkey-gated secp256k1 key in OS keystore for native apps; on web, use encrypted key unlocked by passkey.
  - Benefits: minimal infra. Tradeoff: key export risks on web; requires hardening.

MVP decision:
- Implement Option A first on an L2 that supports EIP-7212.
- Provide Option B fallback on non-7212 networks.
- Keep options swappable behind a single validator interface.

## 5) Smart account architecture
- Pattern: EIP-4337 + EIP-6900 modular account (Kernel-style)
  - Owner validator module:
    - Mode 1 (7212-enabled): P256 on-chain verification.
    - Mode 2 (fallback): Aggregated off-chain verification or MPC/TSS co-sign.
  - Recovery module:
    - Guardians (N-of-M) with timelock; allow add/remove device keys and rotate owner.
    - Emergency lock switch to pause `validateUserOp` except for recovery.
  - Policy module (transaction firewall):
    - Allow/deny lists for contracts and function selectors.
    - Spending limits per token/time window/dApp session.
    - Session key issuance with granular scopes and expiry.
  - EIP-1271 support for dApp signatures; EIP-6492 for counterfactual signatures pre-deploy.

## 6) Disposable wallet design
- Requirements:
  - Single-use, one-click temporary account, optionally gasless, optionally self-destruct.
  - No linkage to main wallet for gas funding; use paymaster.
  - Guardrails to reduce abuse (contract allowlist, quotas, anti-drain heuristics).
- Two deployment modes:
  - Mode A: In-tx create → execute → self-destruct (when chain semantics allow)
    - Works within the same transaction that creates the contract (EIP-6780 constraints considered).
    - Achieved via initCode deploy + execute + selfdestruct in the same UserOperation.
  - Mode B: Auto-burn after first execution
    - `validateUserOp` enforces single-use; post-exec flips a `burned` flag or rotates owner to zero address.
    - Optional sweep of residual funds to a sink or user-specified address.
- Privacy considerations:
  - Use paymaster gas sponsorship; avoid funding from main wallet.
  - Use shared relayers/bundlers and minimize unique metadata.
  - Communicate that on-chain transparency remains; this is unlinkability, not full anonymity.

## 7) Fraud/drainer prevention
- Transaction simulation and humanization:
  - Simulate all calls, display exact token movements, approvals, and storage diffs in plain language.
  - Highlight patterns: unlimited approvals, permit signatures, `setApprovalForAll`, suspicious bytecode, denylist hits.
- Policy enforcement at account level:
  - Ceilings on approvals and per-session spend limits.
  - Require session keys for dApp interactions; restrict to domains and method selectors.
  - Time-lock risky actions unless explicitly confirmed twice.
- Origin binding:
  - For session keys, bind to dApp origin; require EIP-712 signed session creation from the origin.
- Allow/deny lists:
  - Curated registry of known safe/unsafe contracts.
- Anti-phishing UX:
  - Domain verification, lookalike detection, ENS reverse mismatch warnings.

## 8) Gas and paymaster
- Sponsored gas for onboarding, recovery flows, and disposable wallets.
- Controls:
  - Quotas per user/device/time period.
  - Target contract allowlist and maximum gas/use.
  - Simple risk scoring prior to sponsorship.
- Provider: start with a managed paymaster; later evolve policies and reputation.

## 9) Chains and infra
- Target chains:
  - Phase 1: An EVM L2 supporting EIP-7212 for passkeys. Provide non-7212 fallback via MPC/TSS on others.
  - Phase 2: Extend to additional L2s; evaluate mainnet.
- Bundler: managed initially; consider self-hosting later.
- Orchestrator service: stores only public metadata; no secrets; Postgres + Redis; strict logging hygiene.

## 10) Recovery flows
- Guardians: N-of-M with 48–72h timelock; can add new device passkeys and rotate owner.
- Multi-device passkeys: register multiple device keys; removal requires confirmation and/or guardian quorum.
- Break-glass: emergency freeze callable by user or guardians; unfreeze requires additional confirmation.

## 11) UX flows (end-to-end)
- Onboarding (7212): create passkey → derive P-256 public key → deploy counterfactual account on first use → gas via paymaster → optional guardians.
- Onboarding (fallback): create passkey → authenticate device to MPC → device share + service share co-sign userOps.
- Regular transaction: simulate and humanize → firewall checks → passkey prompt → bundle → receipt.
- Session key flow: approve scope (contract, methods, limits, expiry) → store in extension → skip prompts for low-risk repetitive calls.
- Disposable wallet: click Disposable → select chain/target → simulate/humanize → paymaster sponsors → one-time execution → self-destruct or burn → receipt and proof.
- Recovery: start → guardians approve → timelock → rotate owner/add device → resume.

## 12) Security model and threat mitigation
- Threats:
  - Device compromise: secure enclaves, biometrics, session limits, emergency freeze, guardian recovery.
  - Phishing/drainers: simulation, policies, deny lists, origin binding, scoped session keys.
  - Service compromise (fallback/MPC): 2-of-3 with guardian/delay; service cannot unilaterally spend; audits and isolation.
  - Supply chain (bundler/paymaster): rate-limited sponsorship, deterministic simulations; avoid secret reuse.
  - Chain-level risks: monitor actively; disable risky features on problematic chains.
- Engineering hygiene: deterministic builds, dependency pinning, reproducible contracts, separate keys per environment.

## 13) Privacy and compliance
- Privacy: no PII by default; minimal metadata; short retention of anonymized counters.
- Disposable wallets: unlinkability tool, not a mixer; message limitations clearly.
- Compliance: deny sanctioned addresses; configurable geo controls if required; avoid custodial control.

## 14) Contracts (MVP scope)
- SmartAccount (modular):
  - Pluggable validator: `PasskeyValidator` (7212) and `MPCValidator` fallback.
  - `PolicyModule`: spend limits, selectors allowlist, session key registry.
  - `RecoveryModule`: guardians, delays, freeze/unfreeze.
- `DisposableAccountFactory`:
  - `createAndRun(init, callData)` enabling same-tx self-destruct when supported.
  - Burnable one-shot account that invalidates after first execution.
- Paymaster: sponsor policies, quotas, target allowlist.

## 15) Reference pseudocode

One-shot validation (burnable):

```solidity
function validateUserOp(UserOperation calldata op, bytes32, uint256) external returns (uint256) {
    if (burned) revert();
    if (nonce != 0) revert();
    if (!verifySignature(op)) revert();
    return 0;
}

function executeAndBurn(address to, uint256 value, bytes calldata data) external {
    if (msg.sender != entryPoint) revert();
    (bool ok,) = to.call{value:value}(data);
    require(ok);
    burned = true;
}
```

Optional same-tx self-destruct path (when created this tx):

```solidity
function executeAndSelfDestruct(address to, uint256 value, bytes calldata data) external {
    if (msg.sender != entryPoint) revert();
    (bool ok,) = to.call{value:value}(data);
    require(ok);
    selfdestruct(payable(beneficiary));
}
```

## 16) Tech stack
- Contracts: Solidity ^0.8.24, EntryPoint v0.7, EIP-6900 modular account baseline.
- AA frameworks: Kernel-style accounts or Safe{Core} AA.
- Passkeys: WebAuthn, EIP-7212 validator where supported.
- Fallback: MPC/TSS library/service (2-of-3).
- Client: Browser extension + React web app; TypeScript; viem/ethers; simulation via Tenderly/Anvil-like RPC; humanization via 4byte/signature lookups + custom decoders.
- Infra: managed bundler; minimal paymaster service; Postgres + Redis; Docker.

## 17) Testing and audits
- Unit: validators, policies, recovery, disposable factory, paymaster.
- Simulation: drainer patterns, approvals, allowance ceilings, session constraints.
- Fuzzing/invariants: nonces, burn state, policy bypass attempts.
- End-to-end: 4337 flows on target L2; recovery with guardians; cross-browser passkeys.
- External audit: schedule pre-release; bug bounty on launch.

## 18) Milestones and timeline (~6–8 weeks)
- Week 1: decide chains and AA stack; scaffold modular account and validator interfaces; pick bundler/paymaster.
- Week 2: implement PasskeyValidator (7212) and MPC fallback validator; basic PolicyModule and RecoveryModule.
- Week 3: DisposableAccountFactory (self-destruct + burnable); Paymaster service with quotas and allowlists.
- Week 4: Client extension (passkey onboarding, simulation, humanization, session keys); disposable wallet UX.
- Week 5: Integration tests on target L2; recovery flow; device management; emergency freeze.
- Week 6: Security hardening, fuzzing, monitoring; restricted beta.
- Weeks 7–8: External audit fixes; performance; public MVP.

## 19) Open decisions
- Primary L2 for launch (must support EIP-7212 or we default to MPC fallback).
- AA framework: Kernel v3 vs Safe{Core} AA.
- Bundler/paymaster provider for MVP.
- Guardian defaults (M, N, delays).
- Disposable default mode: self-destruct or burn-first.

## 20) KPIs for MVP
- Onboarding success rate and time-to-first-transaction.
- Zero seed phrase support tickets.
- Disposable wallet usage share and completion rate.
- Reduction in risky approval events and blocked drain patterns.
- No custody of user private keys; zero security incidents.
