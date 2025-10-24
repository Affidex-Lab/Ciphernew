import { setupWalletSelector, WalletSelector } from "@near-wallet-selector/core";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";
import type { NearConfig } from "./types";
import { getNearConfig } from "./client";

let selector: WalletSelector | null = null;
let modal: WalletSelectorModal | null = null;

export async function ensureSelector(): Promise<WalletSelector> {
  if (selector) return selector;
  const cfg: NearConfig = await getNearConfig();
  selector = await setupWalletSelector({
    network: cfg.network as any,
    debug: false,
    modules: [
      setupMyNearWallet({ walletUrl: cfg.walletUrl }),
    ],
  });
  modal = setupModal(selector, { contractId: "" });
  return selector;
}

export async function openWalletSelector() {
  await ensureSelector();
  modal?.show();
}

export async function disconnectNear() {
  const s = await ensureSelector();
  const wallet = await s.wallet();
  try { await wallet.signOut(); } catch {}
}

export async function getActiveNearAccountId(): Promise<string | null> {
  const s = await ensureSelector();
  const state = s.store.getState();
  const acc = state.accounts.find((a) => a.active);
  return acc?.accountId || null;
}
