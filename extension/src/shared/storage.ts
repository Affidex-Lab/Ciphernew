import { aesGcmDecrypt, aesGcmEncrypt, exportAesKeyRawB64, importAesKeyRawB64, randomBytes, deriveKeyPBKDF2 } from './crypto';

const STORAGE_KEYS = {
  deviceKeyRawB64: 'kek:raw',
  deviceKeyWrapped: 'kek:wrapped:v1',
  passphraseEnabled: 'kek:passphrase:enabled',
  seedless: 'seedless:v1',
  settings: 'settings:v1',
  approved: 'approved:origins:v1',
  activity: 'activity:v1',
  pending: 'pending:req:v1'
} as const;

type Wrapped = { salt: string; iterations: number; iv: string; ciphertext: string };

type Seedless = {
  evmOwnerPrivKey?: { iv: string; ciphertext: string } | null;
  nearSecretKey?: { iv: string; ciphertext: string } | null;
  accSaltHex?: string | null;
};

let sessionDeviceKey: CryptoKey | null = null;

export async function ensureDeviceKey(): Promise<CryptoKey>{
  const { [STORAGE_KEYS.passphraseEnabled]: enabled, [STORAGE_KEYS.deviceKeyRawB64]: rawB64, [STORAGE_KEYS.deviceKeyWrapped]: wrapped } = await chrome.storage.local.get([
    STORAGE_KEYS.passphraseEnabled,
    STORAGE_KEYS.deviceKeyRawB64,
    STORAGE_KEYS.deviceKeyWrapped
  ]);
  const passEnabled = Boolean(enabled);
  if (!passEnabled){
    if (!rawB64){
      const raw = randomBytes(32);
      const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
      const b64 = await exportAesKeyRawB64(key);
      await chrome.storage.local.set({ [STORAGE_KEYS.deviceKeyRawB64]: b64 });
      sessionDeviceKey = key;
      return key;
    }
    const key = await importAesKeyRawB64(rawB64);
    sessionDeviceKey = key;
    return key;
  } else {
    if (sessionDeviceKey) return sessionDeviceKey;
    if (!wrapped) throw new Error('LOCKED');
    throw new Error('LOCKED');
  }
}

export async function isLocked(): Promise<boolean>{
  const { [STORAGE_KEYS.passphraseEnabled]: enabled } = await chrome.storage.local.get(STORAGE_KEYS.passphraseEnabled);
  if (!enabled) return false;
  return !sessionDeviceKey;
}

export async function enablePassphrase(passphrase: string){
  const rawKey = await ensureDeviceKey();
  const rawB64 = await exportAesKeyRawB64(rawKey);
  const salt = btoa(String.fromCharCode(...randomBytes(16)));
  const iterations = 250000;
  const kdf = await deriveKeyPBKDF2(passphrase, salt, iterations);
  const enc = await aesGcmEncrypt(kdf, new TextEncoder().encode(rawB64));
  const wrapped: Wrapped = { salt, iterations, iv: enc.iv, ciphertext: enc.ciphertext };
  await chrome.storage.local.set({ [STORAGE_KEYS.deviceKeyWrapped]: wrapped, [STORAGE_KEYS.passphraseEnabled]: true });
  await chrome.storage.local.remove(STORAGE_KEYS.deviceKeyRawB64);
  sessionDeviceKey = null; // will require unlock
}

export async function disablePassphrase(){
  const key = await ensureDeviceKey();
  const rawB64 = await exportAesKeyRawB64(key);
  await chrome.storage.local.set({ [STORAGE_KEYS.deviceKeyRawB64]: rawB64, [STORAGE_KEYS.passphraseEnabled]: false });
  await chrome.storage.local.remove(STORAGE_KEYS.deviceKeyWrapped);
}

export async function unlock(passphrase: string){
  const { [STORAGE_KEYS.deviceKeyWrapped]: wrapped } = await chrome.storage.local.get(STORAGE_KEYS.deviceKeyWrapped);
  if (!wrapped) throw new Error('No wrapped key');
  const { salt, iterations, iv, ciphertext } = wrapped as Wrapped;
  const kdf = await deriveKeyPBKDF2(passphrase, salt, iterations);
  const pt = await aesGcmDecrypt(kdf, iv, ciphertext);
  const rawB64 = new TextDecoder().decode(pt);
  sessionDeviceKey = await importAesKeyRawB64(rawB64);
}

export async function lock(){ sessionDeviceKey = null; }

export async function saveSeedless(seedless: Seedless){
  const key = await ensureDeviceKey();
  const prev = await chrome.storage.local.get(STORAGE_KEYS.seedless);
  const cur: Seedless = prev[STORAGE_KEYS.seedless] || {};
  const next = { ...cur, ...seedless } as Seedless;
  await chrome.storage.local.set({ [STORAGE_KEYS.seedless]: next });
}

