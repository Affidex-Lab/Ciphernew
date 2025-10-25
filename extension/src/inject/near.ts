// Page-injected NEAR provider shims: Wallet Selector-like minimal wallet and Sender-like window.near

type TxAction = any;

class CipherNearShim {
  _post(action: string, payload: any): Promise<any> {
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent) => {
        const d = ev.data;
        if (!d || d.__cipherWallet__ !== true || d.id !== id) return;
        window.removeEventListener('message', handler);
        if (d.ok) resolve(d.result); else reject(new Error(d.error || 'NEAR request failed'));
      };
      window.addEventListener('message', handler);
      window.postMessage({ __cipherWallet__: true, id, action, payload }, '*');
    });
  }

  async getAccounts(): Promise<{ accountId: string }[]> {
    const acc = await this._post('near:getAccounts', {});
    return acc ? [ { accountId: acc.accountId } ] : [];
  }

  async signIn(): Promise<{ accountId: string }>{
    const acc = await this._post('near:signIn', {});
    return { accountId: acc.accountId };
  }

  async signOut(): Promise<void>{
    await this._post('near:signOut', {});
  }

  async signAndSendTransactions(txs: { receiverId: string; actions: TxAction[] }[]){
    return await this._post('near:signAndSendTransactions', { txs });
  }
}

(function(){
  const shim = new CipherNearShim();
  (window as any).cipherNear = shim;
  (window as any).near = {
    isSignedIn: async () => (await shim.getAccounts()).length > 0,
    requestSignIn: async () => shim.signIn(),
    signOut: async () => shim.signOut(),
    account: async () => {
      const accs = await shim.getAccounts();
      const acc = accs[0];
      return acc ? { accountId: acc.accountId } : null;
    },
    signAndSendTransactions: async (txs: any[]) => shim.signAndSendTransactions(txs)
  };

  // Wallet Selector discovery (very minimal)
  const wsel = (window as any).nearWalletSelector || (window as any).walletSelector;
  if (wsel && typeof wsel.addWallet === 'function'){
    try{
      wsel.addWallet({
        id: 'cipher',
        type: 'injected',
        metadata: { name: 'Cipher Wallet — Seedless', description: 'Seedless NEAR wallet', iconUrl: '' },
        signIn: () => shim.signIn(),
        signOut: () => shim.signOut(),
        getAccounts: () => shim.getAccounts(),
        signAndSendTransactions: (params: any) => shim.signAndSendTransactions(params?.transactions || params)
      });
    } catch {}
  }
})();
