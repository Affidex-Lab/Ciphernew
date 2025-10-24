import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { estimateUserOp, getGasPrice, getUserOpHash, packInitCode, predictAccountAddress, sponsorUserOp, sendUserOp, UserOperation, getChainId } from "../lib/aa";
import { useNavigate } from "react-router-dom";
import { track } from "../lib/analytics";
import { upsertUser } from "../lib/supabase";

export default function Onboarding(){
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [accFactory, setAccFactory] = useState("");
  const [policyId, setPolicyId] = useState("");

  const [ownerPk, setOwnerPk] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [accSalt, setAccSalt] = useState<string | null>(null);
  const [accountAddr, setAccountAddr] = useState<string | null>(null);


  const [status, setStatus] = useState("");
  const [email, setEmail] = useState<string>("");
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [lastBackup, setLastBackup] = useState<{ blob: Blob, fileName: string } | null>(null);

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
        track('onboarding_started');
      }catch{}
    })();
  },[]);

  function ensureOwner(){
    if (ownerPk && ownerAddr && accSalt) return new ethers.Wallet(ownerPk);
    const w = ethers.Wallet.createRandom();
    setOwnerPk(w.privateKey);
    setOwnerAddr(w.address);
    localStorage.setItem('ownerPk', w.privateKey);
    localStorage.setItem('ownerAddr', w.address);
    const s = ethers.hexlify(ethers.randomBytes(32));
    setAccSalt(s);
    localStorage.setItem('accSalt', s);
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
      localStorage.setItem('accountAddr', predicted);
      // seed default accounts list
      try{
        const existing = JSON.parse(localStorage.getItem('accounts')||'[]');
        if (!Array.isArray(existing) || existing.length===0){
          const rec = { label: 'Account 1', ownerPk: w.privateKey, ownerAddr: w.address, accSalt: salt, accountAddr: predicted };
          localStorage.setItem('accounts', JSON.stringify([rec])); localStorage.setItem('accountIdx','0');
        }
      }catch{}
      // analytics
      try{
        const cid = await getChainId(rpc);
        const netKey = String(cid) === '421614' ? 'arbitrum-sepolia' : (String(cid) === '42161' ? 'arbitrum-one' : String(cid));
        track('onboarding_completed', { accountAddr: predicted, networkKey: netKey });
      }catch{}
      // optional supabase
      try{ if (email && predicted) { await upsertUser({ account_addr: predicted, email }); } }catch{}
    }catch(e:any){ setStatus(`Error: ${e?.message||e}`); }
  }


  function bytesToBase64(bytes: ArrayBuffer): string { const bin = String.fromCharCode(...new Uint8Array(bytes)); return btoa(bin); }
  function base64ToBytes(b64: string): Uint8Array { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
  function b64url(bytes: ArrayBuffer | Uint8Array): string { const b64 = bytesToBase64(bytes instanceof Uint8Array ? bytes.buffer : bytes); return b64.replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); }
  function concatU8(...arrs: Uint8Array[]){ const total = arrs.reduce((n,a)=>n+a.length,0); const out = new Uint8Array(total); let off=0; for (const a of arrs){ out.set(a,off); off+=a.length; } return out; }
  function randomCode(){ const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const arr = new Uint8Array(16); crypto.getRandomValues(arr); let s=""; for(let i=0;i<arr.length;i++) s+=alphabet[arr[i]%alphabet.length]; return `${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}-${s.slice(12,16)}`; }
  async function deriveKeyFromCode(code: string, salt: Uint8Array) { const enc = new TextEncoder(); const raw = await crypto.subtle.importKey("raw", enc.encode(code), { name: "PBKDF2" }, false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" }, raw, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]); }
  async function createRecoveryBackup(){ if(!ownerPk||!ownerAddr) return; const code = randomCode(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await deriveKeyFromCode(code, salt); const enc = new TextEncoder(); const data = enc.encode(JSON.stringify({ ownerPk })); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data); const backup = { version: 1, kdf: "PBKDF2-HMAC-SHA256", iterations: 200000, algo: "AES-GCM", salt: bytesToBase64(salt.buffer), iv: bytesToBase64(iv.buffer), ciphertext: bytesToBase64(ct), address: ownerAddr, createdAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }); const fileName = `cipher-recovery-${ownerAddr.slice(2,8)}.json`; setLastBackup({ blob, fileName }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setRecoveryCode(code); }
  async function createPasskeyRecoveryKit(){ if(!ownerPk||!ownerAddr) return; if(!('credentials' in navigator)) return; const rpId = location.hostname; const pubKey: PublicKeyCredentialCreationOptions = { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { id: rpId, name: 'Cipher Wallet' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: ownerAddr!, displayName: ownerAddr! }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000, attestation: 'none' }; const cred = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential; if (!cred) return; const credId = new Uint8Array(cred.rawId); const challenge = crypto.getRandomValues(new Uint8Array(32)); const assertion = (await navigator.credentials.get({ publicKey: { challenge, allowCredentials: [{ id: credId, type: 'public-key', transports: ['internal'] }], userVerification: 'required', timeout: 60000 } })) as PublicKeyCredential; const resp = assertion.response as AuthenticatorAssertionResponse; const sig = new Uint8Array(resp.signature); const client = new Uint8Array(resp.clientDataJSON); const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', concatU8(sig, client, challenge))); const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']); const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ ownerPk }))); const backup = { version: 2, type: 'passkey', rpId, credentialId: b64url(credId), challenge: b64url(challenge), iv: b64url(iv), ciphertext: b64url(new Uint8Array(ct)), address: ownerAddr, createdAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`cipher-passkey-recovery-${ownerAddr.slice(2,8)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
        <Button variant="outline" size="sm" onClick={()=>nav('/dashboard')}>Finish</Button>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20">
        <Card className="w-full text-left">
          <CardHeader><CardTitle>Seedless Wallet Onboarding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Owner Address</Label>
                <Input readOnly value={ownerAddr || ''} placeholder="Click 'Generate Owner Key'" />
              </div>
              <div>
                <Label>Predicted Account</Label>
                <Input readOnly value={accountAddr || ''} placeholder="Click 'Predict' or 'Deploy'" />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@domain.com" />
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
          <CardHeader><CardTitle>Backup Recovery Kit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Create and download an encrypted Recovery Kit for your owner key. You can also create a Passkey kit.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={async()=>{ await createRecoveryBackup(); }}>Create Recovery Kit</Button>
              <Button variant="outline" onClick={async()=>{ await createPasskeyRecoveryKit(); }}>Create Passkey Kit</Button>
            </div>
            {recoveryCode && (<div className="text-xs">Your Recovery Code: <span className="font-mono">{recoveryCode}</span></div>)}
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
