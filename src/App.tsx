import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, WalletMinimal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export default function Dashboard() {
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [factory, setFactory] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [accFactory, setAccFactory] = useState("");

  const [openTransfer, setOpenTransfer] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const [ownerPk, setOwnerPk] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [accSalt, setAccSalt] = useState<string | null>(null);
  const [accountAddr, setAccountAddr] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("");
  const [chainId, setChainId] = useState<bigint | null>(null);

  type Token = { address: string; symbol: string; name: string; decimals: number; balance: string };
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenAddr, setNewTokenAddr] = useState<string>("");

  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [restoreCode, setRestoreCode] = useState<string>("");
  const [restoreFile, setRestoreFile] = useState<string>("");

  const rpc = useMemo(() => bundlerUrl || "", [bundlerUrl]);

  // Helpers: base64 encode/decode for ArrayBuffer
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

  function randomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cipher-recovery-${ownerAddr.slice(2,8)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setRecoveryCode(code);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  async function restoreFromBackup() {
    try {
      if (!restoreCode || !restoreFile) { alert("Select a backup and enter the code"); return; }
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
      alert("Recovery successful. Owner key restored.");
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const envBundler = (import.meta as any).env?.VITE_BUNDLER_URL || "";
        const envEntry = (import.meta as any).env?.VITE_ENTRYPOINT || "";
        const envFactory = (import.meta as any).env?.VITE_FACTORY || "";
        const envAccFactory = (import.meta as any).env?.VITE_ACCOUNT_FACTORY || "";
        const envPolicy = (import.meta as any).env?.VITE_SPONSORSHIP_POLICY_ID || "";

        let serverCfg: any = {};
        try {
          const res = await fetch("/config.json", { cache: "no-store" });
          if (res.ok) serverCfg = await res.json();
        } catch {}

        const ls = (k: string) => localStorage.getItem(k) || "";

        setBundlerUrl(ls("bundlerUrl") || serverCfg.bundlerUrl || envBundler);
        setEntryPoint(ls("entryPoint") || serverCfg.entryPoint || envEntry);
        setFactory(ls("factory") || serverCfg.disposableFactory || serverCfg.factory || envFactory);
        setAccFactory(ls("accFactory") || serverCfg.accountFactory || envAccFactory);
        setPolicyId(ls("policyId") || serverCfg.policyId || envPolicy);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc) return;
        const cid = await getChainId(rpc);
        setChainId(cid);
      } catch {}
    })();
  }, [rpc]);

  useEffect(() => {
    (async () => {
      try {
        const lsAcc = localStorage.getItem("accountAddr");
        const lsPk = localStorage.getItem("ownerPk");
        const lsOwner = localStorage.getItem("ownerAddr");
        if (lsAcc && !accountAddr) setAccountAddr(lsAcc);
        if (lsPk && !ownerPk) setOwnerPk(lsPk);
        if (lsOwner && !ownerAddr) setOwnerAddr(lsOwner);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc || !accountAddr) { setBalance(""); return; }
        const provider = new ethers.JsonRpcProvider(rpc);
        const bal = await provider.getBalance(accountAddr);
        setBalance(ethers.formatEther(bal));
      } catch {}
    })();
  }, [rpc, accountAddr]);

  useEffect(() => {
    (async () => {
      try {
        if (!rpc || !accountAddr || !chainId) return;
        await refreshTokens();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, accountAddr, chainId]);

  useEffect(() => {
    // Auto-create flow: /dashboard?autocreate=1
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const auto = params.get("autocreate") === "1";
      if (auto && !accountAddr) {
        createWallet();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddr]);

  function saveConfig() {
    localStorage.setItem("bundlerUrl", bundlerUrl);
    localStorage.setItem("entryPoint", entryPoint);
    localStorage.setItem("factory", factory);
    localStorage.setItem("policyId", policyId);
    localStorage.setItem("accFactory", accFactory);
  }

  function resetToServerConfig() {
    localStorage.removeItem("bundlerUrl");
    localStorage.removeItem("entryPoint");
    localStorage.removeItem("factory");
    localStorage.removeItem("policyId");
    location.reload();
  }

  function ensureOwner() {
    if (ownerPk && ownerAddr && accSalt) return new ethers.Wallet(ownerPk);
    const w = ethers.Wallet.createRandom();
    setOwnerPk(w.privateKey);
    setOwnerAddr(w.address);
    localStorage.setItem("ownerPk", w.privateKey);
    localStorage.setItem("ownerAddr", w.address);
    const s = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);
    setAccSalt(s);
    return w;
  }

  async function deployAccount() {
    const w = ensureOwner();
    const salt = accSalt!;
    const predicted = await predictAccountAddress(rpc, accFactory, entryPoint, w.address, salt);
    setAccountAddr(predicted);
    localStorage.setItem("accountAddr", predicted);

    let userOp: UserOperation = {
      sender: predicted,
      nonce: 0n,
      initCode: packInitCode(accFactory, entryPoint, w.address, salt),
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
  }

  async function createWallet() {
    try {
      setStatus("Creating your seedless wallet...");
      await deployAccount();
    } catch (e: any) {
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  async function sendDisposableTx() {
    try {
      setStatus("Preparing...");
      setTxHash(null);

      const ownerWallet = ethers.Wallet.createRandom();
      const owner = ownerWallet.address;
      const salt = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);

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

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const rec = await getUserOpReceipt(bundlerUrl, uoHash);
        const tx = rec?.receipt?.transactionHash;
        if (tx) {
          setTxHash(tx);
          setStatus((s) => s + `\nConfirmed: ${tx}`);
          break;
        }
      }
      setOpenTransfer(false);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  async function refreshTokens() {
    try {
      if (!rpc || !accountAddr) return;
      const provider = new ethers.JsonRpcProvider(rpc);
      const stored = JSON.parse(localStorage.getItem(`tokens:${String(chainId||"")}`) || "[]") as string[];
      const next: Token[] = [];
      for (const addr of stored) {
        try {
          const erc20 = new ethers.Contract(addr, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)",
          ], provider);
          const [name, symbol, decimals, raw] = await Promise.all([
            erc20.name(), erc20.symbol(), erc20.decimals(), erc20.balanceOf(accountAddr)
          ]);
          next.push({ address: addr, name, symbol, decimals, balance: ethers.formatUnits(raw, decimals) });
        } catch {}
      }
      setTokens(next);
    } catch {}
  }

  async function addToken() {
    try {
      const addr = newTokenAddr.trim();
      if (!ethers.isAddress(addr)) { alert("Enter a valid token address"); return; }
      const key = `tokens:${String(chainId||"")}`;
      const list = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (!list.includes(addr)) {
        list.push(addr);
        localStorage.setItem(key, JSON.stringify(list));
      }
      setNewTokenAddr("");
      await refreshTokens();
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <WalletMinimal className="text-primary" />
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm"><Settings className="mr-2 h-4 w-4"/>Settings</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Configuration</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label>Bundler RPC URL</Label>
                <Input value={bundlerUrl} onChange={(e) => setBundlerUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label>EntryPoint Address</Label>
                <Input value={entryPoint} onChange={(e) => setEntryPoint(e.target.value)} placeholder="0x..." />
              </div>
              <div className="space-y-1">
                <Label>Disposable Factory Address</Label>
                <Input value={factory} onChange={(e) => setFactory(e.target.value)} placeholder="0x..." />
              </div>
              <div className="space-y-1">
                <Label>Account Factory Address</Label>
                <Input value={accFactory} onChange={(e) => setAccFactory(e.target.value)} placeholder="0x..." />
              </div>
              <div className="space-y-1">
                <Label>Sponsorship Policy ID</Label>
                <Input value={policyId} onChange={(e) => setPolicyId(e.target.value)} placeholder="sp_..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={saveConfig}>Save</Button>
                <Button variant="outline" className="flex-1" onClick={resetToServerConfig}>Reset</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 pb-20">
        {!accountAddr && (
          <Card className="w-full text-left">
            <CardHeader><CardTitle>Welcome</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Create your seedless smart wallet in one tap. No seed phrases.</p>
              <Button onClick={createWallet}>Create Seedless Wallet</Button>
            </CardContent>
          </Card>
        )}

        {accountAddr && (
          <>
            <Card className="w-full max-w-6xl text-left">
              <CardHeader><CardTitle>Portfolio</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Account: {accountAddr.slice(0,6)}…{accountAddr.slice(-4)}{ownerAddr? ` · Owner: ${ownerAddr.slice(0,6)}…${ownerAddr.slice(-4)}`: ''}</p>
                <p className="text-sm">ETH: {balance? `${balance}` : '—'}</p>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Add token (ERC-20 address)</Label>
                      <Input value={newTokenAddr} onChange={(e)=>setNewTokenAddr(e.target.value)} placeholder="0x..." />
                    </div>
                    <Button onClick={addToken}>Add</Button>
                  </div>
                  <div className="space-y-1">
                    {tokens.length === 0 && (<p className="text-xs text-muted-foreground">No tokens added yet.</p>)}
                    {tokens.map(t => (
                      <div key={t.address} className="flex justify-between text-sm">
                        <div>{t.symbol} <span className="text-muted-foreground">· {t.name}</span></div>
                        <div>{t.balance}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => { setOpenTransfer(true); setStep(1); }}>Transfer</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full max-w-6xl text-left">
              <CardHeader><CardTitle>Recovery</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Replace seed phrases with a simple Recovery Kit. Download an encrypted backup protected by your Recovery Code.</p>
                <div className="flex items-center gap-2">
                  <Button onClick={createRecoveryBackup}>Create Recovery Kit</Button>
                  {recoveryCode && (
                    <span className="text-xs">Your Recovery Code: <span className="font-mono">{recoveryCode}</span> — store it safely.</span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Recovery Code</Label>
                    <Input value={restoreCode} onChange={(e)=>setRestoreCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label>Recovery file (.json)</Label>
                    <Input type="file" accept="application/json" onChange={async (e)=>{
                      const f = e.target.files?.[0];
                      if (!f) return; const txt = await f.text(); setRestoreFile(txt);
                    }} />
                  </div>
                </div>
                <Button variant="outline" onClick={restoreFromBackup}>Restore Owner Key</Button>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="w-full max-w-6xl text-left">
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{status || 'Ready.'}</pre>
            {txHash && (
              <a className="text-primary underline" href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View on Arbiscan ↗</a>
            )}
          </CardContent>
        </Card>

        <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{step === 1 ? "New Transfer" : "Review & Send"}</DialogTitle>
            </DialogHeader>
            {step === 1 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Recipient address</Label>
                  <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." />
                </div>
                <div className="space-y-1">
                  <Label>Amount (ETH)</Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!recipient}>Continue</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This will create a one‑time wallet, send {amount || "0"} ETH to {recipient.slice(0,6)}…{recipient.slice(-4)}, and burn the wallet immediately after.
                </p>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={sendDisposableTx}>Send</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
