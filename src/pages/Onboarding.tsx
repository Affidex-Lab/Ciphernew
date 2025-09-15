import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encodeSelf, estimateUserOp, getGasPrice, getUserOpHash, packInitCode, predictAccountAddress, sponsorUserOp, sendUserOp, UserOperation, dataConfigureGuardiansBySelf } from "../lib/aa";
import { useNavigate } from "react-router-dom";

export default function Onboarding(){
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [accFactory, setAccFactory] = useState("");
  const [policyId, setPolicyId] = useState("");

  const [ownerPk, setOwnerPk] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [accSalt, setAccSalt] = useState<string | null>(null);
  const [accountAddr, setAccountAddr] = useState<string | null>(null);

  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const [delayHours, setDelayHours] = useState<string>("48");

  const [status, setStatus] = useState("");

  const nav = useNavigate();
  const rpc = useMemo(()=> bundlerUrl || "", [bundlerUrl]);

  useEffect(()=>{
    (async()=>{
      try{
        let serverCfg: any = {};
        try{
          const res = await fetch("/config.json", { cache: "no-store"});
          if (res.ok) serverCfg = await res.json();
        }catch{}
        const envBundler = (import.meta as any).env?.VITE_BUNDLER_URL || "";
        const envEntry = (import.meta as any).env?.VITE_ENTRYPOINT || "";
        const envAccFactory = (import.meta as any).env?.VITE_ACCOUNT_FACTORY || "";
        const envPolicy = (import.meta as any).env?.VITE_SPONSORSHIP_POLICY_ID || "";
        const ls = (k:string)=> localStorage.getItem(k) || "";
        setBundlerUrl(ls("bundlerUrl") || serverCfg.bundlerUrl || envBundler);
        setEntryPoint(ls("entryPoint") || serverCfg.entryPoint || envEntry);
        setAccFactory(ls("accFactory") || serverCfg.accountFactory || envAccFactory);
        setPolicyId(ls("policyId") || serverCfg.policyId || envPolicy);
      }catch{}
    })();
  },[]);

  function ensureOwner(){
    if (ownerPk && ownerAddr && accSalt) return new ethers.Wallet(ownerPk);
    const w = ethers.Wallet.createRandom();
    setOwnerPk(w.privateKey);
    setOwnerAddr(w.address);
    const s = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);
    setAccSalt(s);
    return w;
  }

  async function predict(){
    try{
      const w = ensureOwner();
      const salt = accSalt!;
      const predicted = await predictAccountAddress(rpc, accFactory, entryPoint, w.address, salt);
      setAccountAddr(predicted);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function deploy(){
    try{
      const w = ensureOwner();
      const salt = accSalt!;
      const predicted = await predictAccountAddress(rpc, accFactory, entryPoint, w.address, salt);
      setAccountAddr(predicted);
      let userOp: UserOperation = {
        sender: predicted, nonce: 0n,
        initCode: packInitCode(accFactory, entryPoint, w.address, salt),
        callData: "0x",
        callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n,
        maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x"
      };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp,
        callGasLimit: BigInt(est.callGasLimit)+20000n,
        verificationGasLimit: BigInt(est.verificationGasLimit)+20000n,
        preVerificationGas: BigInt(est.preVerificationGas)+20000n,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      setStatus((s)=> s + `\nDeploying account ${predicted}...`);
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nDeploy submitted: ${uoHash}`);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function configureGuardians(){
    try{
      if (!accountAddr) throw new Error("Deploy or predict account first");
      const w = ensureOwner();
      const delaySeconds = Math.max(0, Math.floor(Number(delayHours||"0") * 3600));
      const data = dataConfigureGuardiansBySelf([g1,g2,g3].filter(Boolean), 2, delaySeconds);
      let userOp: UserOperation = {
        sender: accountAddr, nonce: 0n, initCode: "0x",
        callData: encodeSelf(accountAddr, data),
        callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n,
        maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x"
      };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp,
        callGasLimit: BigInt(est.callGasLimit)+20000n,
        verificationGasLimit: BigInt(est.verificationGasLimit)+20000n,
        preVerificationGas: BigInt(est.preVerificationGas)+20000n,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nGuardians configured: ${uoHash}`);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
        <Button variant="outline" size="sm" onClick={()=>nav('/dashboard')}>Go to Dashboard</Button>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20">
        <Card className="w-full text-left">
          <CardHeader><CardTitle>Seedless Wallet Onboarding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Owner Address</Label>
                <Input readOnly value={ownerAddr || ''} placeholder="Click 'Generate Owner Key'" />
              </div>
              <div>
                <Label>Predicted Account</Label>
                <Input readOnly value={accountAddr || ''} placeholder="Click 'Predict' or 'Deploy'" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={()=>{ const w=ensureOwner(); setOwnerPk(w.privateKey); setOwnerAddr(w.address); }}>Generate Owner Key</Button>
              <Button variant="outline" onClick={predict}>Predict</Button>
              <Button variant="outline" onClick={deploy}>Deploy Account</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full text-left">
          <CardHeader><CardTitle>Guardians</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Guardian 1</Label><Input value={g1} onChange={(e)=>setG1(e.target.value)} placeholder="0x..."/></div>
              <div><Label>Guardian 2</Label><Input value={g2} onChange={(e)=>setG2(e.target.value)} placeholder="0x..."/></div>
              <div><Label>Guardian 3</Label><Input value={g3} onChange={(e)=>setG3(e.target.value)} placeholder="0x..."/></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label>Threshold</Label>
                <Input readOnly value="2" />
              </div>
              <div className="sm:col-span-2">
                <Label>Recovery delay (hours)</Label>
                <Input value={delayHours} onChange={(e)=>setDelayHours(e.target.value)} placeholder="48" />
              </div>
            </div>
            <Button onClick={configureGuardians}>Set Guardians</Button>
          </CardContent>
        </Card>

        <Card className="w-full text-left">
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{status || 'Ready.'}</pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
