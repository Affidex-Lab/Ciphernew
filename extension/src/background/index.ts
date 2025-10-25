import { eip1193_request, ensureEvmOwner, getSmartAccountAddress } from '../shared/evm';
import { ensureNearKey, signAndSend } from '../shared/near';
import { getApproved, setApproved, listActivity, isLocked, enablePassphrase, disablePassphrase, unlock, lock, enqueuePending, listPending, removePending, type PendingRequest } from '../shared/storage';
import type { Config, RecoveryFile } from '../shared/types';
import { parseRecoveryFile } from '../shared/crypto';
import { ethers } from 'ethers';

let cachedConfig: Config | null = null;
const waiters = new Map<string, { resolve: (v:any)=>void; reject: (e:any)=>void }>();

async function loadConfig(): Promise<Config>{
  if (cachedConfig) return cachedConfig;
  try{
    const url = chrome.runtime.getURL('assets/config.json');
    const res = await fetch(url, { cache: 'no-store' });
    const j = await res.json();
    cachedConfig = {
      bundlerUrl: j.bundlerUrl,
      entryPoint: j.entryPoint,
      accountFactory: j.accountFactory,
      policyId: j.policyId,
      rpcUrl: j.rpcUrl,
      chainIdHex: j.chainIdHex,
      nearNetwork: j.nearNetwork,
      nearNodeUrl: j.nearNodeUrl,
      nearWalletUrl: j.nearWalletUrl,
      nearHelperUrl: j.nearHelperUrl,
      nearDefaultTokens: j.nearDefaultTokens,
      nearDefaultNfts: j.nearDefaultNfts,
    } as Config;
  } catch {}
  if (!cachedConfig) throw new Error('Missing config');
  return cachedConfig!;
}

function summarizeEthTx(tx: any){
  const to = tx?.to || '0x';
  const val = tx?.value ? (()=>{ try{ return `${ethers.formatEther(BigInt(tx.value))} ETH`; }catch{ return String(tx.value); } })() : '0';
  return `Send ${val} to ${to}`;
}

function summarizeTyped(data: any){
  try{ const s = typeof data === 'string' ? data : JSON.stringify(data).slice(0,120); return `Sign typed data: ${s}`; }catch{ return 'Sign typed data'; }
}

function summarizeMsg(msg: any){
  const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
  return `Sign message: ${s.slice(0,120)}`;
}

