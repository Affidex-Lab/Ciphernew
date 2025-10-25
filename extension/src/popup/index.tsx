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

function App(){
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(){
    const s = await rpc('status');
    setStatus(s);
  }

  useEffect(()=>{ refresh(); }, []);

  async function create(){ setLoading(true); await rpc('onboarding:create'); await refresh(); setLoading(false); }

  if (!status) return <div style={{ padding: 12 }}>Loading…</div>;

  const evmAddr = status?.evm?.account;
  const nearId = status?.near?.accountId;

  const firstRun = !evmAddr || !nearId;

  return (
    <div style={{ padding: 12, minWidth: 320 }}>
      <h3>Cipher Wallet — Seedless</h3>
      {firstRun ? (
        <div>
          <p>Welcome. Create a seedless wallet or access via recovery file.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={create} disabled={loading}>{loading ? 'Creating…' : 'Create Seedless Wallet'}</button>
            <label style={{ display: 'inline-block' }}>
              <input type="file" accept="application/json" style={{ display: 'none' }} onChange={async (e)=>{
                const file = e.target.files?.[0]; if (!file) return;
                const pass = prompt('Enter passphrase to decrypt recovery file');
                const text = await file.text();
                const json = JSON.parse(text);
                await rpc('onboarding:importRecovery', { file: json, passphrase: pass || '' });
                await refresh();
              }} />
              <span style={{ border: '1px solid #ccc', padding: '4px 8px', cursor: 'pointer' }}>Access Seedless Wallet</span>
            </label>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <div><b>EVM</b>: {evmAddr} {status?.balances?.evm ? `— ${status.balances.evm} ETH` : ''}</div>
            <div><b>NEAR</b>: {nearId} {status?.balances?.near ? `— ${status.balances.near} Ⓝ` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <a href="../dashboard/index.html" target="_blank">Open Dashboard</a>
            <a href="../options/index.html" target="_blank">Settings</a>
          </div>
          {Array.isArray(status?.pending) && status.pending.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <b>Pending requests</b>
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
            </div>
          )}
          <div>
            <b>Recent Activity</b>
            <ul>
              {(status.activity || []).slice(0,5).map((a:any, i:number)=> (
                <li key={i}>[{a.chain}] {a.kind} — {a.status}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
