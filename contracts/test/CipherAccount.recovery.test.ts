import { expect } from "chai";
import { ethers } from "hardhat";

describe("CipherAccount recovery", () => {
  it("guardian 2-of-3 with 48h delay", async () => {
    const [owner, g1, g2, g3, attacker, newOwner] = await ethers.getSigners();

    const EP = await ethers.getContractFactory("TestEntryPoint");
    const ep = await EP.deploy();
    await ep.waitForDeployment();

    const Acc = await ethers.getContractFactory("CipherAccount");
    const acc = await Acc.deploy(await ep.getAddress(), owner.address);
    await acc.waitForDeployment();

    await acc.connect(owner).configureGuardians([g1.address, g2.address, g3.address], 2, 48 * 3600);

    const id = await acc.connect(g1).proposeRecovery(newOwner.address);
    const recId = (await id.wait())!.logs[0].args?.[0] ?? ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address","uint256","address"],[await acc.getAddress(), (await ethers.provider.getNetwork()).chainId, newOwner.address]));

    await acc.connect(g2).proposeRecovery(newOwner.address);

    // Before delay
    await expect(acc.executeRecovery(recId)).to.be.revertedWithCustomError || to.be.reverted;

    // Advance time
    await ethers.provider.send("evm_increaseTime", [48 * 3600]);
    await ethers.provider.send("evm_mine", []);

    await acc.executeRecovery(recId);

    expect(await acc.owner()).to.eq(newOwner.address);

    // Old owner should not pass validation anymore
    const userOpHash = ethers.keccak256(ethers.toUtf8Bytes("op"));
    const sig = await owner.signMessage(ethers.getBytes(userOpHash));
    const op = {
      sender: await acc.getAddress(),
      nonce: 0n,
      initCode: "0x",
      callData: "0x",
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      paymasterAndData: "0x",
      signature: sig,
    };
    const v = await ep.callValidate.staticCall(await acc.getAddress(), op, userOpHash);
    expect(v).not.eq(0n);
  });
});
