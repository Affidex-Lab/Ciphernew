// Content script: injects providers into the page and bridges messages between page and background

function inject(scriptPath: string){
  try {
    const url = chrome.runtime.getURL(scriptPath);
    const s = document.createElement('script');
    s.src = url;
    s.type = 'module';
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
    s.onload = () => s.remove();
  } catch {}
}

// Inject providers as early as possible
inject('src/inject/ethereum.js');
inject('src/inject/near.js');

// Bridge page <-> background
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.__cipherWallet__ !== true) return;

  const origin = location.origin;
  try {
    const result = await chrome.runtime.sendMessage({
      __cipherWallet__: true,
      origin,
      action: msg.action,
      payload: msg.payload || null,
    });
    window.postMessage({ __cipherWallet__: true, id: msg.id, ok: true, result }, '*');
  } catch (err: any) {
    window.postMessage({ __cipherWallet__: true, id: msg.id, ok: false, error: String(err?.message || err) }, '*');
  }
});
