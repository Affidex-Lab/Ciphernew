import { providers, utils, transactions } from "near-api-js";
import type { NearConfig } from "./types";
import { getNearConfig } from "./client";
import { ensureNearKey, getNearSigner } from "./keyring";

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
    const key = await ensureNearKey();
    return key.publicKey;
  } catch {
    return null;
  }
}

export function explorerTxUrl(txHash: string): string {
  return `https://explorer.near.org/transactions/${txHash}`;
}

export async function sendNear(receiverId: string, amountNear: string): Promise<{ txHash: string }>{
  const { accountId, account } = await getNearSigner();
  const yocto = parseNearToYocto(amountNear);
  const actions = [transactions.transfer(yocto) as any];
  const res = await account.signAndSendTransaction({ receiverId, actions });
  const txHash = (res as any)?.transaction_outcome?.id || (res as any)?.transaction?.hash || "";
  return { txHash };
}

export function emitAnalytics(event: string, payload: Record<string, any>){
  try { (window as any)?.analytics?.track?.(event, payload); } catch {}
}
