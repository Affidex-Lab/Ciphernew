import { RecoveryFile } from './types';

function bytesToB64(bytes: ArrayBuffer | Uint8Array){
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function b64ToBytes(b64: string){
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number){
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export async function deriveKeyPBKDF2(passphrase: string, saltB64: string, iterations: number){
  const enc = new TextEncoder().encode(passphrase);
  const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  const salt = b64ToBytes(saltB64);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function aesGcmEncrypt(key: CryptoKey, plaintext: Uint8Array){
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: bytesToB64(iv), ciphertext: bytesToB64(new Uint8Array(ct)) };
}

export async function aesGcmDecrypt(key: CryptoKey, ivB64: string, ciphertextB64: string){
  const iv = b64ToBytes(ivB64);
  const ct = b64ToBytes(ciphertextB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

export async function importAesKeyRawB64(b64: string){
  const raw = b64ToBytes(b64);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function exportAesKeyRawB64(key: CryptoKey){
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToB64(new Uint8Array(raw));
}

export async function createRecoveryFile(passphrase: string, evmOwnerPrivKeyHex: string, nearSecretKey: string): Promise<RecoveryFile>{
  const salt = bytesToB64(randomBytes(16));
  const iterations = 250000;
  const kdfKey = await deriveKeyPBKDF2(passphrase, salt, iterations);
  const payload = JSON.stringify({ evm: { ownerPrivKey: evmOwnerPrivKeyHex }, near: { secretKey: nearSecretKey } });
  const enc = await aesGcmEncrypt(kdfKey, new TextEncoder().encode(payload));
  return {
    version: 1,
    kdf: { algo: 'PBKDF2', salt, iterations },
    cipher: { algo: 'AES-GCM', iv: enc.iv },
    payload: { evm: { ownerPrivKey: enc.ciphertext }, near: { secretKey: enc.ciphertext } }
  } as any; // Store combined ciphertext; decode path knows to decrypt entire blob
}

export async function parseRecoveryFile(json: RecoveryFile, passphrase: string): Promise<{ evmOwnerPrivKeyHex: string; nearSecretKey: string }>{
  if (json.version !== 1 || json.kdf.algo !== 'PBKDF2' || json.cipher.algo !== 'AES-GCM') throw new Error('Unsupported recovery file');
  const key = await deriveKeyPBKDF2(passphrase, json.kdf.salt, json.kdf.iterations);
  // We encrypted the combined payload, so read from one field
  const pt = await aesGcmDecrypt(key, json.cipher.iv, json.payload.evm.ownerPrivKey);
  const dec = JSON.parse(new TextDecoder().decode(pt));
  return { evmOwnerPrivKeyHex: dec.evm.ownerPrivKey, nearSecretKey: dec.near.secretKey };
}
