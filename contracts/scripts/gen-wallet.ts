import { Wallet } from "ethers";

const w = Wallet.createRandom();
const out = {
  network: "arbitrum-sepolia",
  address: w.address,
  privateKey: w.privateKey,
  mnemonic: w.mnemonic?.phrase ?? null,
};
console.log(JSON.stringify(out, null, 2));
