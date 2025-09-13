import { readFileSync } from 'fs';
import { ethers } from 'ethers';

async function main() {
  const recipient = process.argv[2];
  const amountEth = process.argv[3] ?? '0';
  if (!recipient) {
    console.error('Usage: node scripts/send-disposable.js <recipient> [amountEth]');
    process.exit(1);
  }

  const cfg = JSON.parse(readFileSync(new URL('../public/config.json', import.meta.url)));
  const bundlerUrl = cfg.bundlerUrl;
  const entryPoint = cfg.entryPoint;
  const factory = cfg.disposableFactory;
  const policyId = cfg.policyId;

  const provider = new ethers.JsonRpcProvider(bundlerUrl);

  console.log('Loaded ethers', ethers.version);
  const coder = ethers.AbiCoder.defaultAbiCoder();
  console.log('Coder ready');
  function selector(sig) { return ethers.id(sig).slice(0,10); }

  const owner = ethers.Wallet.createRandom();
  const salt = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);

  console.log('Salt:', salt, 'len', salt.length);
  console.log('EntryPoint:', entryPoint, 'Owner:', owner.address);
  const getAddrData = selector('getAddress(address,address,bytes32)') + coder.encode(['address','address','bytes32'], [entryPoint, owner.address, salt]).slice(2);
  const predicted = coder.decode(['address'], await provider.call({ to: factory, data: getAddrData }))[0];
  console.log('Predicted disposable account:', predicted);

  const initCode = factory + (selector('create(address,address,bytes32)') + coder.encode(['address','address','bytes32'], [entryPoint, owner.address, salt]).slice(2)).slice(2);
  console.log('InitCode length:', initCode.length);
  const value = ethers.parseEther(amountEth);
  console.log('Transfer value (wei):', value.toString());
  const callData = selector('executeAndBurn(address,uint256,bytes)') + coder.encode(['address','uint256','bytes'], [recipient, value, '0x']).slice(2);
  console.log('CallData length:', callData.length);

  let userOp = {
    sender: predicted,
    nonce: 0n,
    initCode,
    callData,
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: '0x',
    signature: '0x',
  };

  async function rpc(method, params) {
    const body = { jsonrpc: '2.0', id: 1, method, params };
    const res = await fetch(bundlerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || method + ' error');
    return json.result;
  }

  const est = await rpc('eth_estimateUserOperationGas', [ userOp, entryPoint ]);
  const gasPriceHex = await rpc('eth_gasPrice', []);
  const gasPrice = BigInt(gasPriceHex);
  userOp = {
    ...userOp,
    callGasLimit: BigInt(est.callGasLimit) + 20000n,
    verificationGasLimit: BigInt(est.verificationGasLimit) + 20000n,
    preVerificationGas: BigInt(est.preVerificationGas) + 20000n,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice / 10n,
  };

  const spon = await rpc('pm_sponsorUserOperation', [ userOp, entryPoint, { sponsorshipPolicyId: policyId } ]);
  userOp.paymasterAndData = spon.paymasterAndData;

  const getUohData = selector('getUserOpHash((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes))') +
    coder.encode([
      'tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)'
    ], [ [userOp.sender, userOp.nonce, userOp.initCode, userOp.callData, userOp.callGasLimit, userOp.verificationGasLimit, userOp.preVerificationGas, userOp.maxFeePerGas, userOp.maxPriorityFeePerGas, userOp.paymasterAndData, userOp.signature] ]).slice(2);
  const uoh = coder.decode(['bytes32'], await provider.call({ to: entryPoint, data: getUohData }))[0];

  userOp.signature = await owner.signMessage(ethers.getBytes(uoh));

  const userOpHash = await rpc('eth_sendUserOperation', [ userOp, entryPoint ]);
  console.log('Submitted userOpHash:', userOpHash);

  // Poll receipt
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const rec = await rpc('eth_getUserOperationReceipt', [ userOpHash ]);
    const tx = rec?.receipt?.transactionHash;
    if (tx) {
      console.log('Confirmed tx:', tx);
      console.log('Arbiscan:', `https://sepolia.arbiscan.io/tx/${tx}`);
      return;
    }
  }
  console.log('No receipt yet (will likely be pending)');
}

main().catch((e) => { console.error('Error:', e?.message || e); process.exit(1); });
