import { Request, Response, NextFunction } from 'express';

function makeBucket(limitPerMin: number) {
  const buckets = new Map<string, { tokens: number; ts: number }>();
  const refillMs = 60_000;
  return function middleware(keyFn: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = keyFn(req) || 'anon';
      const now = Date.now();
      const b = buckets.get(key) || { tokens: limitPerMin, ts: now };
      const elapsed = now - b.ts;
      if (elapsed >= refillMs) {
        b.tokens = limitPerMin;
        b.ts = now;
      }
      if (b.tokens <= 0) {
        res.status(429).json({ error: 'rate_limited' });
        return;
      }
      b.tokens -= 1;
      buckets.set(key, b);
      next();
    };
  };
}

export function adminRateLimiter() {
  const limit = Number(process.env.ADMIN_RATE_LIMIT || 120);
  const mw = makeBucket(limit);
  return mw((req) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'ip';
    const auth = (req.headers['authorization'] || '') as string;
    return `admin:${ip}:${auth.slice(0, 16)}`;
  });
}

export function webhookRateLimiter() {
  const limit = Number(process.env.WEBHOOK_RATE_LIMIT || 60);
  const mw = makeBucket(limit);
  return mw((req) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'ip';
    return `webhook:${ip}`;
  });
}
