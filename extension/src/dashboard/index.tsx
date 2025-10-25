import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function rpc(action: string, payload?: any){
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage({ __cipherWallet__: true, origin: location.origin, action, payload }, (res) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (res && res.ok === false && res.error) return reject(new Error(res.error));
      resolve(res);
    });
  });
}

function Section({ title, children }: any){
  return <div style={{ border: '1px solid #eee', padding: 12, marginBottom: 12 }}><h3>{title}</h3>{children}</div>;
}

function App(){
  const [status, setStatus] = useState<any>(null);
  const [sendingNear, setSendingNear] = useState(false);

  async function refresh(){ const s = await rpc('status'); setStatus(s); }
  useEffect(()=>{ refresh(); }, []);

  if (!status) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h2>Cipher Wallet — Seedless</h2>
      <p>EVM: {status?.evm?.account} {status?.balances?.evm ? `— ${status.balances.evm} ETH` : ''} | NEAR: {status?.near?.accountId} {status?.balances?.near ? `— ${status.balances.near} Ⓝ` : ''}</p>

      <Section title="Portfolio">
        <div>
          <div>EVM: {status?.balances?.evm ?? '—'} ETH</div>
          <div>NEAR: {status?.balances?.near ?? '—'} Ⓝ</div>
        </div>
      </Section>

      <Section title="Send">
        <div style={{ display: 'flex', gap: 12 }}>
          <div>
            <h4>NEAR</h4>
            <form onSubmit={async (e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const to = String(fd.get('to')||''); const amt = String(fd.get('amt')||''); setSendingNear(true); try{ await rpc('near:signAndSendTransactions', { txs: [{ receiverId: to, actions: [{ transfer: { deposit: (window as any).near?.utils?.format?.parseNearAmount?.(amt) || (BigInt(parseFloat(amt)*1e24)).toString() } }] }] }); await refresh(); } finally{ setSendingNear(false); } }}>
              <input name="to" placeholder="receiver.near" />
              <input name="amt" placeholder="1.0" />
              <button disabled={sendingNear}>{sendingNear ? 'Sending…' : 'Send NEAR'}</button>
            </form>
          </div>
        </div>
      </Section>

      {Array.isArray(status?.pending) && status.pending.length > 0 && (
        <Section title="Pending requests">
          <ul>
            {status.pending.map((p:any)=> (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span>{p.origin} — {p.summary}</span>
                <span>
                  <button onClick={async()=>{ await rpc('pending:approve', { id: p.id }); await refresh(); }}>Approve</button>
                  <button style={{ marginLeft: 6 }} onClick={async()=>{ await rpc('pending:reject', { id: p.id }); await refresh(); }}>Reject</button>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Activity">
        <ul>
          {(status.activity || []).map((a:any, i:number)=> (
            <li key={i}>[{a.chain}] {a.kind} — {a.status} {a.txHash || a.uoHash || ''}</li>
          ))}
        </ul>
      </Section>

      <Section title="Tokens (NEAR defaults)">
        <ul>
          {(status?.config?.nearDefaultTokens || []).map((t:string)=> (<li key={t}>{t}</li>))}
        </ul>
      </Section>

      <Section title="Settings">
        <a href="../options/index.html" target="_blank">Open Options</a>
      </Section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
