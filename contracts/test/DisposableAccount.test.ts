import { expect } from "chai";
import { ethers } from "hardhat";

function toBytes32(hex: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(hex));
}

describe("DisposableAccount", () => {
  it("validates, executes, then burns", async () => {
    const [owner, other] = await ethers.getSigners();

    const EP = await ethers.getContractFactory("TestEntryPoint");
    const ep = await EP.deploy();
    await ep.waitForDeployment();

    const Acc = await ethers.getContractFactory("DisposableAccount");
    const acc = await Acc.deploy(await ep.getAddress(), owner.address);
    await acc.waitForDeployment();

    const userOpHash = toBytes32("op-1");
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
    expect(v).eq(0n);

    const Target = await ethers.getContractFactory("TestTarget");
    const target = await Target.deploy();
    await target.waitForDeployment();

    // Execute and burn
    await ep.callExecuteAndBurn(await acc.getAddress(), await target.getAddress(), 0, Target.interface.encodeFunctionData("ping"));

    const burned = await acc.burned();
    expect(burned).to.eq(true);

    // Second run should fail
    await expect(
      ep.callExecuteAndBurn(await acc.getAddress(), await target.getAddress(), 0, Target.interface.encodeFunctionData("ping"))
    ).to.be.revertedWithCustomError || to.be.reverted;

    // Validation with nonce != 0 should fail
    const badOp = { ...op, nonce: 1n };
    const v2 = await ep.callValidate.staticCall(await acc.getAddress(), badOp, userOpHash);
    expect(v2).not.eq(0n);

    // Wrong signer
    const sig2 = await other.signMessage(ethers.getBytes(userOpHash));
    const badSig = { ...op, signature: sig2 };
    const v3 = await ep.callValidate.staticCall(await acc.getAddress(), badSig, userOpHash);
    expect(v3).not.eq(0n);
  });
});
