# Cipher Contracts

- CipherAccount: ERC-4337-compatible smart account with owner ECDSA, session keys, guardian-based recovery, and freeze.
- CipherP256Account: P-256 validator stub using EIP-7212 precompile (0x0100) when chain supports it.
- DisposableAccount: Single-use account with burn-after-execute semantics.
- DisposableAccountFactory: Factory for DisposableAccount.

## Getting started

```
cd contracts
npm i
npx hardhat compile
```

## Networks (example)

Create `.env`:

```
PRIVATE_KEY=0xabc...
ARBITRUM_SEPOLIA_RPC=https://arb-sepolia.g.alchemy.com/v2/KEY
```

Then extend `hardhat.config.ts` to add a network:

```ts
import * as dotenv from "dotenv"; dotenv.config();

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC!,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
}
export default config
```

## Deploy sample

```
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

Note: EntryPoint and bundler/paymaster infra must be provided for ERC-4337 flows.
