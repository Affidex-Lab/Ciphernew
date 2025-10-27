import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool';

const r = Router();

const limiter = rateLimit({ windowMs: 60_000, limit: 30 });
r.use('/wallet-created', limiter);

r.post('/wallet-created', async (req, res) => {
  const { type, chainId, ownerAddress, accountAddress } = req.body || {};
  if (!type || !accountAddress) return res.status(400).json({ error: 'type and accountAddress required' });
  const t = String(type);
  const c = chainId ? parseInt(String(chainId)) : null;
  const owner = ownerAddress ? String(ownerAddress) : null;
  const acc = String(accountAddress);
  const now = new Date();
  await query(`INSERT INTO wallets(type, chain_id, owner_address, account_address, status, last_seen_at)
    VALUES($1,$2,$3,$4,'active',$5)
    ON CONFLICT(account_address) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`, [t, c, owner, acc, now]);
  res.json({ ok: true });
});

export default r;
