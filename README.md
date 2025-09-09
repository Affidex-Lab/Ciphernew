# Cipher Wallet MVP

This repo contains:
- contracts/: Smart accounts (seedless ECDSA, P-256 passkey stub), disposable wallet, factory.
- client/: Web app scaffold for passkey onboarding and configuration.

Contracts:
- CipherAccount: Owner ECDSA, session keys, guardian recovery, freeze.
- CipherP256Account: P-256 owner key using EIP-7212 precompile at 0x0100 (chain-dependent).
- DisposableAccount + DisposableAccountFactory: Single-use account, burn after execute.

Getting started:
- In `contracts/`: install deps and compile (`npm i && npx hardhat compile`).
- Deploy EntryPoint separately or use an existing one, then deploy accounts/factory.
- In `client/`: set bundler RPC, EntryPoint, and factory addresses in the UI. Connect your bundler/paymaster to send UserOps.
