import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ethers, BrowserProvider } from "ethers";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Approve() {
  const [account, setAccount] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [status, setStatus] = useState("");

  useEffect(()=>{
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
    setAccount(params.get('account') || "");
    setNewOwner(params.get('newOwner') || "");
  }, []);

  async function approve() {
    try {
      if (!(window as any).ethereum) { try { (toast as any)?.info?.('Install MetaMask or a wallet'); } catch {} return; }
      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x66EEE' }]).catch(()=>{});
      const signer = await provider.getSigner();
      const iface = new ethers.Interface(["function proposeRecovery(address newOwner)"]);
      const data = iface.encodeFunctionData("proposeRecovery", [newOwner]);
      const tx = await signer.sendTransaction({ to: account, data });
      setStatus(`Submitted: ${tx.hash}`);
    } catch(e:any) {
      setStatus(`Error: ${e?.message||e}`);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-20">
        <Card>
          <CardHeader><CardTitle>Guardian Approval</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Approve recovery for account {account ? `${account.slice(0,6)}…${account.slice(-4)}` : '—'} to new owner {newOwner ? `${newOwner.slice(0,6)}…${newOwner.slice(-4)}` : '—'}.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Account</Label><Input value={account} onChange={(e)=>setAccount(e.target.value)} placeholder="0x..."/></div>
              <div><Label>New owner</Label><Input value={newOwner} onChange={(e)=>setNewOwner(e.target.value)} placeholder="0x..."/></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={approve}>Connect wallet and Approve</Button>
              <Button variant="outline" onClick={()=>{
                const url = `${window.location.origin}/approve?account=${account}&newOwner=${newOwner}`;
                navigator.clipboard.writeText(url);
                try { (toast as any)?.success?.('Approval link copied'); } catch {}
              }}>Copy approval link</Button>
            </div>
            {status && (<p className="text-xs text-muted-foreground">{status}</p>)}
          </CardContent>
        </Card>
        <Toaster richColors position="top-center" />
      </main>
    </div>
  );
}
