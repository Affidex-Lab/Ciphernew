import { providers, utils } from "near-api-js";
import type { NearConfig } from "./types";
import { getNearConfig } from "./client";
import { ensureSelector, getActiveNearAccountId } from "./selector";

export function formatYoctoToNear(yocto: string): string {
  try { return utils.format.formatNearAmount(yocto, 5); } catch { return "0"; }
}

export function parseNearToYocto(amount: string): string {
  try { return utils.format.parseNearAmount(amount) || "0"; } catch { return "0"; }
}

export async function getNearProvider(): Promise<providers.JsonRpcProvider> {
  const cfg: NearConfig = await getNearConfig();
  return new providers.JsonRpcProvider({ url: cfg.nodeUrl });
}

export async function fetchNearBalance(accountId: string): Promise<string> {
  const provider = await getNearProvider();
  const res: any = await provider.query({ request_type: "view_account", finality: "final", account_id: accountId });
  return String(res.amount || "0");
}

export async function getNearPublicKey(accountId: string): Promise<string | null> {
  try {
    const provider = await getNearProvider();
    const keys: any = await provider.query({ request_type: "view_access_key_list", finality: "final", account_id: accountId });
    const k = keys?.keys?.[0]?.public_key || keys?.keys?.[0]?.publicKey || null;
    return k;
  } catch {
    return null;
  }
}

export function explorerTxUrl(txHash: string): string {
  return `https://explorer.near.org/transactions/${txHash}`;
}

export async function sendNear(receiverId: string, amountNear: string): Promise<{ txHash: string }>{
  const s = await ensureSelector();
  const accId = await getActiveNearAccountId();
  if (!accId) throw new Error("Connect NEAR wallet first");
  const wallet = await s.wallet();
  const yocto = parseNearToYocto(amountNear);
  const res = await wallet.signAndSendTransactions({ transactions: [{ signerId: accId, receiverId, actions: [{ type: "Transfer", params: { deposit: yocto } }] }] });
  const txHash = Array.isArray(res) ? (res[0] as any)?.transaction?.hash || (res[0] as any)?.transaction_outcome?.id || "" : (res as any)?.transaction?.hash || "";
  return { txHash };
}

export function emitAnalytics(event: string, payload: Record<string, any>){
  try { (window as any)?.analytics?.track?.(event, payload); } catch {}
}
