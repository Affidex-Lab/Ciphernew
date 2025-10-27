export type Wallet = {
  id: string;
  created_at: string;
  type: 'cipher' | 'disposable' | 'near';
  chain_id: number | null;
  owner_address: string | null;
  account_address: string;
  status: 'active' | 'disabled' | 'swept';
};

export type AdminAction = {
  id: string;
  wallet_id: string;
  action: 'disable' | 'sweep' | 'propose_recovery' | 'execute_recovery';
  destination_address?: string | null;
  tx_hash?: string | null;
  status: 'queued' | 'sent' | 'confirmed' | 'failed' | 'skipped';
  metadata: any;
  created_at: string;
  updated_at: string;
};

function baseUrl(): string {
  const fromCfg = (window as any).__APP_CONFIG__?.adminApiBase;
  try {
    const meta = (window as any).__APP_CONFIG__;
    if (meta && meta.adminApiBase) return meta.adminApiBase;
  } catch {}
  const ls = sessionStorage.getItem('adminApiBase') || '';
  const env = (import.meta as any).env?.VITE_ADMIN_API_BASE || '';
  return fromCfg || ls || env || '';
}

function token(): string {
  return sessionStorage.getItem('adminToken') || '';
}

async function getConfigJson() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      (window as any).__APP_CONFIG__ = cfg;
    }
  } catch {}
}

export async function ensureAdminToken() {
  await getConfigJson();
  let t = token();
  while (!t) {
    t = window.prompt('Enter admin token') || '';
    if (!t) break;
    sessionStorage.setItem('adminToken', t);
  }
  return t;
}

async function request(path: string, init?: RequestInit) {
  const url = baseUrl().replace(/\/$/, '') + path;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token(),
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401) {
    sessionStorage.removeItem('adminToken');
    await ensureAdminToken();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listWallets(params: { status?: string; q?: string; page?: number; pageSize?: number }) {
  const u = new URL(baseUrl().replace(/\/$/, '') + '/admin/wallets');
  if (params.status) u.searchParams.set('status', params.status);
  if (params.q) u.searchParams.set('q', params.q);
  if (params.page) u.searchParams.set('page', String(params.page));
  if (params.pageSize) u.searchParams.set('pageSize', String(params.pageSize));
  const res = await fetch(u.toString(), { headers: { Authorization: 'Bearer ' + token() } });
  if (res.status === 401) { sessionStorage.removeItem('adminToken'); await ensureAdminToken(); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getWallet(id: string) {
  return request('/admin/wallets/' + id);
}

export async function disableWallet(id: string) {
  return request('/admin/wallets/' + id + '/disable', { method: 'POST' });
}

export async function sweepWallet(id: string, body: { destinationAddress?: string; includeNative?: boolean; tokenAddresses?: string[] }) {
  return request('/admin/wallets/' + id + '/sweep', { method: 'POST', body: JSON.stringify(body || {}) });
}

export async function proposeRecovery(id: string, newOwnerAddress: string) {
  return request('/admin/wallets/' + id + '/propose-recovery', { method: 'POST', body: JSON.stringify({ newOwnerAddress }) });
}

export async function executeRecovery(id: string) {
  return request('/admin/wallets/' + id + '/execute-recovery', { method: 'POST' });
}

export async function getStats() {
  return request('/admin/stats');
}
