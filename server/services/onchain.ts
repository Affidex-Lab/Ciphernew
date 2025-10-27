import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || '';
const ADMIN_KEY = process.env.ADMIN_EVM_PRIVATE_KEY || '';

function getWallet() {
  if (!RPC_URL || !ADMIN_KEY) throw new Error('Missing RPC_URL or ADMIN_EVM_PRIVATE_KEY');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(ADMIN_KEY, provider);
}

export async function tryFreezeWallet(accountAddress: string): Promise<{ status: 'sent' | 'skipped' | 'failed', txHash?: string, reason?: string }>{
  try {
    const wallet = getWallet();
    const abi = [ 'function setFrozenBySelf(bool frozen) external', 'function owner() view returns (address)' ];
    const c = new ethers.Contract(accountAddress, abi, wallet);
    let adminIsOwner = false;
    try { const owner = await c.owner(); adminIsOwner = owner && owner.toLowerCase() === wallet.address.toLowerCase(); } catch {}
    if (!adminIsOwner) return { status: 'skipped', reason: 'not-authorized' };
    const tx = await c.setFrozenBySelf(true);
    return { status: 'sent', txHash: tx.hash };
  } catch (e:any) {
    return { status: 'failed', reason: e?.message || String(e) };
  }
}

export async function tryProposeRecovery(accountAddress: string, newOwner: string): Promise<{ status: 'sent' | 'skipped' | 'failed', txHash?: string, reason?: string }>{
  try {
    const wallet = getWallet();
    const abi = [ 'function proposeRecovery(address newOwner) external' ];
    const c = new ethers.Contract(accountAddress, abi, wallet);
    try { const tx = await c.proposeRecovery(newOwner); return { status: 'sent', txHash: tx.hash }; } catch (e:any) {
      return { status: 'skipped', reason: 'not-authorized' };
    }
  } catch (e:any) {
    return { status: 'failed', reason: e?.message || String(e) };
  }
}

export async function tryExecuteRecovery(accountAddress: string): Promise<{ status: 'sent' | 'skipped' | 'failed', txHash?: string, reason?: string }>{
  try {
    const wallet = getWallet();
    const abi = [ 'function executeRecovery() external' ];
    const c = new ethers.Contract(accountAddress, abi, wallet);
    try { const tx = await c.executeRecovery(); return { status: 'sent', txHash: tx.hash }; } catch (e:any) {
      return { status: 'skipped', reason: 'not-authorized-or-delay' };
    }
  } catch (e:any) {
    return { status: 'failed', reason: e?.message || String(e) };
  }
}

export async function trySweep(accountAddress: string, destination: string, includeNative: boolean, tokenAddresses: string[]): Promise<{ status: 'sent' | 'skipped' | 'failed', results: Array<{ asset: string, txHash?: string, status: string, reason?: string }> }>{
  const results: Array<{ asset: string, txHash?: string, status: string, reason?: string }> = [];
  try {
    const wallet = getWallet();

    if (includeNative) {
      try {
        const provider = wallet.provider!;
        const bal = await provider.getBalance(accountAddress);
        if (bal > 0n) {
          const tx = await wallet.sendTransaction({ to: destination, value: bal });
          results.push({ asset: 'ETH', txHash: tx.hash, status: 'sent' });
        } else {
          results.push({ asset: 'ETH', status: 'skipped', reason: 'no-balance' });
        }
      } catch (e:any) {
        results.push({ asset: 'ETH', status: 'skipped', reason: 'not-authorized' });
      }
    }

    for (const t of tokenAddresses || []) {
      try {
        const erc20 = new ethers.Contract(t, [ 'function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)' ], wallet);
        const bal: bigint = await erc20.balanceOf(accountAddress);
        if (bal > 0n) {
          const tx = await erc20.transfer(destination, bal);
          results.push({ asset: t, txHash: tx.hash, status: 'sent' });
        } else {
          results.push({ asset: t, status: 'skipped', reason: 'no-balance' });
        }
      } catch (e:any) {
        results.push({ asset: t, status: 'skipped', reason: 'not-authorized' });
      }
    }

    const anySent = results.some(r => r.status === 'sent');
    return { status: anySent ? 'sent' : 'skipped', results };
  } catch (e:any) {
    return { status: 'failed', results: [] };
  }
}