export async function setEvmOwnerPrivKeyHex(hex: string){
  const key = await ensureDeviceKey();
  const enc = await aesGcmEncrypt(key, new TextEncoder().encode(hex));
  await saveSeedless({ evmOwnerPrivKey: enc });
}

export async function getEvmOwnerPrivKeyHex(): Promise<string | null>{
  const { [STORAGE_KEYS.seedless]: v } = await chrome.storage.local.get(STORAGE_KEYS.seedless);
  const seed = v as Seedless | undefined;
  if (!seed?.evmOwnerPrivKey) return null;
  const key = await ensureDeviceKey();
  const pt = await aesGcmDecrypt(key, seed.evmOwnerPrivKey.iv, seed.evmOwnerPrivKey.ciphertext);
  return new TextDecoder().decode(pt);
}

export async function setNearSecretKey(sk: string){
  const key = await ensureDeviceKey();
  const enc = await aesGcmEncrypt(key, new TextEncoder().encode(sk));
  await saveSeedless({ nearSecretKey: enc });
}

export async function getNearSecretKey(): Promise<string | null>{
  const { [STORAGE_KEYS.seedless]: v } = await chrome.storage.local.get(STORAGE_KEYS.seedless);
  const seed = v as Seedless | undefined;
  if (!seed?.nearSecretKey) return null;
  const key = await ensureDeviceKey();
  const pt = await aesGcmDecrypt(key, seed.nearSecretKey.iv, seed.nearSecretKey.ciphertext);
  return new TextDecoder().decode(pt);
}

export async function getOrCreateAccSalt(): Promise<string>{
  const { [STORAGE_KEYS.seedless]: v } = await chrome.storage.local.get(STORAGE_KEYS.seedless);
  const seed = (v as Seedless) || {};
  if (seed.accSaltHex) return seed.accSaltHex;
  const salt = '0x' + Array.from(randomBytes(32)).map(b=>b.toString(16).padStart(2,'0')).join('');
  await saveSeedless({ accSaltHex: salt });
  return salt;
}

export async function getApproved(origin: string): Promise<{ evm?: boolean; near?: boolean }>{
  const { [STORAGE_KEYS.approved]: map } = await chrome.storage.local.get(STORAGE_KEYS.approved);
  const m = (map as any) || {};
  return m[origin] || {};
}

export async function setApproved(origin: string, perms: { evm?: boolean; near?: boolean }){
  const { [STORAGE_KEYS.approved]: map } = await chrome.storage.local.get(STORAGE_KEYS.approved);
  const m = (map as any) || {};
  m[origin] = { ...(m[origin] || {}), ...perms };
  await chrome.storage.local.set({ [STORAGE_KEYS.approved]: m });
}

export type PendingRequest = {
  id: string;
  time: number;
  origin: string;
  kind: 'evm:connect'|'evm:sign'|'evm:tx'|'near:connect'|'near:tx';
  summary: string;
  payload?: any;
};

export async function enqueuePending(req: PendingRequest){
  const { [STORAGE_KEYS.pending]: list } = await chrome.storage.local.get(STORAGE_KEYS.pending);
  const arr: PendingRequest[] = Array.isArray(list) ? list : [];
  arr.unshift(req);
  await chrome.storage.local.set({ [STORAGE_KEYS.pending]: arr.slice(0, 50) });
  try{ await chrome.action.setBadgeText({ text: String(arr.length) }); }catch{}
}

export async function listPending(): Promise<PendingRequest[]>{
  const { [STORAGE_KEYS.pending]: list } = await chrome.storage.local.get(STORAGE_KEYS.pending);
  return (Array.isArray(list) ? list : []) as PendingRequest[];
}

export async function removePending(id: string){
  const { [STORAGE_KEYS.pending]: list } = await chrome.storage.local.get(STORAGE_KEYS.pending);
  const arr: PendingRequest[] = Array.isArray(list) ? list : [];
  const next = arr.filter(x=>x.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.pending]: next });
  try{ await chrome.action.setBadgeText({ text: next.length ? String(next.length) : '' }); }catch{}
}

export async function pushActivity(item: any){
  const { [STORAGE_KEYS.activity]: list } = await chrome.storage.local.get(STORAGE_KEYS.activity);
  const arr: any[] = Array.isArray(list) ? list : [];
  arr.unshift(item);
  await chrome.storage.local.set({ [STORAGE_KEYS.activity]: arr.slice(0, 200) });
}

export async function listActivity(): Promise<any[]>{
  const { [STORAGE_KEYS.activity]: list } = await chrome.storage.local.get(STORAGE_KEYS.activity);
  return Array.isArray(list) ? list : [];
}

export async function getSettings(){
  const { [STORAGE_KEYS.settings]: s } = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return (s as any) || { passphraseEnabled: false };
}

export async function setSettings(partial: any){
  const s = await getSettings();
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: { ...s, ...partial } });
}
