import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Cipher Wallet</span>
        </div>
        <Button variant="outline" size="sm" onClick={()=>nav('/access')}>Access Wallet</Button>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 pb-20">
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
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={()=>nav('/onboarding')}>Create Seedless Wallet</Button>
              <Button variant="outline" size="lg" onClick={()=>nav('/access')}>Access Wallet</Button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
