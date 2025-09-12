import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const entryPoint = process.env.ENTRYPOINT || "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";
  console.log("Using EntryPoint:", entryPoint);

  const DFactory = await ethers.getContractFactory("DisposableAccountFactory");
  const dfactory = await DFactory.deploy();
  await dfactory.waitForDeployment();
  const dfactoryAddr = await dfactory.getAddress();
  console.log("DisposableAccountFactory (CREATE2):", dfactoryAddr);

  const AFactory = await ethers.getContractFactory("CipherAccountFactory");
  const afactory = await AFactory.deploy();
  await afactory.waitForDeployment();
  const afactoryAddr = await afactory.getAddress();
  console.log("CipherAccountFactory (CREATE2):", afactoryAddr);

  // Optional: sample ECDSA account for reference (not used for disposable flow)
  // const Account = await ethers.getContractFactory("CipherAccount");
  // const account = await Account.deploy(entryPoint, deployer.address);
  // await account.waitForDeployment();
  // console.log("CipherAccount:", await account.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });