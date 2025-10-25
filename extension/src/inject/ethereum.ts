// Page-injected EIP-1193 provider that proxies to the extension via window.postMessage

class CipherEthereumProvider {
  isCipher = true;
  isMetaMask = false;
  selectedAddress: string | null = null;
  chainId: string | null = null;
  _listeners: Record<string, Function[]> = {};

  request<T = any>(args: { method: string; params?: any[] }): Promise<T> {
    return this._rpc(args.method, args.params || []);
  }

  on(event: string, cb: Function){
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(cb);
  }

  emit(event: string, ...args: any[]){
    for(const cb of this._listeners[event] || []) try{ cb(...args); }catch{}
  }

  async _rpc(method: string, params: any[]): Promise<any> {
    const id = Math.random().toString(36).slice(2);
    const payload = { method, params };
    return new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent) => {
        const d = ev.data;
        if (!d || d.__cipherWallet__ !== true || d.id !== id) return;
        window.removeEventListener('message', handler);
        if (d.ok) {
          if (method === 'eth_requestAccounts' && Array.isArray(d.result) && d.result[0]){
            this.selectedAddress = d.result[0];
            this.emit('accountsChanged', d.result);
          }
          resolve(d.result);
        } else {
          reject(new Error(d.error || 'Request failed'));
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ __cipherWallet__: true, id, action: 'ethereum:rpc', payload }, '*');
    });
  }
}

(function(){
  const provider = new CipherEthereumProvider();
  (window as any).ethereum = provider;
})();
