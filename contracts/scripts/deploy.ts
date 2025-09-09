import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const entryPoint = ethers.ZeroAddress;

  const Factory = await ethers.getContractFactory("DisposableAccountFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("DisposableAccountFactory:", await factory.getAddress());

  const Account = await ethers.getContractFactory("CipherAccount");
  const account = await Account.deploy(entryPoint, deployer.address);
  await account.waitForDeployment();
  console.log("CipherAccount:", await account.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });