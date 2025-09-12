import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, Sparkles, WalletMinimal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { encodeExecuteAndBurn, estimateUserOp, getGasPrice, getUserOpHash, packInitCode, predictAccountAddress, sponsorUserOp, sendUserOp, UserOperation, getUserOpReceipt } from "./lib/aa";

export default function Home() {
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [factory, setFactory] = useState("");
  const [policyId, setPolicyId] = useState("");

  const [openTransfer, setOpenTransfer] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const rpc = useMemo(() => bundlerUrl ? bundlerUrl.split("?")[0] : "", [bundlerUrl]);

  useEffect(() => {
    (async () => {
      try {
        const envBundler = (import.meta as any).env?.VITE_BUNDLER_URL || "";
        const envEntry = (import.meta as any).env?.VITE_ENTRYPOINT || "";
        const envFactory = (import.meta as any).env?.VITE_FACTORY || "";
        const envPolicy = (import.meta as any).env?.VITE_SPONSORSHIP_POLICY_ID || "";

        let serverCfg: any = {};
        try {
          const res = await fetch("/config.json", { cache: "no-store" });
          if (res.ok) serverCfg = await res.json();
        } catch {}

        const ls = (k: string) => localStorage.getItem(k) || "";

        setBundlerUrl(ls("bundlerUrl") || serverCfg.bundlerUrl || envBundler);
        setEntryPoint(ls("entryPoint") || serverCfg.entryPoint || envEntry);
        setFactory(ls("factory") || serverCfg.factory || envFactory);
        setPolicyId(ls("policyId") || serverCfg.policyId || envPolicy);
      } catch {}
    })();
  }, []);

  function saveConfig() {
    localStorage.setItem("bundlerUrl", bundlerUrl);
    localStorage.setItem("entryPoint", entryPoint);
    localStorage.setItem("factory", factory);
    localStorage.setItem("policyId", policyId);
  }

  function resetToServerConfig() {
    localStorage.removeItem("bundlerUrl");
    localStorage.removeItem("entryPoint");
    localStorage.removeItem("factory");
    localStorage.removeItem("policyId");
    location.reload();
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

      // Poll for the receipt
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
        <div className="relative mt-6 rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/60 to-background p-10 text-center">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-black/30 px-3 py-1 text-xs text-primary">
              <Sparkles size={12} />
              <span>Privacy-first smart wallet</span>
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
              Go seedless: automatic disposable wallets and one‑time keys for transaction‑level security.
            </h1>
            <p className="text-balance text-lg text-muted-foreground">
              Your funds, not your phrases. Automatic temp wallets and rotating keys.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg">Create Seedless Wallet</Button>
              <Button variant="outline" size="lg" onClick={() => { setOpenTransfer(true); setStep(1); }}>One‑time Private Transfer</Button>
            </div>
          </div>
        </div>

        {status && (
          <Card className="w-full max-w-3xl text-left">
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{status}</pre>
              {txHash && (
                <a className="text-primary underline" href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View on Arbiscan ↗</a>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{step === 1 ? "New Private Transfer" : "Review & Send"}</DialogTitle>
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
                <Button onClick={sendDisposableTx}>Send privately</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
