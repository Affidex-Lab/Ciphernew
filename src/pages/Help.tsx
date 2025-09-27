import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Help(){
  const nav = useNavigate();
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-background to-background pb-20">
      <header className="mx-auto w-full max-w-6xl px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold tracking-tight">Help & FAQ</div>
        <Button variant="outline" size="sm" onClick={()=>nav('/dashboard')}>Back to Wallet</Button>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 space-y-4 text-left">
        <Card>
          <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Create wallet</div>
              Tap “Create Seedless Wallet”. Your smart account is deployed automatically. You’ll see Status updates for advanced details.
            </div>
            <div>
              <div className="font-medium text-foreground">Receive funds</div>
              Open Receive to copy your address or scan the QR code. Send assets from any exchange or wallet.
            </div>
            <div>
              <div className="font-medium text-foreground">Send funds (disposable wallet)</div>
              Use Send to create a one‑time wallet that sends and then burns itself for transaction‑level privacy.
            </div>
            <div>
              <div className="font-medium text-foreground">Add tokens</div>
              Press “+ Add” → Search to find a token by name, or use Custom to paste a contract address.
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={()=>nav('/dashboard?autocreate=1')}>Create wallet now</Button>
              <Button variant="outline" size="sm" onClick={()=>nav('/dashboard')}>Open Dashboard</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recovery</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Recovery Kit (file + code)</div>
              Create a Recovery Kit after wallet setup. Save the file locally and store the Recovery Code safely.
              You can tap “Save to Google Drive” to quickly back it up.
            </div>
            <div>
              <div className="font-medium text-foreground">Restore from Recovery Kit</div>
              Enter the Recovery Code and select the saved .json file, then tap Restore Owner Key.
            </div>
            <div>
              <div className="font-medium text-foreground">Passkey recovery</div>
              On supported devices, create a Passkey Kit and later restore by authenticating with your device passkey.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tokens & approvals</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              <div className="font-medium text-foreground">Manage tokens</div>
              Use “+ Add” to search or paste a token address. Use Discover to auto‑add tokens you’ve interacted with recently.
            </div>
            <div>
              <div className="font-medium text-foreground">Guardian approvals</div>
              If you receive an approval link, open it and connect your wallet to approve recovery to a new owner.
            </div>
            <div>
              <div className="font-medium text-foreground">Status panel</div>
              Shows advanced technical details (estimations, hashes, receipts). You can ignore it unless troubleshooting.
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
            <div>
              <div className="font-medium text-foreground">Can’t find Drive option</div>
              The “Save to Google Drive” button appears after you create a Recovery Kit.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
