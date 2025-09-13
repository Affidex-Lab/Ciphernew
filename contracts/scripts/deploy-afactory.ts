import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const AFactory = await ethers.getContractFactory("CipherAccountFactory");
  const afactory = await AFactory.deploy();
  await afactory.waitForDeployment();
  const afactoryAddr = await afactory.getAddress();
  console.log("CipherAccountFactory (CREATE2):", afactoryAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
