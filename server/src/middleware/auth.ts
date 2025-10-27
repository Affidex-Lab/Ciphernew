import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization'] || '';
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token !== process.env.ADMIN_API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
