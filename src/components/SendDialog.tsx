import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ethers } from 'ethers';
import { estimateUserOp, getGasPrice, getUserOpHash, sponsorUserOp, sendUserOp, getUserOpReceipt, UserOperation } from '@/lib/aa';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

export type Token = { address: string; symbol: string; name: string; decimals: number; balance: string };

export default function SendDialog({ open, onOpenChange, accountAddr, ownerPk, bundlerUrl, entryPoint, policyId, rpc, tokens, usdPrice }: { open: boolean; onOpenChange: (v:boolean)=>void; accountAddr: string|null; ownerPk: string|null; bundlerUrl: string; entryPoint: string; policyId: string; rpc: string; tokens: Token[]; usdPrice: number; }){
  const [mode, setMode] = useState<'native'|'erc20'>('native');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenAddr, setTokenAddr] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(()=>{ if (!open){ setRecipient(''); setAmount(''); setTokenAddr(''); setBusy(false); setStatus(''); setMode('native'); } }, [open]);

  const selectedToken = useMemo(()=> tokens.find(t=> t.address.toLowerCase() === (tokenAddr||'').toLowerCase()) || null, [tokens, tokenAddr]);

  function saveHistory(it: any){ try{ const list = JSON.parse(localStorage.getItem('history')||'[]'); list.push(it); localStorage.setItem('history', JSON.stringify(list)); }catch{} }

  async function send(){
    try{
      if (!accountAddr || !ownerPk) { (toast as any)?.info?.('Create or access your wallet first'); return; }
      if (!ethers.isAddress(recipient)) { (toast as any)?.info?.('Enter a valid recipient'); return; }
      setBusy(true); setStatus('Preparing...');
      const accountIface = new ethers.Interface([ 'function execute(address to,uint256 value,bytes data)' ]);
      let callData = '0x';
      let usd = 0;
      let txLabel = '';
      if (mode === 'native'){
        const value = ethers.parseEther((amount||'0').toString());
        callData = accountIface.encodeFunctionData('execute', [ recipient, value, '0x' ]);
        usd = Number(amount||'0') * (usdPrice||0);
        txLabel = `${amount||'0'} ETH → ${recipient}`;
      } else {
        if (!ethers.isAddress(tokenAddr)) { (toast as any)?.info?.('Select a token'); setBusy(false); return; }
        const dec = selectedToken?.decimals ?? 18;
        const value = ethers.parseUnits((amount||'0').toString(), dec);
        const erc20 = new ethers.Interface([ 'function transfer(address to,uint256 value)' ]);
        const data = erc20.encodeFunctionData('transfer', [ recipient, value ]);
        callData = accountIface.encodeFunctionData('execute', [ tokenAddr, 0, data ]);
        usd = 0; // unknown; could integrate price API
        txLabel = `${amount||'0'} ${selectedToken?.symbol||'Token'} → ${recipient}`;
      }

      let userOp: UserOperation = { sender: accountAddr, nonce: 0n, initCode: '0x', callData, callGasLimit: 0n, verificationGasLimit: 0n, preVerificationGas: 0n, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n, paymasterAndData: '0x', signature: '0x' };
      setStatus(s=> s + '\nEstimating gas...');
      const est = await estimateUserOp(bundlerUrl, userOp, entryPoint);
      const gasPrice = await getGasPrice(bundlerUrl);
      userOp = { ...userOp, callGasLimit: BigInt(est.callGasLimit)+20000n, verificationGasLimit: BigInt(est.verificationGasLimit)+20000n, preVerificationGas: BigInt(est.preVerificationGas)+20000n, maxFeePerGas: gasPrice.maxFeePerGas, maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas };
      setStatus(s=> s + '\nRequesting sponsorship...');
      const spon = await sponsorUserOp(bundlerUrl, userOp, entryPoint, policyId);
      userOp.paymasterAndData = spon.paymasterAndData;
      setStatus(s=> s + '\nComputing userOpHash...');
      const uoh = await getUserOpHash(rpc, entryPoint, userOp);
      const w = new ethers.Wallet(ownerPk);
      userOp.signature = await w.signMessage(ethers.getBytes(uoh));
      setStatus(s=> s + '\nSending user operation...');
      const uoHash = await sendUserOp(bundlerUrl, userOp, entryPoint);
      setStatus(s=> s + `\nSubmitted: ${uoHash}\nWaiting for receipt...`);

      saveHistory({ time: Date.now(), kind: mode==='native' ? 'send' : 'send-token', details: txLabel, uoHash, status: 'pending' });
      track('tx_sent', { type: mode, symbol: selectedToken?.symbol || (mode==='native' ? 'ETH' : ''), usd });

      for (let i=0;i<20;i++){
        await new Promise(r=> setTimeout(r, 1500));
        const rec = await getUserOpReceipt(bundlerUrl, uoHash);
        const tx = rec?.receipt?.transactionHash;
        if (tx){ try{ const list = JSON.parse(localStorage.getItem('history')||'[]'); const idx = list.findIndex((h:any)=>h.uoHash===uoHash); if (idx>=0){ list[idx].txHash = tx; list[idx].status='confirmed'; localStorage.setItem('history', JSON.stringify(list)); } }catch{} break; }
      }
      (toast as any)?.success?.('Transfer submitted');
      onOpenChange(false);
    }catch(e:any){ (toast as any)?.error?.('Transfer failed', { description: e?.message || String(e) }); setStatus(String(e?.message||e)); setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label>Type</Label>
              <Select value={mode} onValueChange={(v)=> setMode(v as any)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="native">Native</SelectItem>
                  <SelectItem value="erc20">ERC-20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode==='erc20' && (
              <div className="sm:col-span-2">
                <Label>Token</Label>
                <Select value={tokenAddr} onValueChange={setTokenAddr}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select token"/></SelectTrigger>
                  <SelectContent>
                    {tokens.map(t=> (
                      <SelectItem key={t.address} value={t.address}>{t.symbol || 'Token'} · {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Recipient</Label>
            <Input value={recipient} onChange={(e)=>setRecipient(e.target.value)} placeholder="0x..." />
          </div>
          <div className="space-y-1">
            <Label>Amount {mode==='native' ? '(ETH)' : (selectedToken ? `(${selectedToken.symbol})` : '')}</Label>
            <Input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button onClick={send} disabled={busy || !recipient || !amount || (mode==='erc20' && !tokenAddr)}>Send</Button>
          </div>
          {status && (<pre className="whitespace-pre-wrap text-xs text-muted-foreground">{status}</pre>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}