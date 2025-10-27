import fs from 'fs';
import path from 'path';
import { withClient, logger } from './pool';

async function ensureMigrationsTable() {
  await withClient(async (client) => {
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (id serial primary key, name text unique, run_at timestamptz default now())`);
  });
}

async function alreadyRun(name: string): Promise<boolean> {
  return await withClient(async (client) => {
    const res = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [name]);
    return res.rowCount > 0;
  });
}

async function markRun(name: string) {
  await withClient(async (client) => {
    await client.query('INSERT INTO _migrations(name) VALUES($1) ON CONFLICT (name) DO NOTHING', [name]);
  });
}

async function run() {
  await ensureMigrationsTable();
  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const done = await alreadyRun(f);
    if (done) { logger.info({ migration: f }, 'Skipping'); continue; }
    logger.info({ migration: f }, 'Running');
    await withClient(async (client) => { await client.query(sql); });
    await markRun(f);
  }
  logger.info('Migrations complete');
}

run().catch((e) => { console.error(e); process.exit(1); });
