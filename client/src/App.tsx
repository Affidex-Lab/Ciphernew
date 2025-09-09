import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [bundlerUrl, setBundlerUrl] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [factory, setFactory] = useState("");
  const [policyId, setPolicyId] = useState("");

  useEffect(() => {
    setBundlerUrl(localStorage.getItem("bundlerUrl") || "https://api.pimlico.io/v2/421614/rpc?apikey=pim_kBDzXSD66Uh8PFLaiUhEHZ");
    setEntryPoint(localStorage.getItem("entryPoint") || "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108");
    setFactory(localStorage.getItem("factory") || "");
    setPolicyId(localStorage.getItem("policyId") || "sp_certain_mathemanic");
  }, []);

  function saveConfig() {
    localStorage.setItem("bundlerUrl", bundlerUrl);
    localStorage.setItem("entryPoint", entryPoint);
    localStorage.setItem("factory", factory);
    localStorage.setItem("policyId", policyId);
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
              <Button className="w-full" onClick={saveConfig}>Save</Button>
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

        <div className="text-sm text-muted-foreground">
          Deploy contracts in /contracts and paste addresses here. Then plug in your bundler/paymaster to send UserOps.
        </div>
      </main>
    </div>
  );
}
