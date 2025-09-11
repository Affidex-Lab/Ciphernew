import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { encodeExecuteAndBurn, estimateUserOp, getGasPrice, getUserOpHash, packInitCode, predictAccountAddress, sponsorUserOp, sendUserOp, UserOperation } from "./lib/aa";

export default function Home() {
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [factory, setFactory] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [target, setTarget] = useState("0x35aC8639f2D994bf4Fd75b56194935305C6D4d62");
  const [status, setStatus] = useState("");

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
      } catch {
        // leave empty; user can fill via UI
      }
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

  async function registerPasskey() {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const rp = { name: "Cipher Wallet" } as PublicKeyCredentialRpEntity;
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const user = { id: userId, name: "user", displayName: "Cipher User" };
      const pubKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp,
        user,
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: 60000,
        attestation: "none",
      };
      const cred = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential | null;
      if (!cred) throw new Error("passkey failed");
      const rawId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      localStorage.setItem("passkeyId", rawId);
      alert("Passkey registered");
    } catch (e: any) {
      alert(e?.message || "Failed");
    }
  }

  async function sendDisposableTx() {
    try {
      setStatus("Preparing...");
      const rpc = bundlerUrl.split("?")[0];

      const ownerWallet = ethers.Wallet.createRandom();
      const owner = ownerWallet.address;
      const salt = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);

      const sender = await predictAccountAddress(rpc, factory, entryPoint, owner, salt);
      const initCode = packInitCode(factory, entryPoint, owner, salt);
      const callData = encodeExecuteAndBurn(target, 0n, "0x");

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
      setStatus((s) => s + `\nSubmitted: ${uoHash}`);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-background">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/10" />
      <main className="container relative z-10 flex max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12 text-center md:py-16">
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          <Sparkles size={12} />
          <span>Cipher Wallet MVP</span>
        </div>

        <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl md:text-6xl">
          Seedless + Disposable Wallet
        </h1>

        <div className="grid w-full gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
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
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveConfig}>Save</Button>
                <Button variant="outline" className="flex-1" onClick={resetToServerConfig}>Reset</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passkey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
              <p className="text-sm text-muted-foreground">Register a passkey to gate local key access.</p>
              <Button className="w-full" onClick={registerPasskey}>Register Passkey</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full max-w-4xl text-left">
          <CardHeader>
            <CardTitle>Send Sponsored Disposable Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Target address</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0x..." />
            </div>
            <Button className="w-full" onClick={sendDisposableTx}>Send 0 ETH to target (burn-after-use)</Button>
            {status && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{status}</p>}
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          Uses EntryPoint v0.7 with Pimlico sponsorship policy. One-time account is created via CREATE2 and burned after execution.
        </div>
      </main>
    </div>
  );
}
