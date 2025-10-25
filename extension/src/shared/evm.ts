import { ethers } from 'ethers';
import { getOrCreateAccSalt, getEvmOwnerPrivKeyHex, setEvmOwnerPrivKeyHex, pushActivity } from './storage';
import type { ActivityItem, Config } from './types';
import { encodeExecuteAndBurn, packInitCode, estimateUserOp, sponsorUserOp, getGasPrice, getUserOpHash, sendUserOp, predictAccountAddress } from '../../../src/lib/aa';

export async function ensureEvmOwner(): Promise<{ ownerPrivKeyHex: string; ownerAddress: string }>{
  let pk = await getEvmOwnerPrivKeyHex();
  if (!pk){
    const w = ethers.Wallet.createRandom();
    pk = w.privateKey;
    await setEvmOwnerPrivKeyHex(pk);
  }
  const w = new ethers.Wallet(pk);
  return { ownerPrivKeyHex: pk, ownerAddress: w.address };
}

export async function getSmartAccountAddress(cfg: Config): Promise<{ account: string; owner: string }>{
  const { ownerAddress } = await ensureEvmOwner();
  const salt = await getOrCreateAccSalt();
  const account = await predictAccountAddress(cfg.rpcUrl, cfg.accountFactory, cfg.entryPoint, ownerAddress, salt);
  return { account, owner: ownerAddress };
}

export async function eip1193_request(cfg: Config, origin: string, method: string, params: any[]): Promise<any>{
  const { ownerPrivKeyHex } = await ensureEvmOwner();
  if (method === 'eth_requestAccounts'){
    const { account } = await getSmartAccountAddress(cfg);
    return [ account ];
  }
  if (method === 'personal_sign'){
    const msg = params?.[0];
    const data = typeof msg === 'string' && msg.startsWith('0x') ? ethers.getBytes(msg) : new TextEncoder().encode(String(msg||''));
    const w = new ethers.Wallet(ownerPrivKeyHex);
    const sig = await w.signMessage(data);
    await pushActivity({ time: Date.now(), chain: 'EVM', kind: 'sign', status: 'confirmed', origin, meta: { method } } as ActivityItem);
    return sig;
  }
  if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData'){ // naive
    const data = params?.[1] || params?.[0];
    const w = new ethers.Wallet(ownerPrivKeyHex);
    const sig = await (w as any).signTypedData?.(...data) ?? w.signMessage(ethers.toUtf8Bytes(JSON.stringify(data)));
    await pushActivity({ time: Date.now(), chain: 'EVM', kind: 'sign', status: 'confirmed', origin, meta: { method } } as ActivityItem);
    return sig;
  }
  if (method === 'eth_sendTransaction'){
    // v1: try 4337. If it fails, fall back to direct send.
    const tx = params?.[0] || {};
    try {
      const res = await sendVia4337(cfg, ownerPrivKeyHex, tx, origin);
      return res;
    } catch (err){
      const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
      const w = new ethers.Wallet(ownerPrivKeyHex, provider);
      const sent = await w.sendTransaction({ to: tx.to, data: tx.data, value: tx.value ? BigInt(tx.value) : undefined, gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined });
      await pushActivity({ time: Date.now(), chain: 'EVM', kind: 'send', status: 'pending', txHash: sent.hash, origin } as ActivityItem);
      return sent.hash;
    }
  }
  throw new Error('Unsupported method');
}

async function sendVia4337(cfg: Config, ownerPrivKeyHex: string, tx: any, origin: string){
  const { account } = await getSmartAccountAddress(cfg);
  const callData = encodeExecuteAndBurn(tx.to, BigInt(tx.value || 0), tx.data || '0x');
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const owner = new ethers.Wallet(ownerPrivKeyHex);
  const salt = await getOrCreateAccSalt();
  // naive: nonce 0 for undeployed, else 0 as well; bundler may handle. Improve later.
  let userOp: any = {
    sender: account,
    nonce: 0n,
    initCode: '0x',
    callData,
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: '0x',
    signature: '0x'
  };
  // if undeployed, add initCode
  const code = await provider.getCode(account);
  if (code === '0x'){
    userOp.initCode = packInitCode(cfg.accountFactory, cfg.entryPoint, owner.address, salt);
  }
  const gas = await getGasPrice(cfg.bundlerUrl);
  userOp.maxFeePerGas = gas.maxFeePerGas;
  userOp.maxPriorityFeePerGas = gas.maxPriorityFeePerGas;
  const est = await estimateUserOp(cfg.bundlerUrl, userOp, cfg.entryPoint);
  userOp.preVerificationGas = BigInt(est.preVerificationGas);
  userOp.verificationGasLimit = BigInt(est.verificationGasLimit);
  userOp.callGasLimit = BigInt(est.callGasLimit);
  if (cfg.policyId){
    const sp = await sponsorUserOp(cfg.bundlerUrl, userOp, cfg.entryPoint, cfg.policyId);
    userOp.paymasterAndData = sp.paymasterAndData;
  }
  const hash = await getUserOpHash(cfg.rpcUrl, cfg.entryPoint, userOp);
  userOp.signature = await owner.signMessage(ethers.getBytes(hash));
  const uoHash = await sendUserOp(cfg.bundlerUrl, userOp, cfg.entryPoint);
  await pushActivity({ time: Date.now(), chain: 'EVM', kind: 'send', status: 'pending', uoHash, origin } as ActivityItem);
  return uoHash;
}