async function withApproval(origin: string, kind: PendingRequest['kind'], summary: string): Promise<void>{
  const id = Math.random().toString(36).slice(2);
  await enqueuePending({ id, time: Date.now(), origin, kind, summary });
  return new Promise((resolve, reject) => { waiters.set(id, { resolve, reject }); });
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    if (!req || req.__cipherWallet__ !== true) return;
    const { origin, action, payload } = req;
    const cfg = await loadConfig();

    if (action === 'ethereum:rpc'){
      const method = payload?.method as string;
      const params = payload?.params || [];
      const perms = await getApproved(origin);
      if (method === 'eth_requestAccounts'){
        if (!perms.evm){
          await withApproval(origin, 'evm:connect', 'Connect to EVM');
          await setApproved(origin, { evm: true });
        }
        const res = await eip1193_request(cfg, origin, method, params);
        sendResponse(res); return;
      }
      if (method === 'personal_sign'){
        await withApproval(origin, 'evm:sign', summarizeMsg(params?.[0]));
        const res = await eip1193_request(cfg, origin, method, params);
        sendResponse(res); return;
      }
      if (method?.startsWith('eth_signTypedData')){
        await withApproval(origin, 'evm:sign', summarizeTyped(params?.[1]||params?.[0]));
        const res = await eip1193_request(cfg, origin, method, params);
        sendResponse(res); return;
      }
      if (method === 'eth_sendTransaction'){
        await withApproval(origin, 'evm:tx', summarizeEthTx(params?.[0]||{}));
        const res = await eip1193_request(cfg, origin, method, params);
        sendResponse(res); return;
      }
      throw new Error('Unsupported method');
    }

    if (action === 'requestApproval'){
      const { kind } = payload || {};
      await setApproved(origin, { [kind]: true });
      sendResponse({ ok: true }); return;
    }

    if (action === 'near:getAccounts'){
      const perms = await getApproved(origin);
      if (!perms.near) throw new Error('Not approved for NEAR');
      const { accountId } = await ensureNearKey();
      sendResponse({ accountId }); return;
    }

    if (action === 'near:signIn'){
      await withApproval(origin, 'near:connect', 'Connect to NEAR');
      await setApproved(origin, { near: true });
      const { accountId } = await ensureNearKey();
      sendResponse({ accountId }); return;
    }

    if (action === 'near:signOut'){
      sendResponse({ ok: true }); return;
    }

    if (action === 'near:signAndSendTransactions'){
      const perms = await getApproved(origin);
      if (!perms.near) throw new Error('Not approved for NEAR');
      const txs = payload?.txs || [];
      const summary = Array.isArray(txs) ? txs.map((t:any)=>`→ ${t.receiverId} (${(t.actions||[]).length} actions)`).join(', ').slice(0,180) : 'Send NEAR txs';
      await withApproval(origin, 'near:tx', summary);
      const res = await signAndSend(cfg, txs);
      sendResponse(res); return;
    }

    if (action === 'status'){
      const evm = await getSmartAccountAddress(cfg).catch(()=>({ account: null as any, owner: null as any }));
      const near = await ensureNearKey().catch(()=>({ accountId: null as any }));
      const acts = await listActivity();
      const locked = await isLocked();
      // balances
      let evmBalance = null as any; let nearBalance = null as any;
      try { if (evm?.account){ const r = await fetch(cfg.rpcUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_getBalance', params:[evm.account, 'latest'] })}); const j = await r.json(); evmBalance = j?.result ? ethers.formatEther(BigInt(j.result)) : null; } } catch {}
      try { if (near?.accountId){ const res = await fetch(cfg.nearNodeUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: near.accountId } }) }); const j = await res.json(); const amt = j?.result?.amount || '0'; nearBalance = (Number(amt)/1e24).toString(); } } catch {}
      const pending = await listPending();
      sendResponse({ evm, near, activity: acts, locked, config: cfg, approved: await getApproved(origin), balances: { evm: evmBalance, near: nearBalance }, pending }); return;
    }

    if (action === 'onboarding:create'){
      // ensure keys exist
      await ensureEvmOwner();
      await ensureNearKey();
      sendResponse({ ok: true }); return;
    }

    if (action === 'onboarding:importRecovery'){
      const file: RecoveryFile = payload?.file;
      const passphrase: string = payload?.passphrase || '';
      const parsed = await parseRecoveryFile(file, passphrase);
      await (await import('../shared/storage')).setEvmOwnerPrivKeyHex(parsed.evmOwnerPrivKeyHex);
      await (await import('../shared/storage')).setNearSecretKey(parsed.nearSecretKey);
      sendResponse({ ok: true }); return;
    }

    if (action === 'pending:list'){
      const list = await listPending();
      sendResponse(list); return;
    }
    if (action === 'pending:approve'){
      const { id } = payload || {}; if (!id) throw new Error('missing id');
      const w = waiters.get(id); await removePending(id); if (w){ waiters.delete(id); w.resolve(true); }
      sendResponse({ ok: true }); return;
    }
    if (action === 'pending:reject'){
      const { id } = payload || {}; if (!id) throw new Error('missing id');
      const w = waiters.get(id); await removePending(id); if (w){ waiters.delete(id); w.reject(new Error('User rejected')); }
      sendResponse({ ok: true }); return;
    }

    if (action === 'lock') { await lock(); sendResponse({ ok: true }); return; }
    if (action === 'unlock') { await unlock(payload?.passphrase || ''); sendResponse({ ok: true }); return; }
    if (action === 'enablePassphrase') { await enablePassphrase(payload?.passphrase || ''); sendResponse({ ok: true }); return; }
    if (action === 'disablePassphrase') { await disablePassphrase(); sendResponse({ ok: true }); return; }

    sendResponse({ ok: false, error: 'Unknown action' });
  })().catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true;
});
