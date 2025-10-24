import { keyStores, utils, connect, KeyPair, Account, providers, transactions } from "near-api-js";
import { getNearConfig } from "./client";

const LS_WRAP_KEY = "near:keyring:kek";
const LS_KEYPAIR = "near:keypair:v1";

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)));
  return btoa(bin);
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getOrCreateWrapKey(): Promise<CryptoKey> {
  let rawB64 = localStorage.getItem(LS_WRAP_KEY);
  if (!rawB64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    rawB64 = bytesToBase64(raw);
    localStorage.setItem(LS_WRAP_KEY, rawB64);
  }
  const raw = base64ToBytes(rawB64);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function nearImplicitAccountIdFromPublicKey(pubKey: utils.PublicKey | string): string {
  const pk = typeof pubKey === "string" ? utils.PublicKey.fromString(pubKey) : pubKey;
  const raw = pk.data as Uint8Array;
  let hex = "";
  for (let i = 0; i < raw.length; i++) {
    const h = raw[i].toString(16).padStart(2, '0');
    hex += h;
  }
  return hex;
}

async function encryptPrivateKey(secretKey: string, publicKey: string) {
  const key = await getOrCreateWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify({ secretKey, publicKey }));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt);
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ct)) };
}

async function decryptPrivateKey(obj: { iv: string; ciphertext: string }): Promise<{ secretKey: string; publicKey: string }> {
  const key = await getOrCreateWrapKey();
  const iv = base64ToBytes(obj.iv);
  const ct = base64ToBytes(obj.ciphertext);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  const dec = new TextDecoder().decode(pt);
  return JSON.parse(dec);
}

export async function ensureNearKey(): Promise<{ accountId: string; publicKey: string }>{
  try {
    let stored = localStorage.getItem(LS_KEYPAIR);
    if (!stored) {
      const kp = KeyPair.fromRandom("ed25519");
      const pub = kp.getPublicKey().toString();
      const imp = nearImplicitAccountIdFromPublicKey(kp.getPublicKey());
      const enc = await encryptPrivateKey(kp.secretKey, pub);
      localStorage.setItem(LS_KEYPAIR, JSON.stringify({ ...enc, pub }));
      return { accountId: imp, publicKey: pub };
    } else {
      const obj = JSON.parse(stored);
      const dec = await decryptPrivateKey({ iv: obj.iv, ciphertext: obj.ciphertext });
      const pub = obj.pub || dec.publicKey;
      const pk = utils.PublicKey.fromString(pub);
      const accountId = nearImplicitAccountIdFromPublicKey(pk);
      return { accountId, publicKey: pub };
    }
  } catch {
    // If anything goes wrong, regenerate
    localStorage.removeItem(LS_KEYPAIR);
    return ensureNearKey();
  }
}

export async function getNearSigner(): Promise<{ accountId: string; keyPair: KeyPair; account: Account; provider: providers.JsonRpcProvider }>{
  const cfg = await getNearConfig();
  const stored = localStorage.getItem(LS_KEYPAIR);
  if (!stored) throw new Error("No NEAR key available");
  const obj = JSON.parse(stored);
  const dec = await decryptPrivateKey({ iv: obj.iv, ciphertext: obj.ciphertext });
  const keyPair = KeyPair.fromString(dec.secretKey);
  const publicKey = keyPair.getPublicKey();
  const accountId = nearImplicitAccountIdFromPublicKey(publicKey);
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(cfg.network, accountId, keyPair);
  const provider = new providers.JsonRpcProvider({ url: cfg.nodeUrl });
  const near = await connect({ networkId: cfg.network as any, nodeUrl: cfg.nodeUrl, keyStore, headers: {} as any });
  const account = new Account(near.connection, accountId);
  return { accountId, keyPair, account, provider };
}

export async function exportNearKeyEncryptedBlob(): Promise<Blob>{
  const stored = localStorage.getItem(LS_KEYPAIR);
  if (!stored) throw new Error("No NEAR key available");
  return new Blob([stored], { type: "application/json" });
}

export async function importNearKeyFromEncryptedBlob(text: string){
  const obj = JSON.parse(text);
  if (!obj?.iv || !obj?.ciphertext) throw new Error("Invalid key blob");
  localStorage.setItem(LS_KEYPAIR, JSON.stringify(obj));
}
