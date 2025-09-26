import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Help(){
  const nav = useNavigate();
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background pb-20">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="text-lg font-semibold tracking-tight">Help & FAQ</div>
        <Button variant="outline" size="sm" onClick={()=>nav('/dashboard')}>Back to Wallet</Button>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 space-y-4">
        <Card>
          <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Create wallet</div>
              Tap “Create Seedless Wallet”. Your smart account is deployed for you automatically.
            </div>
            <div>
              <div className="font-medium text-foreground">Fund wallet</div>
              Use any exchange/on‑ramp to send assets to your account address shown under Receive.
            </div>
            <div>
              <div className="font-medium text-foreground">Add tokens</div>
              Press “+ Add” → Search to find a token by name, or use Custom to paste a contract address.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recovery</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Recovery Kit</div>
              Create a Recovery Kit to back up your owner key. Store the file safely; you can also save it to Google Drive.
            </div>
            <div>
              <div className="font-medium text-foreground">Passkey recovery</div>
              On supported devices, you can create a Passkey Kit and restore with your device passkey.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Network busy or errors</div>
              Switch network in the dropdown, try again in a few seconds, or check your RPC settings in Settings.
            </div>
            <div>
              <div className="font-medium text-foreground">Token not showing</div>
              Ensure you added it on the current network. Switch network to view tokens saved for that chain.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
