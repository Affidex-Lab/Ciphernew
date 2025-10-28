import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStats, ensureAdminToken, listWallets, disableWallet, sweepWallet, proposeRecovery, executeRecovery, exportWalletsCsv, exportStatsCsv, type Wallet, type AdminAction } from './api';

export default function AdminDashboard() {
  const [tokenReady, setTokenReady] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [data, setData] = useState<{ total: number; items: Wallet[] } | null>(null);
  const [selected, setSelected] = useState<Wallet | null>(null);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [dest, setDest] = useState('');
  const [includeNative, setIncludeNative] = useState(true);
  const [tokenList, setTokenList] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [statsPeriod, setStatsPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');

  useEffect(() => { (async () => { await ensureAdminToken(); setTokenReady(true); })(); }, []);

  const maskedAdmin = useMemo(() => {
    const a = (sessionStorage.getItem('adminAddress') || '').trim();
    if (!a) return '';
    return a.slice(0, 6) + '…' + a.slice(-4);
  }, []);

  async function refresh() {
    const res = await listWallets({ status, q, page, pageSize });
    setData({ total: res.total, items: res.items });
  }

  async function refreshStats() {
    try { const s = await getStats(); setStats(s); } catch {}
  }

  useEffect(() => { if (tokenReady) { (async()=>{ await refresh(); await refreshStats(); })(); } }, [tokenReady, status, q, page, pageSize]);

  async function openDetails(w: Wallet) {
    setSelected(w);
    setDetailsOpen(true);
    try {
      const res = await fetch((sessionStorage.getItem('adminApiBase') || (window as any).__APP_CONFIG__?.adminApiBase || '') + '/admin/wallets/' + w.id, { headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('adminToken') || '') } });
      if (res.ok) {
        const j = await res.json();
        setActions(j.actions || []);
      }
    } catch {}
  }

  async function handleDisable(w: Wallet) {
    await disableWallet(w.id);
    await refresh();
  }

  async function handleSweep(w: Wallet) {
    setSelected(w);
    setDest(dest || w.owner_address || '');
    setSweepOpen(true);
  }

  async function submitSweep() {
    if (!selected) return;
    const tokens = tokenList.split(',').map(s => s.trim()).filter(Boolean);
    await sweepWallet(selected.id, { destinationAddress: dest.trim(), includeNative, tokenAddresses: tokens });
    setSweepOpen(false);
    await refresh();
  }

  async function handleProposeRecovery(w: Wallet) {
    const newOwner = window.prompt('New owner address (0x...)') || '';
    if (!newOwner) return;
    await proposeRecovery(w.id, newOwner);
    await refresh();
  }

  async function handleExecuteRecovery(w: Wallet) {
    await executeRecovery(w.id);
    await refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4">
        <div className="text-2xl font-semibold tracking-tight">Control Panel</div>
        <div className="text-xs text-muted-foreground">Private area. Not indexed.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card><CardHeader><CardTitle>Total wallets</CardTitle></CardHeader><CardContent className="text-3xl">{stats?.totalWallets ?? '—'}</CardContent></Card>
        <Card><CardHeader><CardTitle>Active</CardTitle></CardHeader><CardContent className="text-3xl">{stats?.totalActive ?? '—'}</CardContent></Card>
        <Card><CardHeader><CardTitle>Disabled</CardTitle></CardHeader><CardContent className="text-3xl">{stats?.totalDisabled ?? '—'}</CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>KPIs</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label>Period</Label>
              <Select value={statsPeriod} onValueChange={(v:any)=> setStatsPeriod(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={async()=>{ try{ const b = await exportStatsCsv(statsPeriod); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `stats-${statsPeriod}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}catch{}}}>Export CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Wallets</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status ?? 'any'} onValueChange={v => setStatus(v === 'any' ? undefined : v)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="swept">Swept</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Search</Label>
              <Input placeholder="owner or account" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Page size</Label>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={async()=>{ try{ const b = await exportWalletsCsv({ status, q }); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = 'wallets.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}catch{}}}>Export CSV</Button>
              <Button variant="outline" onClick={() => setPage(Math.max(1, page-1))}>Prev</Button>
              <Button variant="outline" onClick={() => setPage(page+1)}>Next</Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items || []).map(w => (
                <TableRow key={w.id}>
                  <TableCell className="text-xs">{new Date(w.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{w.type}</TableCell>
                  <TableCell className="text-xs">{w.chain_id ?? '—'}</TableCell>
                  <TableCell className="text-xs truncate max-w-[140px]">{w.owner_address || '—'}</TableCell>
                  <TableCell className="text-xs truncate max-w-[180px]">{w.account_address}</TableCell>
                  <TableCell className="text-xs">{w.status}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => openDetails(w)}>Details</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDisable(w)} disabled={w.status==='disabled'}>Disable</Button>
                      <Button size="sm" variant="outline" onClick={() => handleSweep(w)}>Sweep</Button>
                      <Button size="sm" variant="outline" onClick={() => handleProposeRecovery(w)}>Propose</Button>
                      <Button size="sm" variant="outline" onClick={() => handleExecuteRecovery(w)}>Execute</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Details</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-3">
            {selected && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Created</div><div>{new Date(selected.created_at).toLocaleString()}</div>
                <div className="text-muted-foreground">Type</div><div>{selected.type}</div>
                <div className="text-muted-foreground">Chain</div><div>{selected.chain_id ?? '—'}</div>
                <div className="text-muted-foreground">Owner</div><div className="truncate">{selected.owner_address || '—'}</div>
                <div className="text-muted-foreground">Account</div><div className="truncate">{selected.account_address}</div>
                <div className="text-muted-foreground">Status</div><div>{selected.status}</div>
              </div>
            )}
            <div className="pt-2">
              <div className="font-medium mb-1">Recent actions</div>
              <div className="space-y-1 text-xs">
                {actions.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
                    <div className="truncate">{a.action} · {a.status} {a.tx_hash ? '· ' + a.tx_hash.slice(0,8) + '…' : ''}</div>
                    <div className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {actions.length===0 && <div className="text-muted-foreground">No actions yet.</div>}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={sweepOpen} onOpenChange={setSweepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sweep funds</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Destination address</Label>
              <Input value={dest} onChange={e => setDest(e.target.value)} placeholder={maskedAdmin || '0x...'} />
            </div>
            <div className="space-y-1">
              <Label>Token addresses (comma separated)</Label>
              <Input value={tokenList} onChange={e => setTokenList(e.target.value)} placeholder="0xUSDC, 0xARB, ..." />
            </div>
            <div className="flex items-center gap-2">
              <input id="incl" type="checkbox" checked={includeNative} onChange={e => setIncludeNative(e.target.checked)} />
              <Label htmlFor="incl">Include native gas token</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSweepOpen(false)}>Cancel</Button>
              <Button onClick={submitSweep} disabled={!dest.trim()}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
