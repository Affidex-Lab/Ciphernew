import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const entryPoint = process.env.ENTRYPOINT || "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";
  console.log("Using EntryPoint:", entryPoint);

  const Factory = await ethers.getContractFactory("DisposableAccountFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("DisposableAccountFactory:", factoryAddr);

  // Optional: sample ECDSA account for reference (not used for disposable flow)
  // const Account = await ethers.getContractFactory("CipherAccount");
  // const account = await Account.deploy(entryPoint, deployer.address);
  // await account.waitForDeployment();
  // console.log("CipherAccount:", await account.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });