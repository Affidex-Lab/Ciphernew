import { connect, keyStores, KeyPair, providers, transactions, utils, Account } from 'near-api-js';
import { getNearSecretKey, setNearSecretKey, pushActivity } from './storage';
import type { Config } from './types';

export async function ensureNearKey(): Promise<{ accountId: string; secretKey: string }>{
  let sk = await getNearSecretKey();
  if (!sk){
    const kp = KeyPair.fromRandom('ed25519');
    sk = kp.toString();
    await setNearSecretKey(sk);
  }
  const kp = KeyPair.fromString(sk);
  const pub = kp.getPublicKey();
  const accountId = implicitFromPublicKey(pub);
  return { accountId, secretKey: sk };
}

export function implicitFromPublicKey(pub: utils.PublicKey | string){
  const pk = typeof pub === 'string' ? utils.PublicKey.fromString(pub) : pub;
  const raw = pk.data as Uint8Array;
  return Array.from(raw).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function getNearProvider(cfg: Config){
  return new providers.JsonRpcProvider({ url: cfg.nearNodeUrl });
}

export async function signAndSend(cfg: Config, txs: { receiverId: string; actions: any[] }[]){
  const { accountId, secretKey } = await ensureNearKey();
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(secretKey);
  await keyStore.setKey(cfg.nearNetwork, accountId, keyPair);
  const near = await connect({ networkId: cfg.nearNetwork as any, nodeUrl: cfg.nearNodeUrl, keyStore, headers: {} as any });
  const account = new Account(near.connection, accountId);
  const results = [] as any[];
  for (const t of txs){
    const res = await account.signAndSendTransaction({ receiverId: t.receiverId, actions: t.actions as any });
    const txHash = (res as any)?.transaction_outcome?.id || (res as any)?.transaction?.hash || '';
    await pushActivity({ time: Date.now(), chain: 'NEAR', kind: 'send', status: 'pending', txHash } as any);
    results.push({ txHash });
  }
  return results;
}
