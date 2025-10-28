import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, WalletMinimal, ChevronDown, Bell, Home as HomeIcon, Compass, ActivitySquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import {
  encodeExecuteAndBurn,
  estimateUserOp,
  getGasPrice,
  getUserOpHash,
  packInitCode,
  predictAccountAddress,
  sponsorUserOp,
  sendUserOp,
  UserOperation,
  getUserOpReceipt,
  getChainId,
} from "./lib/aa";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { Core } from "@walletconnect/core";
import { getSdkError } from "@walletconnect/utils";

// NEAR imports
import { ensureNearKey, } from "./near/keyring";
import { fetchNearBalance, formatYoctoToNear, getNearPublicKey, sendNear, explorerTxUrl, emitAnalytics } from "./near/helpers";
import { getNearConfig } from "./near/client";
import { openWalletSelector, disconnectNear as selectorDisconnect, getActiveNearAccountId, getWallet as getNearWallet, ensureSelector as ensureNearSelector } from "./near/selector";
import { KeyPair } from "near-api-js";

export default function Dashboard() {
  //Nav Variable
  const nav = useNavigate();
  
  //Other Variables
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [factory, setFactory] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [accFactory, setAccFactory] = useState("");
  const [wcProjectId, setWcProjectId] = useState("");

  const [openTransfer, setOpenTransfer] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openDisposable, setOpenDisposable] = useState(false);
  const [openWc, setOpenWc] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [disposable, setDisposable] = useState<{ address: string; privateKey: string } | null>(null);
  const [wc, setWc] = useState<any>(null);
  const [wcUri, setWcUri] = useState("");
  const [wcProposal, setWcProposal] = useState<any>(null);
  const [wcSession, setWcSession] = useState<any>(null);
  const [wcStatus, setWcStatus] = useState<string>("");

  // Stack selector: EVM vs NEAR
  const [stack, setStack] = useState<"evm" | "near">(() => ((localStorage.getItem("stack") as any) || "near"));
  useEffect(() => { localStorage.setItem("stack", stack); }, [stack]);

  // EVM states
  const [ownerPk, setOwnerPk] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [accSalt, setAccSalt] = useState<string | null>(null);
  const [accountAddr, setAccountAddr] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("");
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [usdPrice, setUsdPrice] = useState<number>(0);
  const [nearUsdPrice, setNearUsdPrice] = useState<number>(0);

  const ethRefreshInFlight = useRef(false);
  const tokenRefreshInFlight = useRef(false);
  const priceRefreshInFlight = useRef(false);

  const [debugEvm, setDebugEvm] = useState<boolean>(()=>{ try{ const p=new URLSearchParams(window.location.search); return p.get('debug')==='1' || localStorage.getItem('debug:evm')==='1'; }catch{return false;}});
  const [debugLastEth, setDebugLastEth] = useState<string>("");
  const [debugRpc, setDebugRpc] = useState<string>("");

  type Token = { address: string; symbol: string; name: string; decimals: number; balance: string };
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenAddr, setNewTokenAddr] = useState<string>("");

  type KnownToken = { address: string; symbol: string; name: string; decimals: number };
  const KNOWN_TOKENS: Record<string, KnownToken[]> = {
    "42161": [
      { address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0xFF970A61A04b1cA14834A43f5de4533ebDDB5CC8", symbol: "USDC.e", name: "USD Coin (Bridged)", decimals: 6 },
      { address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18 },
      { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
    ],
    "421614": [],
  };

  const [openAddToken, setOpenAddToken] = useState(false);
  const [addMode, setAddMode] = useState<"search"|"custom">("search");
  const [addNetKey, setAddNetKey] = useState<string>("arbitrum-sepolia");
  const [tokenQuery, setTokenQuery] = useState("");
  const [tokenIndex, setTokenIndex] = useState<Record<string, KnownToken[]>>({});
  const DEFAULT_TOKEN_ADDRESSES: Record<string, string[]> = {
    "42161": [
      "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "0xFF970A61A04b1cA14834A43f5de4533ebDDB5CC8",
      "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9",
      "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      "0x912CE59144191C1204E64559FE8253a0e49E6548",
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
    ],
    "421614": []
  };

  type HistoryItem = { time: number; chain: "EVM" | "NEAR"; kind: string; details: string; uoHash?: string; txHash?: string; status?: "pending" | "confirmed" | "failed" };
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [lastBackup, setLastBackup] = useState<{ blob: Blob, fileName: string } | null>(null);
  const [restoreCode, setRestoreCode] = useState<string>("");
  const [restoreFile, setRestoreFile] = useState<string>("");


  type EvmNet = {
    key: string;
    name: string;
    chainId: number;
    rpcUrl: string;
    bundlerUrl: string;
    entryPoint: string;
    accountFactory: string;
    disposableFactory: string;
    policyId: string;
    assetId: string;
    isTestnet: boolean;
  };

  const [evmNetOverrides, setEvmNetOverrides] = useState<Record<string, Partial<EvmNet>>>({});
  const [netFilter, setNetFilter] = useState<"mainnet" | "testnet">(() => {
    const v = (localStorage.getItem("evm:netFilter") as any) || "mainnet";
    return v === "testnet" ? "testnet" : "mainnet";
  });
  useEffect(() => { localStorage.setItem("evm:netFilter", netFilter); }, [netFilter]);

  const NETWORKS = useMemo<EvmNet[]>(() => {
    const base: EvmNet[] = [
      { key: "arbitrum-one", name: "Arbitrum One", chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc", bundlerUrl: "", entryPoint: entryPoint, accountFactory: accFactory, disposableFactory: factory, policyId: policyId, assetId: "ethereum", isTestnet: false },
      { key: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: 421614, rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", bundlerUrl: bundlerUrl, entryPoint: entryPoint, accountFactory: accFactory, disposableFactory: factory, policyId: policyId, assetId: "ethereum", isTestnet: true },
      { key: "ethereum", name: "Ethereum", chainId: 1, rpcUrl: "https://eth.llamarpc.com", bundlerUrl: "", entryPoint: "", accountFactory: "", disposableFactory: "", policyId: "", assetId: "ethereum", isTestnet: false },
      { key: "avalanche", name: "Avalanche", chainId: 43114, rpcUrl: "https://api.avax.network/ext/bc/C/rpc", bundlerUrl: "", entryPoint: "", accountFactory: "", disposableFactory: "", policyId: "", assetId: "avalanche-2", isTestnet: false },
      { key: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111, rpcUrl: "https://rpc.sepolia.org", bundlerUrl: bundlerUrl, entryPoint: entryPoint, accountFactory: accFactory, disposableFactory: factory, policyId: policyId, assetId: "ethereum", isTestnet: true },
    ];
    return base.map(n => ({ ...n, ...(evmNetOverrides[n.key] || {}) }));
  }, [bundlerUrl, entryPoint, accFactory, factory, policyId, evmNetOverrides]);
  const [activeNetworkKey, setActiveNetworkKey] = useState<string>(() => localStorage.getItem("activeNetworkKey") || "ethereum-sepolia");
  const selectedNet = useMemo(() => NETWORKS.find(n => n.key === activeNetworkKey), [NETWORKS, activeNetworkKey]);
  const rpc = useMemo(() => selectedNet?.rpcUrl || rpcUrl || "", [selectedNet, rpcUrl]);
  useEffect(()=>{ try{ setDebugRpc(rpc||''); }catch{} }, [rpc]);

  const [accounts, setAccounts] = useState<Array<{ label: string; ownerPk: string; ownerAddr: string; accSalt: string; accountAddr: string | null }>>([]);
  const [activeAccountIdx, setActiveAccountIdx] = useState<number>(0);

  function bytesToBase64(bytes: ArrayBuffer): string {
    const bin = String.fromCharCode(...new Uint8Array(bytes));
    return btoa(bin);
  }
  function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64url(bytes: ArrayBuffer | Uint8Array): string {
    const b64 = bytesToBase64(bytes instanceof Uint8Array ? bytes.buffer : bytes);
    return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
  function fromB64url(s: string): Uint8Array {
    const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
    const b64 = s.replaceAll("-", "+").replaceAll("_", "/") + pad;
    return base64ToBytes(b64);
  }
  function concatU8(...arrs: Uint8Array[]) {
    const total = arrs.reduce((n, a) => n + a.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
  }

  function randomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    let s = "";
    for (let i = 0; i < arr.length; i++) s += alphabet[arr[i] % alphabet.length];
    return `${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}-${s.slice(12,16)}`;
  }

  async function deriveKeyFromCode(code: string, salt: Uint8Array) {
    const enc = new TextEncoder();
    const raw = await crypto.subtle.importKey("raw", enc.encode(code), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" },
      raw,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function createRecoveryBackup() {
    try {
      if (!ownerPk || !ownerAddr) throw new Error("Create wallet first");
      const code = randomCode();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKeyFromCode(code, salt);
      const enc = new TextEncoder();
      const data = enc.encode(JSON.stringify({ ownerPk }));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
      const backup = {
        version: 1,
        kdf: "PBKDF2-HMAC-SHA256",
        iterations: 200000,
        algo: "AES-GCM",
        salt: bytesToBase64(salt.buffer),
        iv: bytesToBase64(iv.buffer),
        ciphertext: bytesToBase64(ct),
        address: ownerAddr,
        createdAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const fileName = `cipher-recovery-${ownerAddr.slice(2,8)}.json`;
      setLastBackup({ blob, fileName });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setRecoveryCode(code);
      try { (toast as any)?.success?.('Recovery Kit saved', { description: 'Keep the file safe. Your Recovery Code is shown above.' }); } catch {}
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  async function restoreFromBackup() {
    try {
      if (!restoreCode || !restoreFile) { try { (toast as any)?.info?.('Select a backup and enter the code'); } catch {} return; }
      const obj = JSON.parse(restoreFile);
      const salt = base64ToBytes(obj.salt);
      const iv = base64ToBytes(obj.iv);
      const key = await deriveKeyFromCode(restoreCode.trim(), salt);
      const ct = base64ToBytes(obj.ciphertext);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      const dec = new TextDecoder().decode(pt);
      const parsed = JSON.parse(dec);
      const w = new ethers.Wallet(parsed.ownerPk);
      setOwnerPk(parsed.ownerPk);
      setOwnerAddr(w.address);
      localStorage.setItem("ownerPk", parsed.ownerPk);
      localStorage.setItem("ownerAddr", w.address);
      try { (toast as any)?.success?.('Owner key restored'); } catch {}
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  async function createPasskeyRecoveryKit() {
    try {
      if (!ownerPk || !ownerAddr) throw new Error("Create wallet first");
      if (!("credentials" in navigator)) throw new Error("Passkeys not supported on this device");
      const rpId = location.hostname;
      const pubKey: PublicKeyCredentialCreationOptions = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { id: rpId, name: "Cipher Wallet" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: ownerAddr!, displayName: ownerAddr! },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
        attestation: "none",
      };
      const cred = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential;
      if (!cred) throw new Error("Passkey creation was cancelled");
      const credId = new Uint8Array(cred.rawId);
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = (await navigator.credentials.get({ publicKey: { challenge, allowCredentials: [{ id: credId, type: "public-key", transports: ["internal"] }], userVerification: "required", timeout: 60000 } })) as PublicKeyCredential;
      const resp = assertion.response as AuthenticatorAssertionResponse;
      const sig = new Uint8Array(resp.signature);
      const client = new Uint8Array(resp.clientDataJSON);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", concatU8(sig, client, challenge)));
      const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify({ ownerPk })));
      const backup = {
        version: 2,
        type: "passkey",
        rpId,
        credentialId: b64url(credId),
        challenge: b64url(challenge),
        iv: b64url(iv),
        ciphertext: b64url(new Uint8Array(ct)),
        address: ownerAddr,
        createdAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cipher-passkey-recovery-${ownerAddr.slice(2,8)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try { (toast as any)?.success?.('Passkey kit saved', { description: 'Keep it and your device passkey safe.' }); } catch {}
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  async function restoreWithPasskey(fileText: string) {
    try {
      const obj = JSON.parse(fileText);
      if (obj.type !== "passkey") throw new Error("Not a passkey recovery file");
      if (!("credentials" in navigator)) throw new Error("Passkeys not supported on this device");
      const credId = fromB64url(obj.credentialId);
      const challenge = fromB64url(obj.challenge);
      const assertion = (await navigator.credentials.get({ publicKey: { challenge, allowCredentials: [{ id: credId, type: "public-key", transports: ["internal"] }], userVerification: "required", timeout: 60000 } })) as PublicKeyCredential;
      const resp = assertion.response as AuthenticatorAssertionResponse;
      const sig = new Uint8Array(resp.signature);
      const client = new Uint8Array(resp.clientDataJSON);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", concatU8(sig, client, challenge)));
      const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
      const iv = fromB64url(obj.iv);
      const ct = fromB64url(obj.ciphertext);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      const dec = new TextDecoder().decode(pt);
      const parsed = JSON.parse(dec);
      const w = new ethers.Wallet(parsed.ownerPk);
      setOwnerPk(parsed.ownerPk);
      setOwnerAddr(w.address);
      localStorage.setItem("ownerPk", parsed.ownerPk);
      localStorage.setItem("ownerAddr", w.address);
      try { (toast as any)?.success?.('Passkey recovery successful'); } catch {}
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  function loadHistory() {
    try { setHistory(JSON.parse(localStorage.getItem("history") || "[]")); } catch { setHistory([]); }
  }
  function saveHistory(next: HistoryItem[]) {
    setHistory(next);
    localStorage.setItem("history", JSON.stringify(next));
  }
  async function updatePendingHistory() {
    try {
      const items = JSON.parse(localStorage.getItem("history") || "[]") as HistoryItem[];
      let changed = false;
      for (const it of items) {
        if (it.status === "pending" && it.uoHash) {
          const rec = await getUserOpReceipt(bundlerUrl, it.uoHash);
          const tx = rec?.receipt?.transactionHash;
          if (tx) { it.txHash = tx; it.status = "confirmed"; changed = true; }
        }
      }
      if (changed) saveHistory(items);
    } catch {}
  }

  useEffect(() => {
    try {
      if (localStorage.getItem("evm:migration:v1") !== "1") {
        const keys = ["bundlerUrl","rpcUrl","entryPoint","factory","accFactory","policyId"]; // keep wcProjectId
        for (const k of keys) localStorage.removeItem(k);
        const nk = localStorage.getItem("activeNetworkKey") || "ethereum-sepolia";
        localStorage.setItem("activeNetworkKey", nk);
        localStorage.setItem("evm:migration:v1", "1");
        try { selectNetwork(nk); } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { (async()=>{ try{ await updatePendingHistory(); }catch{} })(); }, [bundlerUrl]);

  useEffect(() => {
    (async () => {
      try {
        const DEFAULTS = {
          bundlerUrl: "https://api.pimlico.io/v2/421614/rpc?apikey=pim_kBDzXSD66Uh8PFLaiUhEHZ",
          rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
          entryPoint: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
          disposableFactory: "0xfFa7a8DB30B46cEb36685b01D766fabE298080c1",
          accountFactory: "0x8a060835a49BaCD214da97B258D5d2FE58545330",
          policyId: "sp_certain_mathemanic",
        };

        const envBundler = (import.meta as any).env?.VITE_BUNDLER_URL || "";
        const envRpc = (import.meta as any).env?.VITE_RPC_URL || "";
        const envEntry = (import.meta as any).env?.VITE_ENTRYPOINT || "";
        const envFactory = (import.meta as any).env?.VITE_FACTORY || "";
        const envAccFactory = (import.meta as any).env?.VITE_ACCOUNT_FACTORY || "";
        const envPolicy = (import.meta as any).env?.VITE_SPONSORSHIP_POLICY_ID || "";
        const envWc = (import.meta as any).env?.VITE_WC_PROJECT_ID || "";

        let serverCfg: any = {};
        try {
          const res = await fetch("/config.json", { cache: "no-store" });
          if (res.ok) serverCfg = await res.json();
        } catch {}

        const ls = (k: string) => localStorage.getItem(k) || "";

        setBundlerUrl(ls("bundlerUrl") || serverCfg.bundlerUrl || envBundler || DEFAULTS.bundlerUrl);
        setRpcUrl(ls("rpcUrl") || serverCfg.rpcUrl || envRpc || DEFAULTS.rpcUrl);
        setEntryPoint(ls("entryPoint") || serverCfg.entryPoint || envEntry || DEFAULTS.entryPoint);
        setFactory(ls("factory") || serverCfg.disposableFactory || serverCfg.factory || envFactory || DEFAULTS.disposableFactory);
        setAccFactory(ls("accFactory") || serverCfg.accountFactory || envAccFactory || DEFAULTS.accountFactory);
        setPolicyId(ls("policyId") || serverCfg.policyId || envPolicy || DEFAULTS.policyId);
        setWcProjectId(ls("wcProjectId") || serverCfg.wcProjectId || envWc || "");

        try {
          const envEvmDefaultsStr = (import.meta as any).env?.VITE_EVM_NETWORK_DEFAULTS || "";
          let envEvmDefaults: any[] = [];
          try {
            if (envEvmDefaultsStr) {
              envEvmDefaults = JSON.parse(envEvmDefaultsStr);
            }
          } catch {}

          const overridesArr = [
            ...(Array.isArray(serverCfg.evmNetworkDefaults) ? serverCfg.evmNetworkDefaults : []),
            ...(Array.isArray(envEvmDefaults) ? envEvmDefaults : [])
          ];
          const ov: Record<string, Partial<EvmNet>> = {};
          for (const o of overridesArr) {
            if (o && typeof o.key === "string") {
              const { key, ...rest } = o as any;
              ov[key] = { ...(ov[key] || {}), ...rest };
            }
          }
          try {
            const loc = JSON.parse(localStorage.getItem("evm:overrides") || "{}");
            if (loc && typeof loc === 'object') {
              for (const k of Object.keys(loc)) {
                ov[k] = { ...(ov[k] || {}), ...(loc[k] || {}) };
              }
            }
          } catch {}
          setEvmNetOverrides(ov);
        } catch {}
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc || !selectedNet) return;
        const cid = await getChainId(rpc);
        if (cid !== BigInt(selectedNet.chainId)) {
          if (selectedNet.key === 'ethereum-sepolia') {
            const candidates = [
              'https://rpc.sepolia.org',
              'https://ethereum-sepolia-rpc.publicnode.com',
              'https://ethereum-sepolia.blockpi.network/v1/rpc/public'
            ];
            for (const u of candidates) {
              try {
                const c2 = await getChainId(u);
                if (c2 === BigInt(11155111)) {
                  setRpcUrl(u);
                  const ov = { ...(evmNetOverrides||{}) };
                  ov['ethereum-sepolia'] = { ...(ov['ethereum-sepolia']||{}), rpcUrl: u };
                  setEvmNetOverrides(ov);
                  localStorage.setItem('evm:overrides', JSON.stringify(ov));
                  setChainId(c2);
                  return;
                }
              } catch {}
            }
          }
        } else {
          setChainId(cid);
        }
      } catch {}
    })();
  }, [rpc, selectedNet]);

  useEffect(() => {
    const assetId = (NETWORKS.find((n) => n.key === activeNetworkKey)?.assetId) || "ethereum";
    let timer: any;
    let mounted = true;
    const fetchPrice = async () => {
      if (priceRefreshInFlight.current) return;
      priceRefreshInFlight.current = true;
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`);
        if (res.ok) {
          const j = await res.json();
          const p = Number(j[assetId]?.usd) || 0;
          if (mounted) setUsdPrice(p);
        }
      } catch {}
      finally { priceRefreshInFlight.current = false; }
    };
    fetchPrice();
    timer = setInterval(fetchPrice, 60000);
    return () => { mounted = false; clearInterval(timer); };
  }, [activeNetworkKey, NETWORKS]);

  useEffect(() => {
    (async () => {
      try {
        const id = "near-protocol";
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
        if (res.ok) {
          const j = await res.json();
          const p = Number(j[id]?.usd) || 0;
          setNearUsdPrice(p);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!chainId) return;
        const key = `tokens:${String(chainId)}`;
        const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
        if (list.length === 0) {
          const seed = DEFAULT_TOKEN_ADDRESSES[String(chainId)] || [];
          if (seed.length) {
            localStorage.setItem(key, JSON.stringify(seed));
            await refreshTokens();
          } else {
            try { await discoverTokens(); } catch {}
          }
        }
      } catch {}
    })();
  }, [chainId]);

  useEffect(()=>{
    (async()=>{
      try{
        const sources = [
          "https://tokens.uniswap.org",
          "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
          "https://tokenlist.arbitrum.io/ArbTokenLists/arbed_erc20_tokens.json"
        ];
        const lists: any[] = [];
        for (const url of sources){
          try{ const r = await fetch(url, { cache: "no-store" }); if (r.ok){ const j = await r.json(); lists.push(j);} }catch{}
        }
        const byChain: Record<string, KnownToken[]> = {};
        for (const l of lists){
          const toks = l.tokens || l;
          if (Array.isArray(toks)){
            for (const t of toks){
              const cid = String(t.chainId || t.chainID || "");
              if (!cid) continue;
              const arr = byChain[cid] || (byChain[cid]=[]);
              const addr = (t.address || "").toLowerCase();
              if (!addr) continue;
              if (!arr.some(x=>x.address.toLowerCase()===addr)){
                arr.push({ address: t.address, symbol: t.symbol||"", name: t.name||"", decimals: Number(t.decimals||18) });
              }
            }
          }
        }
        for (const cid of Object.keys(DEFAULT_TOKEN_ADDRESSES)){
          const cur = byChain[cid] || (byChain[cid]=[]);
          for (const a of DEFAULT_TOKEN_ADDRESSES[cid]){
            if (!cur.some(x=>x.address.toLowerCase()===a.toLowerCase())) cur.push({ address: a, symbol: "", name: "", decimals: 18 });
          }
        }
        setTokenIndex(byChain);
      }catch{}
    })();
  },[]);

  useEffect(() => {
    (async () => {
      try {
        const lsAcc = localStorage.getItem("accountAddr");
        const lsPk = localStorage.getItem("ownerPk");
        const lsOwner = localStorage.getItem("ownerAddr");
        if (lsAcc && !accountAddr) setAccountAddr(lsAcc);
        if (lsPk && !ownerPk) setOwnerPk(lsPk);
        if (lsOwner && !ownerAddr) setOwnerAddr(lsOwner);
        const storedAccounts = JSON.parse(localStorage.getItem("accounts") || "[]");
        if (storedAccounts.length) { setAccounts(storedAccounts); setActiveAccountIdx(Number(localStorage.getItem("accountIdx")||"0")); }
        else if (lsPk && lsOwner) { setAccounts([{ label: "Account 1", ownerPk: lsPk, ownerAddr: lsOwner, accSalt: localStorage.getItem("accSalt")||"", accountAddr: lsAcc||null }]); setActiveAccountIdx(0); }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc) { setBalance(""); return; }
        const active = getActiveEvmAddress();
        if (!active) { setBalance(""); return; }
        const provider = getJsonRpcProvider();
        if (!provider) { setBalance(""); return; }
        const bal = await provider.getBalance(active);
        setBalance(ethers.formatEther(bal));
        try{ setDebugLastEth('ok @ '+new Date().toLocaleTimeString()); }catch{}
      } catch (e:any) { try{ setDebugLastEth('error: '+(e?.message||'')); }catch{} }
    })();
  }, [rpc, accountAddr, chainId, ownerAddr]);

  useEffect(() => {
    (async () => {
      try{
        if (!rpc || !entryPoint) return;
        if (!ownerAddr || !accSalt) return;
        const useFactory = await resolveFactoryAddr().catch(()=>null as any);
        if (!useFactory) return;
        const predicted = await predictAccountAddress(rpc, useFactory, entryPoint, ownerAddr, accSalt);
        setAccountAddr(predicted);
        localStorage.setItem("accountAddr", predicted);
        if (chainId) localStorage.setItem(`accountAddr:${String(chainId)}`, predicted);
      }catch{}
    })();
  }, [rpc, entryPoint, accFactory, factory, ownerAddr, accSalt, chainId]);

  useEffect(() => {
    try{
      if (!chainId) return;
      const saved = localStorage.getItem(`accountAddr:${String(chainId)}`);
      if (saved) setAccountAddr(saved);
    }catch{}
  }, [chainId]);

  useEffect(() => {
    try{
      if (chainId && accountAddr) localStorage.setItem(`accountAddr:${String(chainId)}`, accountAddr);
    }catch{}
  }, [chainId, accountAddr]);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc || !accountAddr || !chainId) return;
        await refreshTokens();
      } catch {}
    })();
  }, [rpc, accountAddr, chainId]);

  useEffect(() => {
    if (!rpc) return;
    let mounted = true;
    const tick = async () => {
      if (ethRefreshInFlight.current) return;
      ethRefreshInFlight.current = true;
      try {
        const active = getActiveEvmAddress();
        if (!active) return;
        const provider = getJsonRpcProvider();
        if (!provider) return;
        const bal = await provider.getBalance(active);
        if (mounted) setBalance(ethers.formatEther(bal));
        try{ setDebugLastEth('ok @ '+new Date().toLocaleTimeString()); }catch{}
      } catch (e:any) { try{ setDebugLastEth('error: '+(e?.message||'')); }catch{} }
      finally { ethRefreshInFlight.current = false; }
    };
    const id = setInterval(tick, 20000);
    return () => { mounted = false; clearInterval(id); };
  }, [rpc, accountAddr, chainId, ownerAddr]);

  useEffect(() => {
    if (!rpc || !accountAddr || !chainId) return;
    let mounted = true;
    const tick = async () => {
      if (tokenRefreshInFlight.current) return;
      tokenRefreshInFlight.current = true;
      try { await refreshTokens(); } catch {}
      finally { tokenRefreshInFlight.current = false; }
    };
    const id = setInterval(tick, 35000);
    return () => { mounted = false; clearInterval(id); };
  }, [rpc, accountAddr, chainId]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      try {
        if (event.origin !== window.location.origin) return;
        const data = event.data;
        if (data && typeof data === 'object' && data.type === 'wc-uri' && typeof data.uri === 'string' && data.uri.startsWith('wc:')) {
          setWcUri(data.uri);
          try { await wcPair(data.uri); } catch {}
        }
      } catch {}
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const configReady = useMemo(() => {
    try { return Boolean(bundlerUrl && ethers.isAddress(entryPoint) && ethers.isAddress(accFactory)); } catch { return false; }
  }, [bundlerUrl, entryPoint, accFactory]);

  const actionsReady = useMemo(() => {
    try { return Boolean(ethers.isAddress(entryPoint) && ethers.isAddress(accFactory)); } catch { return false; }
  }, [entryPoint, accFactory]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const auto = params.get("autocreate") === "1";
      if (auto && !accountAddr && configReady) { createWallet(); }
    } catch {}
  }, [accountAddr, configReady]);

  function saveConfig() {
    try {
      localStorage.setItem("wcProjectId", wcProjectId);
      const key = activeNetworkKey;
      const ov: Record<string, Partial<EvmNet>> = { ...(evmNetOverrides || {}) };
      const cur = ov[key] || {};
      ov[key] = {
        ...cur,
        bundlerUrl: bundlerUrl || cur.bundlerUrl || "",
        rpcUrl: rpcUrl || cur.rpcUrl || "",
        entryPoint: entryPoint || cur.entryPoint || "",
        accountFactory: accFactory || cur.accountFactory || "",
        disposableFactory: factory || cur.disposableFactory || "",
        policyId: policyId || cur.policyId || "",
      };
      localStorage.setItem("evm:overrides", JSON.stringify(ov));
      setEvmNetOverrides(ov);
    } catch {
      // ignore
    }
  }

  function selectNetwork(key: string){
    setActiveNetworkKey(key);
    try { localStorage.setItem("activeNetworkKey", key); } catch {}
    const n = NETWORKS.find(x=>x.key===key)!;
    setRpcUrl(n.rpcUrl || "");
    setBundlerUrl(n.bundlerUrl || "");
    setEntryPoint(n.entryPoint || "");
    setAccFactory(n.accountFactory || "");
    setFactory(n.disposableFactory || "");
    setPolicyId(n.policyId || "");
    saveConfig();
  }

  useEffect(() => {
    try {
      const n = NETWORKS.find(x=>x.key===activeNetworkKey);
      if (n) {
        setRpcUrl(n.rpcUrl || "");
        setBundlerUrl(n.bundlerUrl || "");
        setEntryPoint(n.entryPoint || "");
        setAccFactory(n.accountFactory || "");
        setFactory(n.disposableFactory || "");
        setPolicyId(n.policyId || "");
      }
    } catch {}
  }, [activeNetworkKey, NETWORKS]);

  function createNewAccount(){
    const w = ethers.Wallet.createRandom();
    const s = ethers.hexlify(ethers.randomBytes(32));
    const rec = { label: `Account ${accounts.length+1}`, ownerPk: w.privateKey, ownerAddr: w.address, accSalt: s, accountAddr: null as string | null };
    const next = [...accounts, rec];
    setAccounts(next);
    localStorage.setItem("accounts", JSON.stringify(next));
    setActiveAccountIdx(next.length-1);
    setOwnerPk(w.privateKey); setOwnerAddr(w.address); setAccSalt(s); setAccountAddr(null);
    localStorage.setItem("ownerPk", w.privateKey); localStorage.setItem("ownerAddr", w.address); localStorage.setItem("accSalt", s); localStorage.removeItem("accountAddr");
  }

  function selectAccount(idx: number){
    const a = accounts[idx];
    if (!a) return;
    setActiveAccountIdx(idx);
    localStorage.setItem("accountIdx", String(idx));
    setOwnerPk(a.ownerPk); setOwnerAddr(a.ownerAddr); setAccSalt(a.accSalt); setAccountAddr(a.accountAddr||null);
    localStorage.setItem("ownerPk", a.ownerPk); localStorage.setItem("ownerAddr", a.ownerAddr); localStorage.setItem("accSalt", a.accSalt);
    if (a.accountAddr) localStorage.setItem("accountAddr", a.accountAddr); else localStorage.removeItem("accountAddr");
  }

  function resetToServerConfig() {
    localStorage.removeItem("bundlerUrl");
    localStorage.removeItem("entryPoint");
    localStorage.removeItem("factory");
    localStorage.removeItem("policyId");
    location.reload();
  }

  function ensureOwnerAndSalt() {
    let w: ethers.Wallet;
    if (ownerPk && ownerAddr) {
      w = new ethers.Wallet(ownerPk);
    } else {
      w = ethers.Wallet.createRandom();
      setOwnerPk(w.privateKey);
      setOwnerAddr(w.address);
      localStorage.setItem("ownerPk", w.privateKey);
      localStorage.setItem("ownerAddr", w.address);
    }
    let s = accSalt;
    if (!s) {
      s = ethers.hexlify(ethers.randomBytes(32));
      setAccSalt(s);
    }
    return { w, salt: s as string };
  }

  async function ensureWc(){
    if (wc) return wc;
    if (!wcProjectId) { try { (toast as any)?.info?.('Set WalletConnect Project ID in Settings'); } catch {} throw new Error('No WalletConnect projectId'); }
    const core = new Core({ projectId: wcProjectId });
    const web3wallet = await Web3Wallet.init({ core, metadata: { name: 'Cipher Wallet', description: 'Seedless wallet with disposable keys', url: window.location.origin, icons: [window.location.origin + '/vite.svg'] } });
    setWc(web3wallet);
    setWcStatus('Ready');
    web3wallet.on('session_proposal', (proposal)=>{ setWcProposal(proposal); setOpenWc(true); });
    web3wallet.on('session_delete', ()=>{ setWcSession(null); setWcStatus('Disconnected'); });
    web3wallet.on('session_request', async (event:any)=>{
      const { topic, id, params } = event;
      const { request, chainId: reqChain } = params;
      try{
        if (!disposable) throw new Error('Create a disposable key first');
        if (!chainId) throw new Error('Select a network');
        const sessionChain = `eip155:${String(chainId)}`;
        if (reqChain && reqChain !== sessionChain) throw new Error('Requested chain not supported');
        let result:any;
        if (request.method === 'personal_sign' || request.method === 'eth_sign'){
          const msg = (request.params?.[0] && request.params?.[0].startsWith('0x')) ? ethers.getBytes(request.params[0]) : new TextEncoder().encode(request.params?.[0] || '');
          const w = new ethers.Wallet(disposable.privateKey);
          result = await w.signMessage(msg);
        } else if (request.method?.startsWith('eth_signTypedData')){
          const w = new ethers.Wallet(disposable.privateKey);
          const data = request.params?.[1] || request.params?.[0];
          result = await w.signMessage(typeof data === 'string' ? data : JSON.stringify(data));
        } else if (request.method === 'eth_sendTransaction'){
          const tx = request.params?.[0] || {};
          const provider = new ethers.JsonRpcProvider(rpc);
          const w = new ethers.Wallet(disposable.privateKey, provider);
          const resp = await w.sendTransaction({ to: tx.to, data: tx.data, value: tx.value ? BigInt(tx.value) : undefined, gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined, gasLimit: tx.gas || tx.gasLimit ? BigInt(tx.gas || tx.gasLimit) : undefined });
          result = resp.hash;
        } else {
          throw new Error('Unsupported request: ' + request.method);
        }
        await web3wallet.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', result } });
      }catch(err:any){
        await (wc || web3wallet).respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', error: { code: getSdkError('USER_REJECTED').code, message: err?.message || 'Rejected' } } });
      }
    });
    return web3wallet;
  }

  async function wcPair(uriOverride?: string){
    try{
      const web3wallet = await ensureWc();
      const uri = (uriOverride ?? wcUri).trim();
      await web3wallet.core.pairing.pair({ uri });
      setWcStatus('Pairing…');
    }catch(e:any){ try { (toast as any)?.error?.('Could not pair', { description: e?.message || String(e) }); } catch {} }
  }

  async function wcApprove(){
    try{
      if (!wcProposal || !disposable || !chainId) return;
      const web3wallet = await ensureWc();
      const namespaces:any = { eip155: { accounts: [`eip155:${String(chainId)}:${disposable.address}`], methods: ['eth_sendTransaction','eth_sign','personal_sign','eth_signTypedData','eth_signTypedData_v4'], events: ['accountsChanged','chainChanged'] } };
      await web3wallet.approveSession({ id: wcProposal.id, namespaces });
      setWcSession({ topic: wcProposal?.params?.pairingTopic });
      setWcProposal(null);
      setWcStatus('Connected');
      try { (toast as any)?.success?.('WalletConnect session approved'); } catch {}
    }catch(e:any){ try { (toast as any)?.error?.('Approval failed', { description: e?.message || String(e) }); } catch {} }
  }

  async function wcReject(){
    try{ const web3wallet = await ensureWc(); await web3wallet.rejectSession({ id: wcProposal.id, reason: getSdkError('USER_REJECTED') }); setWcProposal(null); }catch{}
  }

  async function wcDisconnect(){
    try{ if (!wcSession?.topic && wc?.getActiveSessions){ const sessions = Object.values(wc.getActiveSessions()); if (sessions[0]) wcSession.topic = (sessions[0] as any).topic; }
      if (wcSession?.topic) { await (wc).disconnectSession({ topic: wcSession.topic, reason: getSdkError('USER_DISCONNECTED') }); }
      setWcSession(null); setWcStatus('Disconnected');
    }catch{}
  }

  async function resolveFactoryAddr() {
    const provider = new ethers.JsonRpcProvider(rpc);
    const check = async (addr: string) => (ethers.isAddress(addr) ? await provider.getCode(addr) : "0x");
    const codeAcc = await check(accFactory);
    if (codeAcc && codeAcc !== "0x") return accFactory;
    const codeDisp = await check(factory);
    if (codeDisp && codeDisp !== "0x") return factory;
    throw new Error("No valid factory deployed at configured addresses on this chain");
  }

  async function deployAccount() {
    const { w, salt } = ensureOwnerAndSalt();
    const useFactory = await resolveFactoryAddr();
    const predicted = await predictAccountAddress(rpc, useFactory, entryPoint, w.address, salt);
    setAccountAddr(predicted);
    localStorage.setItem("accountAddr", predicted);

    let userOp: UserOperation = {
      sender: predicted,
      nonce: 0n,
      initCode: packInitCode(useFactory, entryPoint, w.address, salt),
      callData: "0x",
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      paymasterAndData: "0x",
      signature: "0x",
    };
    const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
    const gasPrice = await getGasPrice(bundlerUrl);
    userOp = {
      ...userOp,
      callGasLimit: BigInt(est.callGasLimit) + 20000n,
      verificationGasLimit: BigInt(est.verificationGasLimit) + 20000n,
      preVerificationGas: BigInt(est.preVerificationGas) + 20000n,
      maxFeePerGas: gasPrice.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
    };
    const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
    userOp.paymasterAndData = spon.paymasterAndData;
    const uoh = await getUserOpHash(rpc, entryPoint, userOp);
    const sig = await w.signMessage(ethers.getBytes(uoh));
    userOp.signature = sig;
    setStatus((s) => s + `\nDeploying account ${predicted}...`);
    const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
    setStatus((s) => s + `\nDeploy submitted: ${uoHash}`);
    try {
      let base = '';
      try { base = (import.meta as any).env?.VITE_API_BASE || ''; } catch {}
      if (!base) {
        try { const r = await fetch('/config.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); (window as any).__APP_CONFIG__ = j; base = j.apiBase || j.adminApiBase || ''; } } catch {}
      }
      const url = (base ? base.replace(/\/$/, '') : '') + '/webhooks/wallet-created';
      const body = { type: 'cipher', chainId: Number(chainId || 0), ownerAddress: w.address, accountAddress: predicted };
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(()=>{});
    } catch {}
    const next = [...history, { time: Date.now(), chain: "EVM", kind: "deploy", details: predicted, uoHash, status: "pending" }];
    saveHistory(next);
  }

  async function createWallet() {
    try {
      if (!configReady) { setStatus("Config not loaded yet. Please wait a second or open Settings to configure."); return; }
      setStatus("Creating your seedless wallet...");
      await deployAccount();
      try{ const { accountId, publicKey } = await ensureNearKey(); setNearAccountId(accountId); setNearPublicKey(publicKey); const bal = await fetchNearBalance(accountId).catch(()=>"0"); setNearBalance(formatYoctoToNear(bal)); }catch{}
    } catch (e: any) {
      try { (toast as any)?.error?.("Transfer failed", { description: "Check the address and amount, then try again." }); } catch {}
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  async function sendDisposableTx() {
    try {
      setStatus("Preparing...");
      setTxHash(null);

      const ownerWallet = ethers.Wallet.createRandom();
      const owner = ownerWallet.address;
      const salt = ethers.hexlify(ethers.randomBytes(32));

      const sender = await predictAccountAddress(rpc, factory, entryPoint, owner, salt);
      const value = ethers.parseEther((amount || "0").toString());
      const initCode = packInitCode(factory, entryPoint, owner, salt);
      const callData = encodeExecuteAndBurn(recipient, value, "0x");

      let userOp: UserOperation = {
        sender,
        nonce: 0n,
        initCode,
        callData,
        callGasLimit: 0n,
        verificationGasLimit: 0n,
        preVerificationGas: 0n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        paymasterAndData: "0x",
        signature: "0x",
      };

      setStatus((s) => s + "\nEstimating gas...");
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);

      userOp = {
        ...userOp,
        callGasLimit: BigInt(est.callGasLimit) + 20000n,
        verificationGasLimit: BigInt(est.verificationGasLimit) + 20000n,
        preVerificationGas: BigInt(est.preVerificationGas) + 20000n,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
      };

      setStatus((s) => s + "\nRequesting sponsorship...");
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;

      setStatus((s) => s + "\nComputing userOpHash...");
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await ownerWallet.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;

      setStatus((s) => s + "\nSending user operation...");
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s) => s + `\nSubmitted: ${uoHash}\nWaiting for receipt...`);

      const recItem: HistoryItem = { time: Date.now(), chain: "EVM", kind: "disposable", details: `${amount} ETH → ${recipient}`, uoHash, status: "pending" };
      saveHistory([...history, recItem]);

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const rec = await getUserOpReceipt(bundlerUrl, uoHash);
        const tx = rec?.receipt?.transactionHash;
        if (tx) {
          setTxHash(tx);
          setStatus((s) => s + `\nConfirmed: ${tx}`);
          const next = JSON.parse(localStorage.getItem("history") || "[]") as HistoryItem[];
          const idx = next.findIndex(h => h.uoHash === uoHash);
          if (idx >= 0) { next[idx].txHash = tx; next[idx].status = "confirmed"; saveHistory(next); }
          break;
        }
      }
      setOpenTransfer(false);
    } catch (e: any) {
      try { (toast as any)?.error?.("Transfer failed", { description: "Check the address and amount, then try again." }); } catch {}
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  function createDisposableKey(){
    const w = ethers.Wallet.createRandom();
    setDisposable({ address: w.address, privateKey: w.privateKey });
    setOpenDisposable(true);
    try { (toast as any)?.success?.('Disposable key created', { description: 'Kept only in memory. End the session to destroy.' }); } catch {}
  }
  function endDisposableSession(){
    setDisposable(null);
    setOpenDisposable(false);
    try { (toast as any)?.info?.('Disposable key destroyed'); } catch {}
  }
  function ensureDisposableKey(){
    if (!disposable) {
      const w = ethers.Wallet.createRandom();
      setDisposable({ address: w.address, privateKey: w.privateKey });
    }
  }

  function getActiveEvmAddress(): string | null {
    try {
      const cid = chainId ? String(chainId) : '';
      const saved = cid ? (localStorage.getItem(`accountAddr:${cid}`) || '') : '';
      return accountAddr || (saved || null) || ownerAddr || null;
    } catch { return accountAddr || ownerAddr || null; }
  }

  function getJsonRpcProvider(): ethers.JsonRpcProvider | null {
    try {
      if (!rpc) return null;
      if (chainId === 11155111n) {
        const candidates = [
          rpc,
          'https://rpc.sepolia.org',
          'https://ethereum-sepolia-rpc.publicnode.com',
          'https://ethereum-sepolia.blockpi.network/v1/rpc/public'
        ];
        for (const u of candidates) {
          if (u && typeof u === 'string') {
            try { return new ethers.JsonRpcProvider(u); } catch {}
          }
        }
        return new ethers.JsonRpcProvider(rpc);
      }
      return new ethers.JsonRpcProvider(rpc);
    } catch { return null; }
  }

  async function refreshTokens() {
    try {
      if (!rpc) return;
      const active = getActiveEvmAddress();
      if (!active) return;
      const provider = getJsonRpcProvider();
      if (!provider) return;
      const key = `tokens:${String(chainId||"")}`;
      const stored = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const next: Token[] = [];
      for (const addr of stored) {
        const a = addr as string;
        try {
          const erc20 = new ethers.Contract(a, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)",
          ], provider);
          let name = "", symbol = "", decimals = 18, raw: bigint = 0n;
          try { name = await erc20.name(); } catch {}
          try { symbol = await erc20.symbol(); } catch {}
          try { decimals = Number(await erc20.decimals()); } catch {}
          try { raw = await erc20.balanceOf(active); } catch {}
          next.push({ address: a, name: name||"Token", symbol: symbol||"ERC20", decimals, balance: ethers.formatUnits(raw, decimals) });
        } catch {}
      }
      setTokens(next);
    } catch {}
  }

  function addTokenAddressToList(addr: string, targetChainId?: number | string){
    const cid = String(targetChainId ?? chainId ?? "");
    const key = `tokens:${cid}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    if (!list.includes(addr)) {
      list.push(addr);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  function addTokenAddressToListCurrent(addr: string){
    const key = `tokens:${String(chainId||"")}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    if (!list.includes(addr)) {
      list.push(addr);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  async function addToken() {
    try {
      const addr = newTokenAddr.trim();
      if (!ethers.isAddress(addr)) { try { (toast as any)?.info?.('Enter a valid token address'); } catch {} return; }
      addTokenAddressToListCurrent(addr);
      try { (toast as any)?.success?.('Token added'); } catch {}
      setNewTokenAddr("");
      await refreshTokens();
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  async function discoverTokens() {
    try {
      if (!rpc || !accountAddr) return;
      const provider = new ethers.JsonRpcProvider(rpc);
      const latest = await provider.getBlockNumber();
      const fromBlock = latest - 120000 > 0 ? latest - 120000 : 0;
      const topic = ethers.id("Transfer(address,address,uint256)");
      const toLogs = await provider.getLogs({ fromBlock, toBlock: latest, topics: [topic, null, ethers.zeroPadValue(accountAddr, 32)] });
      const fromLogs = await provider.getLogs({ fromBlock, toBlock: latest, topics: [topic, ethers.zeroPadValue(accountAddr, 32), null] });
      const addresses = Array.from(new Set([...toLogs, ...fromLogs].map(l => l.address)));
      const key = `tokens:${String(chainId||"")}`;
      const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      let changed = false;
      for (const addr of addresses) if (!list.includes(addr)) { list.push(addr); changed = true; }
      if (changed) { localStorage.setItem(key, JSON.stringify(list)); await refreshTokens(); }
    } catch (e: any) {
      try { (toast as any)?.error?.('Something went wrong', { description: e?.message || String(e) }); } catch {}
    }
  }

  // NEAR state and effects
  const [nearAccountId, setNearAccountId] = useState<string | null>(null);
  const [nearPublicKey, setNearPublicKey] = useState<string | null>(null);
  const [nearBalance, setNearBalance] = useState<string>("");
  const [nearTxHash, setNearTxHash] = useState<string | null>(null);
  const [openNearSend, setOpenNearSend] = useState(false);
  const [openNearReceive, setOpenNearReceive] = useState(false);
  const [nearReceiver, setNearReceiver] = useState("");
  const [openNearDisposable, setOpenNearDisposable] = useState(false);
  const [nearDisposable, setNearDisposable] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [nearKeyAttached, setNearKeyAttached] = useState<boolean>(false);
  const [nearAmount, setNearAmount] = useState("");

  type NearToken = { contractId: string; symbol: string; name: string; decimals: number; balance: string };
  const [nearTokens, setNearTokens] = useState<NearToken[]>([]);
  const [openNearAddToken, setOpenNearAddToken] = useState(false);
  const [newNearTokenId, setNewNearTokenId] = useState("");

  type NearNftItem = { token_id: string; title?: string; media?: string };
  type NearNftCollection = { contractId: string; name?: string; symbol?: string; items: NearNftItem[] };
  const [nearNftCollections, setNearNftCollections] = useState<NearNftCollection[]>([]);
  const [openNearAddNft, setOpenNearAddNft] = useState(false);
  const [newNearNftId, setNewNearNftId] = useState("");

  async function refreshNearSession() {
    try {
      const { accountId, publicKey } = await ensureNearKey();
      setNearAccountId(accountId);
      localStorage.setItem("near:accountId", accountId);
      const bal = await fetchNearBalance(accountId).catch(()=>"0");
      setNearBalance(formatYoctoToNear(bal));
      setNearPublicKey(publicKey);
    } catch {}
  }

  useEffect(() => { (async()=>{ try{ await refreshNearSession(); }catch{} })(); }, []);

  useEffect(()=>{
    (async()=>{
      try{
        const cfg = await getNearConfig();
        const tkey = `near:tokens:${cfg.network}`;
        const nkey = `near:nfts:${cfg.network}`;
        const list = JSON.parse(localStorage.getItem(tkey) || "[]");
        if (!Array.isArray(list) || list.length===0){ localStorage.setItem(tkey, JSON.stringify((cfg.nearDefaultTokens && cfg.nearDefaultTokens.length ? cfg.nearDefaultTokens : ["wrap.near","usdt.tether-token.near"]))); }
        const nlist = JSON.parse(localStorage.getItem(nkey) || "[]");
        if (!Array.isArray(nlist)) localStorage.setItem(nkey, JSON.stringify(cfg.nearDefaultNfts || []));
        await refreshNearTokens();
        await refreshNearNfts();
      }catch{}
    })();
  }, [nearAccountId]);

  useEffect(() => {
    if (!nearAccountId) return;
    const t = setInterval(async () => {
      try {
        const bal = await fetchNearBalance(nearAccountId);
        setNearBalance(formatYoctoToNear(bal));
      } catch {}
    }, 20000);
    return () => clearInterval(t);
  }, [nearAccountId]);

  async function nearViewFunction(contractId: string, method: string, args?: any){
    const { providers } = await import("near-api-js");
    const cfg = await getNearConfig();
    const provider = new providers.JsonRpcProvider({ url: cfg.nodeUrl });
    const res: any = await provider.query({ request_type: "call_function", account_id: contractId, method_name: method, args_base64: btoa(JSON.stringify(args || {})), finality: "final" });
    const out = new TextDecoder().decode(res.result || new Uint8Array());
    try { return JSON.parse(out); } catch { return out; }
  }

  async function refreshNearTokens(){
    try{
      if (!nearAccountId) return;
      const cfg = await getNearConfig();
      const key = `near:tokens:${cfg.network}`;
      const ids = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const list: NearToken[] = [];
      for (const id of ids){
        try{
          const meta = await nearViewFunction(id, "ft_metadata", {});
          const balRaw = await nearViewFunction(id, "ft_balance_of", { account_id: nearAccountId });
          const decimals = Number(meta?.decimals || 24);
          const symbol = String(meta?.symbol || "FT");
          const name = String(meta?.name || "Fungible Token");
          const balance = (()=>{ try{ return ethers.formatUnits(balRaw || "0", decimals); } catch { return "0"; } })();
          list.push({ contractId: id, symbol, name, decimals, balance });
        }catch{}
      }
      setNearTokens(list);
    }catch{}
  }

  async function refreshNearNfts(){
    try{
      if (!nearAccountId) return;
      const cfg = await getNearConfig();
      const key = `near:nfts:${cfg.network}`;
      const ids = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const cols: NearNftCollection[] = [];
      for (const id of ids){
        try{
          const meta = await nearViewFunction(id, "nft_metadata", {});
          const tokens = await nearViewFunction(id, "nft_tokens_for_owner", { account_id: nearAccountId, from_index: "0", limit: 50 });
          const items = Array.isArray(tokens) ? tokens.map((t:any)=> ({ token_id: String(t.token_id||t.tokenId||""), title: t.metadata?.title, media: t.metadata?.media })) : [];
          cols.push({ contractId: id, name: meta?.name, symbol: meta?.symbol, items });
        }catch{}
      }
      setNearNftCollections(cols);
    }catch{}
  }

  async function addNearToken(){
    try{
      const id = newNearTokenId.trim();
      if (!id) return;
      const cfg = await getNearConfig();
      const key = `near:tokens:${cfg.network}`;
      const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
      setNewNearTokenId("");
      setOpenNearAddToken(false);
      try { (toast as any)?.success?.('Token added'); } catch {}
      await refreshNearTokens();
    }catch(e:any){ try { (toast as any)?.error?.('Could not add token', { description: e?.message || String(e) }); } catch {} }
  }

  async function addNearNft(){
    try{
      const id = newNearNftId.trim();
      if (!id) return;
      const cfg = await getNearConfig();
      const key = `near:nfts:${cfg.network}`;
      const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
      setNewNearNftId("");
      setOpenNearAddNft(false);
      try { (toast as any)?.success?.('NFT collection added'); } catch {}
      await refreshNearNfts();
    }catch(e:any){ try { (toast as any)?.error?.('Could not add NFT collection', { description: e?.message || String(e) }); } catch {} }
  }

  async function handleConnectNear(){
    try{
      await openWalletSelector();
      const acc = await getActiveNearAccountId();
      if (acc){
        setNearAccountId(acc);
        const bal = await fetchNearBalance(acc).catch(()=>"0");
        setNearBalance(formatYoctoToNear(bal));
      }
    }catch(e:any){ try { (toast as any)?.error?.('NEAR connect failed', { description: e?.message || String(e) }); } catch {} }
  }

  async function handleDisconnectNear(){
    try{ await selectorDisconnect(); setNearAccountId(null); setNearBalance(""); }catch{}
  }

  async function sendNearFlow(){
    try{
      setStatus("Preparing NEAR transfer...");
      const cfg = await getNearConfig();
      const { txHash } = await sendNear(nearReceiver.trim(), nearAmount.trim());
      setNearTxHash(txHash || null);
      emitAnalytics('near_send', { network: cfg.network, accountId: nearAccountId, amount: nearAmount });
      try { (toast as any)?.success?.('NEAR sent'); } catch {}
      setOpenNearSend(false);
      const recItem: HistoryItem = { time: Date.now(), chain: "NEAR", kind: "send", details: `${nearAmount} Ⓝ → ${nearReceiver}`, txHash: txHash || undefined, status: "confirmed" };
      saveHistory([...(history||[]), recItem]);
    }catch(e:any){ try { (toast as any)?.error?.('NEAR transfer failed', { description: e?.message || String(e) }); } catch {} }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden dark:bg-gradient-to-b dark:from-black via-background to-background pb-20">
      <header className="mx-auto w-full max-w-6xl px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <ToggleGroup
            type="single"
            value={stack}
            onValueChange={(v) => v && setStack(v as any)}
            variant="outline"
            size="sm"
            className="mr-1"
          >
            <ToggleGroupItem value="evm">EVM</ToggleGroupItem>
            <ToggleGroupItem value="near">NEAR</ToggleGroupItem>
          </ToggleGroup>

          {stack === "evm" && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 max-w-full sm:max-w-[260px] overflow-hidden"
                  >
                    <WalletMinimal className="h-4 w-4" />
                    <span className="truncate">
                      {NETWORKS.find((n) => n.key === activeNetworkKey)?.name ||
                        "Network"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="z-100 border border-gray-200 dark:border-gray-700 shadow-xl"
                  style={{
                    backgroundColor:
                      document.documentElement.classList.contains("dark")
                        ? "rgba(17, 24, 39, 1)" // solid dark gray
                        : "rgba(255, 255, 255, 1)", // solid white
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                  }}
                >
                  <DropdownMenuLabel>Networks</DropdownMenuLabel>
                  <div className="px-2 pb-1">
                    <ToggleGroup
                      type="single"
                      value={netFilter}
                      onValueChange={(v) => v && setNetFilter(v as any)}
                      variant="outline"
                      size="sm"
                    >
                      <ToggleGroupItem value="mainnet">Mainnet</ToggleGroupItem>
                      <ToggleGroupItem value="testnet">Testnet</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {(() => {
                    const active = NETWORKS.find((n) => n.key === activeNetworkKey);
                    const filtered = NETWORKS.filter((n) => (netFilter === "mainnet" ? !n.isTestnet : n.isTestnet));
                    const inFiltered = filtered.some((n) => n.key === activeNetworkKey);
                    const list = filtered;
                    return (
                      <>
                        {!inFiltered && (
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Currently on {active?.name}; filter is showing {netFilter === "mainnet" ? "Mainnets" : "Testnets"}.
                          </DropdownMenuLabel>
                        )}
                        {list.map((n) => (
                          <DropdownMenuItem key={n.key} onClick={() => selectNetwork(n.key)}>
                            {n.name}
                          </DropdownMenuItem>
                        ))}
                      </>
                    );
                  })()}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled>
                    Manage networks
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 max-w-full sm:max-w-[200px] overflow-hidden"
                  >
                    <span className="truncate">
                      {accounts[activeAccountIdx]?.label || "Account"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Accounts</DropdownMenuLabel>
                  {accounts.map((a, i) => (
                    <DropdownMenuItem key={i} onClick={() => selectAccount(i)}>
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={createNewAccount}>
                    Create new account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {stack === "near" && (
            <div className="text-sm text-muted-foreground">NEAR Mainnet</div>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            variant="outline"
            size="icon"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((v) => !v)}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <a href="/help" className="inline-flex">
            <Button variant="outline" size="sm">
              Help
            </Button>
          </a>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full px-4 sm:max-w-lg overflow-y-auto max-h-[90vh]">
              <SheetHeader>
                <SheetTitle>Configuration</SheetTitle>
              </SheetHeader>
              <div className="space-y-5">
                <div className="space-y-1 sm:space-y-2">
                  <Label>Bundler RPC URL</Label>
                  <Input
                    value={bundlerUrl}
                    onChange={(e) => setBundlerUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>EntryPoint Address</Label>
                  <Input
                    value={entryPoint}
                    onChange={(e) => setEntryPoint(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>Account Factory Address</Label>
                  <Input
                    value={accFactory}
                    onChange={(e) => setAccFactory(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>Disposable Factory Address</Label>
                  <Input
                    value={factory}
                    onChange={(e) => setFactory(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>Chain RPC URL</Label>
                  <Input
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>Sponsorship Policy ID</Label>
                  <Input
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                    placeholder="sp_..."
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label>WalletConnect Project ID</Label>
                  <Input
                    value={wcProjectId}
                    onChange={(e) => setWcProjectId(e.target.value)}
                    placeholder="wc_..."
                  />
                </div>
                <div className="flex gap-2 pt-2 sm:space-y-2">
                  <Button className="flex-1" onClick={saveConfig}>
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={resetToServerConfig}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-28">

        {stack === 'near' && (
          <>
            {!nearAccountId && (
              <Card className="w-full text-left">
                <CardHeader><CardTitle>NEAR</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Connect your NEAR account or create a new one.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleConnectNear}>Connect NEAR Wallet</Button>
                    <Button variant="outline" onClick={async()=>{ const cfg = await getNearConfig(); window.open(`${cfg.walletUrl}/create`, '_blank'); }}>Create NEAR Account</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {nearAccountId && (
              <>
                <div className="w-full">
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-4xl font-semibold tracking-tight">US ${(parseFloat(nearBalance || '0') * nearUsdPrice || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{nearBalance || '0.00'} Ⓝ</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={()=> setOpenNearSend(true)}>Send</Button>
                    <Button variant="outline" onClick={()=> setOpenNearReceive(true)}>Receive</Button>
                    <Button variant="outline" onClick={()=>{ const kp = KeyPair.fromRandom('ed25519'); setNearDisposable({ publicKey: kp.getPublicKey().toString(), secretKey: kp.secretKey }); setOpenNearDisposable(true); try { (toast as any)?.success?.('Session key created'); } catch {} }}>Session Key</Button>
                    <Button variant="outline" onClick={() => { try { (toast as any)?.info?.('Funding coming soon'); } catch {} }}>Fund wallet</Button>
                    <Button variant="outline" onClick={() => { try { (toast as any)?.info?.('Swap coming soon'); } catch {} }}>Swap</Button>
                    <Button variant="outline" onClick={async()=>{ try{ await openWalletSelector(); const acc = await getActiveNearAccountId(); if (acc){ setNearAccountId(acc); const bal = await fetchNearBalance(acc).catch(()=>"0"); setNearBalance(formatYoctoToNear(bal)); } }catch(e:any){ try { (toast as any)?.error?.('NEAR connect failed', { description: e?.message || String(e) }); } catch {} } }}>Connect dApp</Button>
                  </div>
                </div>

                <Card className="w-full text-left">
                  <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2"><div className="text-muted-foreground">Account</div><div className="truncate">{nearAccountId}</div></div>
                    <div className="flex items-center justify-between gap-2"><div className="text-muted-foreground">Public key</div><div className="truncate">{nearPublicKey || '—'}</div></div>
                  </CardContent>
                </Card>
              </>
            )}


            <Tabs defaultValue="tokens" className="w-full mt-4" onValueChange={(v)=>{ /* store if needed */ }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="defi">DeFi</TabsTrigger>
                  <TabsTrigger value="nfts">NFTs</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenNearAddToken(true)}
                  >
                    + Add
                  </Button>
                </div>
              </div>
              <TabsContent value="tokens" className="mt-2">
                <Card className="w-full text-left">
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1">
                      {nearTokens.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No NEAR tokens yet — add from “+ Add FT”.
                        </p>
                      )}
                      {nearTokens.map((t) => (
                        <div
                          key={t.contractId}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0 truncate">
                            {t.symbol}{" "}
                            <span className="text-muted-foreground">
                              · {t.name}
                            </span>
                          </div>
                          <div className="shrink-0">{t.balance || "0"}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="defi" className="mt-2">
                <Card className="w-full text-left">
                  <CardContent className="space-y-4 pt-6">
                    <p className="text-sm text-muted-foreground">DeFi features are coming soon to NEAR.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="nfts" className="mt-2">
                <Card className="w-full text-left">
                  <CardContent className="space-y-4 pt-6">
                    {nearNftCollections.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No NFT collections yet — add from “+ Add NFT”.
                      </p>
                    )}
                    {nearNftCollections.map((col) => (
                      <div key={col.contractId} className="space-y-2">
                        <div className="text-sm font-medium">
                          {col.name || col.symbol || col.contractId}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {col.items.map((it, i) => (
                            <div
                              key={col.contractId + ":" + it.token_id + ":" + i}
                              className="rounded border p-2 text-xs"
                            >
                              {it.media ? (
                                <img
                                  alt={it.title || it.token_id}
                                  src={it.media}
                                  className="mb-2 h-24 w-full rounded object-cover"
                                />
                              ) : null}
                              <div className="truncate">
                                {it.title || it.token_id}
                              </div>
                            </div>
                          ))}
                          {col.items.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                              No tokens in this collection.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Dialog open={openNearAddToken} onOpenChange={setOpenNearAddToken}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add NEAR token (NEP-141)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Token contract ID</Label>
                    <Input
                      value={newNearTokenId}
                      onChange={(e) => setNewNearTokenId(e.target.value)}
                      placeholder="wrap.near"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenNearAddToken(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addNearToken}
                      disabled={!newNearTokenId.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openNearAddNft} onOpenChange={setOpenNearAddNft}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add NFT collection (NEP-171)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Collection contract ID</Label>
                    <Input
                      value={newNearNftId}
                      onChange={(e) => setNewNearNftId(e.target.value)}
                      placeholder="example-nft.near"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenNearAddNft(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addNearNft}
                      disabled={!newNearNftId.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openNearSend} onOpenChange={setOpenNearSend}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send NEAR</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Receiver (accountId)</Label>
                    <Input
                      value={nearReceiver}
                      onChange={(e) => setNearReceiver(e.target.value)}
                      placeholder="alice.near"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Amount (NEAR)</Label>
                    <Input
                      value={nearAmount}
                      onChange={(e) => setNearAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenNearSend(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={sendNearFlow}
                      disabled={!nearReceiver || !nearAmount}
                    >
                      Send
                    </Button>
                  </div>
                  {nearTxHash && (
                    <a
                      className="text-primary underline text-sm"
                      href={explorerTxUrl(nearTxHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on NEAR Explorer ↗
                    </a>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openNearReceive} onOpenChange={setOpenNearReceive}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Receive NEAR</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Share your NEAR account ID or scan the QR to receive NEAR or tokens.</p>
                  <div className="flex items-center justify-center">
                    <img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${nearAccountId || ''}`} className="rounded bg-white p-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={nearAccountId || ''} />
                    <Button variant="outline" onClick={()=>{ if(nearAccountId) navigator.clipboard.writeText(nearAccountId); }}>Copy</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openNearDisposable} onOpenChange={setOpenNearDisposable}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>NEAR Session Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {nearDisposable ? (
                    <>
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground">Public Key</div>
                        <div className="truncate font-mono text-xs">{nearDisposable.publicKey}</div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground">Secret Key</div>
                        <div className="truncate font-mono text-xs">{nearDisposable.secretKey}</div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={async()=>{
                          try{
                            if (nearDisposable){
                              const wallet = await getNearWallet();
                              try{ await wallet.signAndSendTransaction({ signerId: nearAccountId!, receiverId: nearAccountId!, actions: [ { type: 'DeleteKey', params: { publicKey: nearDisposable.publicKey } } ] }); setNearKeyAttached(false); }catch{}
                            }
                          }catch{}
                          setNearDisposable(null);
                          setOpenNearDisposable(false);
                          try { (toast as any)?.info?.('Session ended'); } catch {}
                        }}>End session</Button>
                        <Button onClick={async()=>{
                          try{
                            if (!nearDisposable || !nearAccountId){ try { (toast as any)?.info?.('Connect wallet first'); } catch {} ; return; }
                            const receiverId = prompt('Receiver (contract/account) for permission', nearAccountId) || nearAccountId;
                            const allowanceNear = prompt('Allowance (NEAR) for function calls', '0.25') || '0.25';
                            const methods = prompt('Allowed method names (comma separated, blank = any)', '') || '';
                            const allowance = (()=>{ try{ return BigInt(Math.floor(parseFloat(allowanceNear)*1e24).toString()); }catch{ return BigInt(0); } })();
                            const methodNames = methods.split(',').map(s=>s.trim()).filter(Boolean);
                            const wallet = await getNearWallet();
                            await wallet.signAndSendTransaction({ signerId: nearAccountId, receiverId, actions: [ { type: 'AddKey', params: { publicKey: nearDisposable.publicKey, accessKey: { permission: { type: 'FunctionCall', receiverId, methodNames, allowance } } } } ] });
                            setNearKeyAttached(true);
                            try { (toast as any)?.success?.('Session key attached'); } catch {}
                          }catch(e:any){ try { (toast as any)?.error?.('Could not attach key', { description: e?.message || String(e) }); } catch {} }
                        }}>{nearKeyAttached ? 'Re-attach' : 'Attach to account'}</Button>
                        <Button variant="outline" onClick={async()=>{
                          try{
                            if (!nearDisposable || !nearAccountId){ return; }
                            const wallet = await getNearWallet();
                            await wallet.signAndSendTransaction({ signerId: nearAccountId, receiverId: nearAccountId, actions: [ { type: 'DeleteKey', params: { publicKey: nearDisposable.publicKey } } ] });
                            setNearKeyAttached(false);
                            try { (toast as any)?.success?.('Access key removed'); } catch {}
                          }catch(e:any){ try { (toast as any)?.error?.('Remove key failed', { description: e?.message || String(e) }); } catch {} }
                        }}>Remove key</Button>
                      </div>
                      <div className="text-xs text-muted-foreground">This key is kept only in memory. Attaching it adds an on-chain access key; you can remove it anytime.</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No active session.</div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {stack === "evm" && (
          <>
            {!accountAddr && (
              <Card className="w-full text-left">
                <CardHeader>
                  <CardTitle>Welcome</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create your seedless smart wallet in one tap. No seed
                    phrases.
                  </p>
                  {actionsReady ? (
                    <Button onClick={createWallet}>Create Seedless Wallet</Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button onClick={createWallet} disabled>
                            Create Seedless Wallet
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Configure EntryPoint and Factory in Settings to enable actions on this network.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            )}

            {accountAddr && (
              <>
                <div className="w-full">
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-4xl font-semibold tracking-tight">
                        US ${(Number(balance || 0) * usdPrice || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {balance || "0.00"} ETH
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {actionsReady ? (
                      <Button
                        onClick={() => {
                          setOpenTransfer(true);
                          setStep(1);
                        }}
                      >
                        Send
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button disabled>
                              Send
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Configure EntryPoint and Factory in Settings to enable actions on this network.
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setOpenReceive(true)}
                    >
                      Receive
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { if (accountAddr) { navigator.clipboard.writeText(accountAddr); try { (toast as any)?.success?.('Account copied'); } catch {} } }}
                    >
                      Copy Account
                    </Button>
                    <Button variant="outline" onClick={createDisposableKey}>
                      Disposable Key
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          (toast as any)?.info?.("Funding coming soon");
                        } catch {}
                      }}
                    >
                      Fund wallet
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          (toast as any)?.info?.("Swap coming soon");
                        } catch {}
                      }}
                    >
                      Swap
                    </Button>
                    <Button variant="outline" onClick={() => { try { if (!disposable) ensureDisposableKey(); setOpenWc(true); } catch {} }}>
                      Connect dApp
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="tokens" className="w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TabsList className="p-3">
                      <TabsTrigger value="tokens" className="text-xl py-3">
                        Tokens
                      </TabsTrigger>
                      <TabsTrigger value="defi" className="text-xl py-3">
                        DeFi
                      </TabsTrigger>
                      <TabsTrigger value="nfts" className="text-xl py-3">
                        NFTs
                      </TabsTrigger>
                    </TabsList>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddMode("search");
                        setAddNetKey(activeNetworkKey);
                        setOpenAddToken(true);
                      }}
                    >
                      + Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => { try { await discoverTokens(); } catch {} }}
                    >
                      Discover
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => { try { const active = getActiveEvmAddress(); const provider = getJsonRpcProvider(); if (active && provider) { const bal = await provider.getBalance(active); setBalance(ethers.formatEther(bal)); } await refreshTokens(); } catch {} }}
                    >
                      Refresh
                    </Button>
                  </div>
                  <TabsContent value="tokens" className="mt-2">
                    <Card className="w-full text-left">
                      <CardContent className="space-y-4 pt-6">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0 truncate">
                              ETH{" "}
                              <span className="text-muted-foreground">
                                · Ether
                              </span>
                            </div>
                            <div className="shrink-0">{balance || "0"}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Active: {(getActiveEvmAddress()?.slice(0,6) || '')}…{(getActiveEvmAddress()?.slice(-4) || '')}</div>
                          {tokens.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No tokens yet — add from “+ Add”.
                            </p>
                          )}
                          {tokens.map((t) => (
                            <div
                              key={t.address}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <div className="min-w-0 truncate">
                                {t.symbol}{" "}
                                <span className="text-muted-foreground">
                                  · {t.name}
                                </span>
                              </div>
                              <div className="shrink-0">{t.balance || "0"}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="defi" className="mt-2">
                    <Card>
                      <CardContent className="pt-6 text-sm text-muted-foreground">
                        DeFi coming soon.
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="nfts" className="mt-2">
                    <Card>
                      <CardContent className="pt-6 text-sm text-muted-foreground">
                        NFTs coming soon.
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <Card className="w-full max-w-6xl text-left">
                  <CardHeader>
                    <CardTitle>Recovery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Replace seed phrases with a simple Recovery Kit. Use a
                      Recovery Code or Passkey.
                    </p>
                    <div className="flex flex-col items-center gap-2 sm:flex-wrap sm:flex-row">
                      <Button onClick={createRecoveryBackup}>
                        Create Recovery Kit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={createPasskeyRecoveryKit}
                      >
                        Create Passkey Kit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            if (!lastBackup) {
                              try {
                                (toast as any)?.info?.(
                                  "Create a Recovery Kit first"
                                );
                              } catch {}
                              return;
                            }
                            const { saveToDriveOrFallback } = await import(
                              "./lib/drive"
                            );
                            await saveToDriveOrFallback(
                              lastBackup.fileName,
                              lastBackup.blob
                            );
                          } catch (e: any) {
                            try {
                              (toast as any)?.error?.("Could not open Drive");
                            } catch {}
                          }
                        }}
                      >
                        Save to Google Drive
                      </Button>
                      {recoveryCode && (
                        <span className="text-xs space-y-2">
                          Your Recovery Code:{" "}
                          <span className="font-mono">{recoveryCode}</span> ➡
                          (store it safely ⚠️.)
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 py-10">
                      <div className="space-y-2">
                        <Label>Recovery Code</Label>
                        <Input
                          value={restoreCode}
                          onChange={(e) => setRestoreCode(e.target.value)}
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Recovery file (.json)</Label>
                        <Input
                          type="file"
                          accept="application/json"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const txt = await f.text();
                            setRestoreFile(txt);
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 py-5">
                      <Button
                        variant="outline"
                        className="px-2"
                        onClick={restoreFromBackup}
                      >
                        Restore Owner Key
                      </Button>
                      <Button
                        variant="outline"
                        className="px-2"
                        onClick={async () => {
                          if (!restoreFile) {
                            try {
                              (toast as any)?.info?.("Select a passkey file");
                            } catch {}
                            return;
                          }
                          await restoreWithPasskey(restoreFile);
                        }}
                      >
                        Restore with Passkey
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="w-full max-w-6xl text-left">
                  <CardHeader>
                    <CardTitle>History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {history.length === 0 && (<p className="text-xs text-muted-foreground">No activity yet.</p>)}
                    {history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0 truncate">{new Date(h.time).toLocaleString()} · {h.kind} · {h.details}</div>
                        <div className="shrink-0 text-muted-foreground">{h.status || '—'}{h.txHash ? ` · ${h.txHash.slice(0,6)}…${h.txHash.slice(-4)}` : ''}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        <Card className="w-full max-w-6xl text-left">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
              {status || "Ready."}
            </pre>
            {txHash && (
              <a
                className="text-primary underline"
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Arbiscan ↗
              </a>
            )}
            {nearTxHash && (
              <a
                className="text-primary underline"
                href={nearTxHash ? explorerTxUrl(nearTxHash) : "#"}
                target="_blank"
                rel="noreferrer"
              >
                View on NEAR Explorer ↗
              </a>
            )}
          </CardContent>
        </Card>

        <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="dark:text-foreground">
                {step === 1 ? "New Transfer" : "Review & Send"}
              </DialogTitle>
            </DialogHeader>
            {step === 1 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Recipient address</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount (ETH)</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!recipient}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This will create a one‑time wallet, send {amount || "0"} ETH
                  to {recipient.slice(0, 6)}…{recipient.slice(-4)}, and burn the
                  wallet immediately after.
                </p>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={sendDisposableTx} disabled={!actionsReady}>Send</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={openReceive} onOpenChange={setOpenReceive}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="dark:text-foreground">
                Receive
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share your address or scan the QR to receive funds on this
                network.
              </p>
              <div className="flex items-center justify-center">
                <img
                  alt="QR"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${
                    getActiveEvmAddress() || ""
                  }`}
                  className="rounded bg-white p-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={getActiveEvmAddress() || ""} />
                <Button
                  variant="outline"
                  onClick={() => {
                    { const addr = getActiveEvmAddress(); if (addr) navigator.clipboard.writeText(addr); }
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openAddToken} onOpenChange={setOpenAddToken}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add token</DialogTitle>
            </DialogHeader>
            <Tabs
              defaultValue={addMode}
              onValueChange={(v) => setAddMode(v as any)}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
              <div className="mt-2 space-y-3">
                <div className="space-y-3">
                  <Label>Network</Label>
                  <Input readOnly value={NETWORKS.find((n) => n.key === activeNetworkKey)?.name || 'Network'} />
                </div>

                {addMode === "search" ? (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <Label>Search tokens</Label>
                      <Input
                        value={tokenQuery}
                        onChange={(e) => setTokenQuery(e.target.value)}
                        placeholder="Search by name or symbol"
                      />
                    </div>
                    <div className="max-h-60 overflow-auto rounded border">
                      {(() => {
                        const cid = String(
                          NETWORKS.find((n) => n.key === activeNetworkKey)?.chainId ||
                            ""
                        );
                        const list = (tokenIndex[cid] ||
                          KNOWN_TOKENS[cid] ||
                          []) as KnownToken[];
                        return list
                          .filter((t) =>
                            (t.symbol + t.name)
                              .toLowerCase()
                              .includes(tokenQuery.toLowerCase())
                          )
                          .slice(0, 100)
                          .map((t) => (
                            <div
                              key={t.address}
                              className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                            >
                              <div className="min-w-0 truncate">
                                {t.symbol || "Token"}{" "}
                                <span className="text-muted-foreground">
                                  · {t.name || ""}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const targetCid = chainId ? Number(chainId) : NETWORKS.find((n) => n.key === activeNetworkKey)?.chainId;
                                  addTokenAddressToList(t.address, targetCid);
                                  if (String(targetCid) === String(chainId)) {
                                    refreshTokens();
                                    try {
                                      (toast as any)?.success?.("Token added");
                                    } catch {}
                                  } else {
                                    try {
                                      (toast as any)?.success?.(
                                        "Token added to " +
                                          (NETWORKS.find(
                                            (n) => n.key === activeNetworkKey
                                          )?.name || "network"),
                                        {
                                          description:
                                            "Switch network to view.",
                                        }
                                      );
                                    } catch {}
                                  }
                                  setOpenAddToken(false);
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          ));
                      })()}
                      {(() => {
                        const cid = String(
                          NETWORKS.find((n) => n.key === activeNetworkKey)?.chainId ||
                            ""
                        );
                        const list = (tokenIndex[cid] ||
                          KNOWN_TOKENS[cid] ||
                          []) as KnownToken[];
                        return list.length === 0;
                      })() && (
                        <div className="p-3 text-xs text-muted-foreground">
                          No indexed tokens for this network yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <Label>Token contract address</Label>
                      <Input
                        value={newTokenAddr}
                        onChange={(e) => setNewTokenAddr(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div className="flex justify-end space-y-3">
                      <Button
                        onClick={async () => {
                          await addToken();
                          setOpenAddToken(false);
                        }}
                      >
                        Add custom token
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
        <Dialog open={openDisposable} onOpenChange={setOpenDisposable}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disposable dApp Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Temporary private key for connecting to dApps. It is kept only
                in memory and will be destroyed when you end the session.
              </p>
              <div className="space-y-1">
                <Label>Address</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={disposable?.address || ""} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (disposable?.address) {
                        navigator.clipboard.writeText(disposable.address);
                        try {
                          (toast as any)?.success?.("Address copied");
                        } catch {}
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Private key</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={disposable?.privateKey || ""} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (disposable?.privateKey) {
                        navigator.clipboard.writeText(disposable.privateKey);
                        try {
                          (toast as any)?.success?.("Private key copied");
                        } catch {}
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDisposable(false)}
                >
                  Close
                </Button>
                <Button variant="destructive" onClick={endDisposableSession}>
                  End session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openWc} onOpenChange={setOpenWc}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>WalletConnect</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {!wcProposal && !wcSession && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect a dApp by opening it in the in‑app browser or pasting a WalletConnect URI.
                  </p>
                  {!wcProjectId && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">WalletConnect Project ID is not set in Settings. You can still open the dApp Browser and copy a URI, but pairing will require setting the Project ID.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { try { window.open('/browser', 'dappBrowser', 'width=1100,height=800'); } catch {} }}>
                      Open dApp Browser
                    </Button>
                    <Button variant="outline" onClick={async ()=>{ try { const txt = await navigator.clipboard.readText(); const uri = (txt||'').trim(); if (uri.startsWith('wc:')) { setWcUri(uri); await wcPair(uri); } else { try { (toast as any)?.info?.('Clipboard does not contain a WalletConnect URI'); } catch {} } } catch(e:any){ try { (toast as any)?.error?.('Could not read clipboard', { description: e?.message || String(e) }); } catch {} } }}>
                      Pair from clipboard
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">A temporary key is in use for this session and will be auto‑destroyed when you disconnect.</p>
                  <Input
                    value={wcUri}
                    onChange={(e) => setWcUri(e.target.value)}
                    placeholder="wc:..."
                  />
                  <div className="flex justify-end">
                    <Button onClick={()=> wcPair()} disabled={!wcUri}>
                      Pair
                    </Button>
                  </div>
                </div>
              )}
              {wcProposal && (
                <div className="space-y-3">
                  <div className="text-sm">
                    Session proposal from{" "}
                    <span className="font-medium">
                      {wcProposal?.params?.proposer?.metadata?.name || "App"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={wcReject}>
                      Reject
                    </Button>
                    <Button onClick={wcApprove} disabled={!disposable}>
                      Approve with disposable key
                    </Button>
                  </div>
                </div>
              )}
              {wcSession && (
                <div className="space-y-3">
                  <div className="text-sm">Connected. {wcStatus}</div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setOpenWc(false)}>
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await wcDisconnect();
                        endDisposableSession();
                        try {
                          (toast as any)?.success?.(
                            "Disconnected and key destroyed"
                          );
                        } catch {}
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
            <Button
              aria-label="Home"
              variant="ghost"
              size="sm"
              className="flex-1 justify-center gap-2"
              onClick={() => nav("/")}
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </Button>
            <Button
              aria-label="Browser"
              variant="ghost"
              size="sm"
              className="flex-1 justify-center gap-2"
              onClick={() => { try { window.open('/browser', 'dappBrowser', 'width=1100,height=800'); } catch {} }}
            >
              <Compass className="h-4 w-4" />
              Browser
            </Button>
            <Button
              aria-label="Activity"
              variant="ghost"
              size="sm"
              className="flex-1 justify-center gap-2"
            >
              <ActivitySquare className="h-4 w-4" />
              Activity
            </Button>
            <Button
              aria-label="Settings"
              variant="ghost"
              size="sm"
              className="flex-1 justify-center gap-2"
              onClick={() =>
                document
                  .querySelector("[data-slot=sheet-trigger]")
                  ?.dispatchEvent(new Event("click", { bubbles: true }))
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </nav>
        {debugEvm && stack==='evm' && (
          <div className="fixed bottom-16 right-2 z-50 rounded bg-black/70 text-white p-2 text-xs space-y-1">
            <div>chainId: {String(chainId||'-')}</div>
            <div>active: {getActiveEvmAddress() || '-'}</div>
            <div>rpc: {debugRpc || '-'}</div>
            <div>eth: {balance || '0'}</div>
            <div>last: {debugLastEth || '-'}</div>
          </div>
        )}
        <Toaster richColors position="top-center" />
      </main>
    </div>
  );
}