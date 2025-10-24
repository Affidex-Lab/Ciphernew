import type { NearConfig, NearNetwork } from "./types";

let cachedConfig: NearConfig | null = null;

const DEFAULTS: NearConfig = {
  network: "mainnet",
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://app.mynearwallet.com",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://explorer.near.org",
};

function fromEnv(): Partial<NearConfig> {
  const env: any = (import.meta as any).env || {};
  const network = env.VITE_NEAR_NETWORK as NearNetwork | undefined;
  const nodeUrl = env.VITE_NEAR_NODE_URL as string | undefined;
  const walletUrl = env.VITE_NEAR_WALLET_URL as string | undefined;
  const helperUrl = env.VITE_NEAR_HELPER_URL as string | undefined;
  return {
    network,
    nodeUrl,
    walletUrl,
    helperUrl,
  } as Partial<NearConfig>;
}

async function fromServer(): Promise<Partial<NearConfig>> {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (!res.ok) return {};
    const j = await res.json();
    const network = (j.nearNetwork || j.VITE_NEAR_NETWORK) as NearNetwork | undefined;
    const nodeUrl = (j.nearNodeUrl || j.VITE_NEAR_NODE_URL) as string | undefined;
    const walletUrl = (j.nearWalletUrl || j.VITE_NEAR_WALLET_URL) as string | undefined;
    const helperUrl = (j.nearHelperUrl || j.VITE_NEAR_HELPER_URL) as string | undefined;
    return { network, nodeUrl, walletUrl, helperUrl };
  } catch {
    return {};
  }
}

function fromLocalStorage(): Partial<NearConfig> {
  try {
    const network = (localStorage.getItem("near:network") || undefined) as NearNetwork | undefined;
    const nodeUrl = localStorage.getItem("near:nodeUrl") || undefined;
    const walletUrl = localStorage.getItem("near:walletUrl") || undefined;
    const helperUrl = localStorage.getItem("near:helperUrl") || undefined;
    return { network, nodeUrl, walletUrl, helperUrl };
  } catch {
    return {};
  }
}

export async function getNearConfig(): Promise<NearConfig> {
  if (cachedConfig) return cachedConfig;
  const server = await fromServer();
  const env = fromEnv();
  const ls = fromLocalStorage();
  const merged = {
    ...DEFAULTS,
    ...server,
    ...env,
    ...ls,
  } as NearConfig;
  const explorerUrl = "https://explorer.near.org";
  cachedConfig = { ...merged, explorerUrl };
  return cachedConfig;
}

export function persistNearConfig(partial: Partial<NearConfig>) {
  if (partial.network) localStorage.setItem("near:network", String(partial.network));
  if (partial.nodeUrl) localStorage.setItem("near:nodeUrl", partial.nodeUrl);
  if (partial.walletUrl) localStorage.setItem("near:walletUrl", partial.walletUrl);
  if (partial.helperUrl) localStorage.setItem("near:helperUrl", partial.helperUrl);
  cachedConfig = cachedConfig ? { ...cachedConfig, ...partial } as NearConfig : null;
}
