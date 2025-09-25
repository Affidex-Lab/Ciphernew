import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function Access(){
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [accountAddr, setAccountAddr] = useState("");
  const [ownerPk, setOwnerPk] = useState("");
  const [ownerAddr, setOwnerAddr] = useState("");
  const nav = useNavigate();

  const rpc = useMemo(()=> rpcUrl || bundlerUrl || "", [rpcUrl, bundlerUrl]);

  useEffect(()=>{
    (async()=>{
      try{
        const DEFAULTS = {
          bundlerUrl: "https://api.pimlico.io/v2/421614/rpc?apikey=pim_kBDzXSD66Uh8PFLaiUhEHZ",
          rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
          entryPoint: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
          disposableFactory: "0xfFa7a8DB30B46cEb36685b01D766fabE298080c1",
          accountFactory: "0x8a060835a49BaCD214da97B258D5d2FE58545330",
          policyId: "sp_certain_mathemanic",
        };
        let serverCfg: any = {};
        try{ const res = await fetch('/config.json', { cache: 'no-store' }); if (res.ok) serverCfg = await res.json(); }catch{}
        const ls = (k:string)=> localStorage.getItem(k) || "";
        setBundlerUrl(ls('bundlerUrl') || serverCfg.bundlerUrl || DEFAULTS.bundlerUrl);
        setRpcUrl(ls('rpcUrl') || serverCfg.rpcUrl || DEFAULTS.rpcUrl);
        const qs = new URLSearchParams(typeof window!== 'undefined' ? window.location.search : "");
        const acc = qs.get('account') || ""; if (acc) setAccountAddr(acc);
      }catch{}
    })();
  },[]);

  function load(){
    if (!ethers.isAddress(accountAddr)) { alert('Enter a valid account address'); return; }
    localStorage.setItem('accountAddr', accountAddr);
    if (ownerPk){
      try{
        const w = new ethers.Wallet(ownerPk);
        setOwnerAddr(w.address);
        localStorage.setItem('ownerPk', ownerPk);
        localStorage.setItem('ownerAddr', w.address);
      }catch{ alert('Invalid private key (optional field)'); }
    }
    nav('/dashboard');
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
        <Button variant="outline" size="sm" onClick={()=>nav('/')}>Home</Button>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-20">
        <Card>
          <CardHeader><CardTitle>Access Your Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Account address</Label>
              <Input value={accountAddr} onChange={(e)=>setAccountAddr(e.target.value)} placeholder="0x..." />
            </div>
            <div className="space-y-1">
              <Label>Owner private key (optional, demo only)</Label>
              <Input value={ownerPk} onChange={(e)=>setOwnerPk(e.target.value)} placeholder="0x..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={load}>Access Wallet</Button>
              <Button variant="outline" onClick={()=>nav('/dashboard?autocreate=1')}>Create new</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
