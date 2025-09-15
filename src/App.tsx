import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, Sparkles, WalletMinimal, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ethers, BrowserProvider } from "ethers";
import { encodeExecuteAndBurn, estimateUserOp, getGasPrice, getUserOpHash, packInitCode, predictAccountAddress, sponsorUserOp, sendUserOp, UserOperation, getUserOpReceipt, encodeSelf, dataConfigureGuardiansBySelf, dataSetFrozenBySelf, dataProposeRecoveryBySelf, dataExecuteRecovery, recoveryId, readRecovery, getChainId } from "./lib/aa";

export default function Home() {
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

  // Seedless account state
  const [ownerPk, setOwnerPk] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [accSalt, setAccSalt] = useState<string | null>(null);
  const [accountAddr, setAccountAddr] = useState<string | null>(null);
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  const [g3, setG3] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [recInfo, setRecInfo] = useState<{start?: bigint, confirms?: bigint, newOwner?: string} | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<string>("");

  const rpc = useMemo(() => bundlerUrl || "", [bundlerUrl]);

  // Guardian approve via link
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const approveMode = params.get('approve') === '1' || params.get('guardian') === '1';
  const approveAccount = params.get('account') || "";
  const approveNewOwner = params.get('newOwner') || "";

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

  useEffect(()=>{
    (async()=>{
      try{
        // preload from localStorage for returning users
        const lsAcc = localStorage.getItem('accountAddr');
        const lsPk = localStorage.getItem('ownerPk');
        const lsOwner = localStorage.getItem('ownerAddr');
        if (lsAcc && !accountAddr) setAccountAddr(lsAcc);
        if (lsPk && !ownerPk) setOwnerPk(lsPk);
        if (lsOwner && !ownerAddr) setOwnerAddr(lsOwner);
      }catch{}
    })();
  },[]);

  useEffect(()=>{
    (async()=>{
      try{
        if (!rpc || !accountAddr) { setBalance(""); return; }
        const provider = new ethers.JsonRpcProvider(rpc);
        const bal = await provider.getBalance(accountAddr);
        setBalance(ethers.formatEther(bal));
      }catch{}
    })();
  },[rpc, accountAddr]);

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
    const s = ethers.zeroPadValue(ethers.toBeHex(ethers.randomBytes(32)), 32);
    setAccSalt(s);
    return w;
  }

  async function deployAccount() {
    try {
      const w = ensureOwner();
      const salt = accSalt!;
      const predicted = await predictAccountAddress(rpc, accFactory, entryPoint, w.address, salt);
      setAccountAddr(predicted);

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
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      setStatus((s)=> s + `\nDeploying account ${predicted}...`);
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nDeploy submitted: ${uoHash}`);
    } catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function setGuardians() {
    try {
      if (!accountAddr) throw new Error("Deploy or predict account first");
      const w = ensureOwner();
      const data = dataConfigureGuardiansBySelf([g1,g2,g3].filter(Boolean), 2, 48*3600);
      let userOp: UserOperation = {
        sender: accountAddr,
        nonce: 0n,
        initCode: "0x",
        callData: encodeSelf(accountAddr, data),
        callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n,
        maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x"
      };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nGuardians configured: ${uoHash}`);
    } catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function toggleFreeze(v: boolean){
    try {
      if (!accountAddr) throw new Error("Deploy or predict account first");
      const w = ensureOwner();
      const data = dataSetFrozenBySelf(v);
      let userOp: UserOperation = { sender: accountAddr, nonce: 0n, initCode: "0x", callData: encodeSelf(accountAddr, data), callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x" };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nFreeze ${v?'on':'off'}: ${uoHash}`);
    } catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function ownerProposeRecovery(){
    try{
      if (!accountAddr || !newOwner) throw new Error("Account/newOwner required");
      const w = ensureOwner();
      const data = dataProposeRecoveryBySelf(newOwner);
      let userOp: UserOperation = { sender: accountAddr, nonce: 0n, initCode: "0x", callData: encodeSelf(accountAddr, data), callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x" };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nOwner proposed recovery: ${uoHash}`);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function executeRecoveryNow(){
    try{
      if (!accountAddr || !newOwner) throw new Error("Account/newOwner required");
      const w = ensureOwner();
      const cid = chainId ?? await getChainId(rpc);
      const id = recoveryId(accountAddr, cid, newOwner);
      const data = dataExecuteRecovery(id);
      let userOp: UserOperation = { sender: accountAddr, nonce: 0n, initCode: "0x", callData: encodeSelf(accountAddr, data), callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: "0x", signature: "0x" };
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const sig = await w.signMessage(ethers.getBytes(uoh));
      userOp.signature = sig;
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus((s)=> s + `\nExecute recovery submitted: ${uoHash}`);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }

  async function checkRecovery(){
    try{
      if (!accountAddr || !newOwner) throw new Error("Account/newOwner required");
      const cid = chainId ?? await getChainId(rpc);
      const id = recoveryId(accountAddr, cid, newOwner);
      const info = await readRecovery(rpc, accountAddr, id);
      setRecInfo(info);
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
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
        {approveMode && (
          <Card className="w-full text-left">
            <CardHeader><CardTitle>Guardian Approval</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Approve recovery for account {approveAccount.slice(0,6)}…{approveAccount.slice(-4)} to new owner {approveNewOwner.slice(0,6)}…{approveNewOwner.slice(-4)}.</p>
              <Button onClick={async ()=>{
                if (!(window as any).ethereum) { alert('Install MetaMask or a wallet'); return; }
                const provider = new BrowserProvider((window as any).ethereum);
                await provider.send('wallet_switchEthereumChain', [{ chainId: '0x66EEE' }]).catch(()=>{});
                const signer = await provider.getSigner();
                const iface = new ethers.Interface(["function proposeRecovery(address newOwner)"]);
                const data = iface.encodeFunctionData("proposeRecovery", [approveNewOwner]);
                const tx = await signer.sendTransaction({ to: approveAccount, data });
                alert(`Submitted: ${tx.hash}`);
              }}>Connect wallet and Approve</Button>
            </CardContent>
          </Card>
        )}
        {!accountAddr && (
          <div className="relative mt-6 rounded-2xl border border-border/50 bg-gradient-to-br from-[#0b1220] to-background p-10 text-center shadow-[0_0_80px_-30px_#1EA7FD]">
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
            </div>
          </div>
        )}

        {accountAddr && (
          <Card className="w-full max-w-6xl text-left">
            <CardHeader><CardTitle>Your Wallet</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Account: {accountAddr.slice(0,6)}…{accountAddr.slice(-4)}{ownerAddr? ` · Owner: ${ownerAddr.slice(0,6)}…${ownerAddr.slice(-4)}`: ''}</p>
              <p className="text-sm">Balance: {balance? `${balance} ETH` : '—'}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => { setOpenTransfer(true); setStep(1); }}>One‑time Private Transfer</Button>
                <Button variant="outline" onClick={()=>toggleFreeze(true)}>Freeze</Button>
                <Button variant="outline" onClick={()=>toggleFreeze(false)}>Unfreeze</Button>
              </div>
            </CardContent>
          </Card>
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
        {accountAddr && (
        <Card className="w-full max-w-6xl text-left">
          <CardHeader><CardTitle>Wallet Controls (Guardians & Recovery)</CardTitle></CardHeader>
          <CardContent className="space-y-3">

            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Guardian 1</Label><Input value={g1} onChange={(e)=>setG1(e.target.value)} placeholder="0x..."/></div>
              <div><Label>Guardian 2</Label><Input value={g2} onChange={(e)=>setG2(e.target.value)} placeholder="0x..."/></div>
              <div><Label>Guardian 3</Label><Input value={g3} onChange={(e)=>setG3(e.target.value)} placeholder="0x..."/></div>
            </div>
            <Button onClick={setGuardians}>Set Guardians (2-of-3, 48h)</Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>New Owner (for recovery)</Label>
                <Input value={newOwner} onChange={(e)=>setNewOwner(e.target.value)} placeholder="0x..."/>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={ownerProposeRecovery}>Owner proposes</Button>
                <Button variant="outline" onClick={checkRecovery}>Check status</Button>
                <Button variant="outline" onClick={executeRecoveryNow}>Execute</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label>Guardian approval link</Label>
              <Button variant="outline" size="sm" onClick={()=>{
                if (!accountAddr || !newOwner) { alert('Enter new owner first'); return; }
                const url = `${window.location.origin}/approve?account=${accountAddr}&newOwner=${newOwner}`;
                navigator.clipboard.writeText(url);
                alert('Copied: ' + url);
              }}><Link2 className="mr-2 h-4 w-4"/>Copy</Button>
            </div>
            {recInfo && (
              <p className="text-xs text-muted-foreground">Confirms: {String(recInfo.confirms)} · New owner: {recInfo.newOwner}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Guardians must each call <code>proposeRecovery(newOwner)</code> on the account contract to approve. After 48h and 2 approvals, click Execute.
            </p>
          </CardContent>
        </Card>
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
