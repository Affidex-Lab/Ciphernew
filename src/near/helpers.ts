import { providers, utils } from "near-api-js";
import type { NearConfig } from "./types";
import { getNearConfig } from "./client";
import { ensureSelector, getActiveNearAccountId } from "./selector";
import { formatUnits, parseUnits } from "ethers";

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

// ---------- NEP-141 (FT) helpers ----------
function b64Json(obj: any): string { return Buffer.from(JSON.stringify(obj)).toString('base64'); }

export type FtMetadata = { name?: string; symbol?: string; decimals: number; icon?: string };

export async function fetchFtMetadata(contractId: string): Promise<FtMetadata> {
  const provider = await getNearProvider();
  const res: any = await provider.query({
    request_type: "call_function",
    account_id: contractId,
    method_name: "ft_metadata",
    args_base64: b64Json({}),
    finality: "optimistic",
  });
  const raw = Buffer.from(res.result).toString();
  const meta = JSON.parse(raw);
  return { name: meta.name || "", symbol: meta.symbol || "FT", decimals: Number(meta.decimals || 18), icon: meta.icon };
}

export async function fetchFtBalanceRaw(contractId: string, accountId: string): Promise<string> {
  const provider = await getNearProvider();
  const res: any = await provider.query({
    request_type: "call_function",
    account_id: contractId,
    method_name: "ft_balance_of",
    args_base64: b64Json({ account_id: accountId }),
    finality: "optimistic",
  });
  const raw = Buffer.from(res.result).toString();
  try { const j = JSON.parse(raw); return String(j); } catch { return String(raw); }
}

export async function fetchFtBalanceFormatted(contractId: string, accountId: string): Promise<{ balance: string; decimals: number; symbol: string; name: string }>{
  const meta = await fetchFtMetadata(contractId);
  const raw = await fetchFtBalanceRaw(contractId, accountId);
  let bal = "0";
  try { bal = formatUnits(BigInt(raw || "0"), meta.decimals); } catch { bal = "0"; }
  return { balance: bal, decimals: meta.decimals, symbol: meta.symbol || "FT", name: meta.name || "Token" };
}

export async function sendFt(contractId: string, receiverId: string, amount: string): Promise<{ txHash: string }>{
  const s = await ensureSelector();
  const accId = await getActiveNearAccountId();
  if (!accId) throw new Error("Connect NEAR wallet first");
  const wallet = await s.wallet();
  const meta = await fetchFtMetadata(contractId);
  const raw = parseUnits(amount, meta.decimals).toString();
  const GAS = "100000000000000"; // 100 Tgas
  const ONE_YOCTO = "1";
  const res = await wallet.signAndSendTransactions({ transactions: [{ signerId: accId, receiverId: contractId, actions: [{ type: "FunctionCall", params: { methodName: "ft_transfer", args: { receiver_id: receiverId, amount: raw }, gas: GAS, deposit: ONE_YOCTO } }] }] });
  const txHash = Array.isArray(res) ? (res[0] as any)?.transaction?.hash || (res[0] as any)?.transaction_outcome?.id || "" : (res as any)?.transaction?.hash || "";
  return { txHash };
}

export function emitAnalytics(event: string, payload: Record<string, any>){
  try { (window as any)?.analytics?.track?.(event, payload); } catch {}
}
