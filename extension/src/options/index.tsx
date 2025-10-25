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
  const [enabled, setEnabled] = useState(false);

  async function refresh(){
    const s = await rpc('status');
    setStatus(s);
    setEnabled(Boolean(s?.locked));
  }

  useEffect(()=>{ refresh(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Settings</h2>

      <div style={{ marginTop: 16 }}>
        <h3>Passphrase</h3>
        <p>Enable a passphrase to require unlock on each session.</p>
        <button onClick={async ()=>{
          const pass = prompt('Enter new passphrase'); if(!pass) return;
          await rpc('enablePassphrase', { passphrase: pass });
          await refresh();
        }}>Enable</button>
        <button style={{ marginLeft: 8 }} onClick={async ()=>{
          await rpc('disablePassphrase');
          await refresh();
        }}>Disable</button>
        <button style={{ marginLeft: 8 }} onClick={async ()=>{
          const pass = prompt('Enter passphrase to unlock'); if(!pass) return;
          await rpc('unlock', { passphrase: pass });
          await refresh();
        }}>Unlock</button>
        <button style={{ marginLeft: 8 }} onClick={async ()=>{ await rpc('lock'); await refresh(); }}>Lock</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Approvals</h3>
        <p>Sites request permission when connecting. Approve per origin in popups.</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Export / Import</h3>
        <button onClick={()=> alert('Use dashboard for export/import in next iteration.')}>Export Recovery File</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
