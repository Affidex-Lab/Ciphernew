import { Pool } from 'pg';
import pino from 'pino';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  logger.warn('DATABASE_URL not set. DB operations will fail until configured.');
}

export const pool = new Pool({
  connectionString,
  ssl: (process.env.PGSSL?.toLowerCase() === 'true') ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  return pool.query(text, params);
}

export async function withClient<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}
