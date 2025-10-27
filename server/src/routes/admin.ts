import { Router } from 'express';
import { query, withClient } from '../db/pool';
import { tryExecuteRecovery, tryFreezeWallet, tryProposeRecovery, trySweep } from '../services/onchain';

const DEFAULT_TOKENS_42161 = [
  '0xaf88d065e77c8C2239327C5EDb3A432268e5831', // USDC
  '0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9', // USDT
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
];

const r = Router();

r.get('/wallets', async (req, res) => {
  const { status, q, page = '1', pageSize = '20' } = req.query as any;
  const p = Math.max(1, parseInt(String(page)) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(String(pageSize)) || 20));
  const off = (p - 1) * ps;
  const where: string[] = [];
  const vals: any[] = [];
  if (status && typeof status === 'string') { vals.push(status); where.push(`status = $${vals.length}`); }
  if (q && typeof q === 'string') {
    vals.push(`%${q}%`);
    const idx = vals.length;
    where.push(`(owner_address ILIKE $${idx} OR account_address ILIKE $${idx})`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const list = await query(`SELECT * FROM wallets ${whereSql} ORDER BY created_at DESC LIMIT ${ps} OFFSET ${off}`, vals);
  const total = await query(`SELECT count(*)::int AS n FROM wallets ${whereSql}`, vals);
  res.json({ page: p, pageSize: ps, total: total.rows[0]?.n || 0, items: list.rows });
});

r.get('/wallets.csv', async (req, res) => {
  const { status, q } = req.query as any;
  const where: string[] = [];
  const vals: any[] = [];
  if (status && typeof status === 'string') { vals.push(status); where.push(`status = $${vals.length}`); }
  if (q && typeof q === 'string') { vals.push(`%${q}%`); const idx = vals.length; where.push(`(owner_address ILIKE $${idx} OR account_address ILIKE $${idx})`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const list = await query(`SELECT created_at, type, chain_id, owner_address, account_address, status FROM wallets ${whereSql} ORDER BY created_at DESC`, vals);
  const rows = list.rows as any[];
  const header = 'created_at,type,chain_id,owner_address,account_address,status';
  const lines = rows.map(r => [r.created_at.toISOString?.() || r.created_at, r.type, r.chain_id ?? '', r.owner_address ?? '', r.account_address, r.status].join(','));
  const csv = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

r.get('/wallets/:id', async (req, res) => {
  const id = req.params.id;
  const w = await query('SELECT * FROM wallets WHERE id = $1', [id]);
  if (!w.rows[0]) return res.status(404).json({ error: 'Not found' });
  const actions = await query('SELECT * FROM admin_actions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50', [id]);
  res.json({ wallet: w.rows[0], actions: actions.rows });
});

r.post('/wallets/:id/disable', async (req, res) => {
  const id = req.params.id;
  const w = await query('SELECT * FROM wallets WHERE id = $1', [id]);
  const wallet = w.rows[0];
  if (!wallet) return res.status(404).json({ error: 'Not found' });
  await withClient(async (client) => {
    await client.query('BEGIN');
    await client.query('UPDATE wallets SET status = $1 WHERE id = $2', ['disabled', id]);
    const onchain = await tryFreezeWallet(wallet.account_address);
    const ins = await client.query('INSERT INTO admin_actions(wallet_id, action, status, tx_hash, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, 'disable', onchain.status, onchain.txHash || null, { reason: onchain.reason || null }]);
    await client.query('COMMIT');
    res.json({ walletId: id, action: ins.rows[0] });
  });
});

r.post('/wallets/:id/sweep', async (req, res) => {
  const id = req.params.id;
  const { destinationAddress, includeNative = true, tokenAddresses } = req.body || {};
  const w = await query('SELECT * FROM wallets WHERE id = $1', [id]);
  const wallet = w.rows[0];
  if (!wallet) return res.status(404).json({ error: 'Not found' });
  if (!destinationAddress) return res.status(400).json({ error: 'destinationAddress required' });
  const tokens = Array.isArray(tokenAddresses) && tokenAddresses.length ? tokenAddresses : (wallet.chain_id === 42161 ? DEFAULT_TOKENS_42161 : []);
  const out = await trySweep(wallet.account_address, destinationAddress, !!includeNative, tokens);
  const act = await query('INSERT INTO admin_actions(wallet_id, action, status, destination_address, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, 'sweep', out.status, destinationAddress, { results: out.results }]);
  res.json({ walletId: id, action: act.rows[0] });
});

r.post('/wallets/:id/propose-recovery', async (req, res) => {
  const id = req.params.id;
  const { newOwnerAddress } = req.body || {};
  if (!newOwnerAddress) return res.status(400).json({ error: 'newOwnerAddress required' });
  const w = await query('SELECT * FROM wallets WHERE id = $1', [id]);
  const wallet = w.rows[0];
  if (!wallet) return res.status(404).json({ error: 'Not found' });
  const out = await tryProposeRecovery(wallet.account_address, newOwnerAddress);
  const act = await query('INSERT INTO admin_actions(wallet_id, action, status, metadata, tx_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, 'propose_recovery', out.status, { reason: out.reason || null, newOwnerAddress }, out.txHash || null]);
  res.json({ walletId: id, action: act.rows[0] });
});

r.post('/wallets/:id/execute-recovery', async (req, res) => {
  const id = req.params.id;
  const w = await query('SELECT * FROM wallets WHERE id = $1', [id]);
  const wallet = w.rows[0];
  if (!wallet) return res.status(404).json({ error: 'Not found' });
  const out = await tryExecuteRecovery(wallet.account_address);
  const act = await query('INSERT INTO admin_actions(wallet_id, action, status, metadata, tx_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, 'execute_recovery', out.status, { reason: out.reason || null }, out.txHash || null]);
  res.json({ walletId: id, action: act.rows[0] });
});

r.get('/stats', async (_req, res) => {
  const totals = await query(`SELECT
    (SELECT count(*)::int FROM wallets) as totalWallets,
    (SELECT count(*)::int FROM wallets WHERE type='cipher') as totalCipherAccounts,
    (SELECT count(*)::int FROM wallets WHERE type='disposable') as totalDisposable,
    (SELECT count(*)::int FROM wallets WHERE type='near') as totalNear,
    (SELECT count(*)::int FROM wallets WHERE status='active') as totalActive,
    (SELECT count(*)::int FROM wallets WHERE status='disabled') as totalDisabled`);
  const daily = await query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC LIMIT 30`);
  const weekly = await query(`SELECT to_char(date_trunc('week', created_at), 'IYYY-IW') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC LIMIT 26`);
  const monthly = await query(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC LIMIT 24`);
  res.json({ ...totals.rows[0], dailyCounts: daily.rows, weeklyCounts: weekly.rows, monthlyCounts: monthly.rows });
});

r.get('/stats.csv', async (req, res) => {
  const { period = 'daily' } = req.query as any;
  let sql: string;
  if (period === 'weekly') sql = `SELECT to_char(date_trunc('week', created_at), 'IYYY-IW') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC`;
  else if (period === 'monthly') sql = `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC`;
  else sql = `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM wallets GROUP BY 1 ORDER BY 1 DESC`;
  const rows = (await query(sql)).rows as any[];
  const header = 'date,count';
  const lines = rows.map(r => `${r.date},${r.count}`);
  const csv = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

export default r;
