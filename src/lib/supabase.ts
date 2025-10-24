const SB_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SB_ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export type UserRecord = { account_addr: string; email?: string; created_at?: string };

export async function upsertUser(rec: UserRecord){
  try{
    if (!SB_URL || !SB_ANON) return { ok: false, skipped: true };
    const url = SB_URL.replace(/\/$/, '') + '/rest/v1/users?on_conflict=account_addr';
    const payload = { ...rec, created_at: rec.created_at || new Date().toISOString() };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(payload) });
    return { ok: res.ok, status: res.status };
  }catch(e){ return { ok: false, error: String(e) } }
}