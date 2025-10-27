import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import { requireAdmin } from './middleware/auth';
import { adminRateLimiter, webhookRateLimiter } from './middleware/ratelimit';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

const allowedOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

app.use((req, _res, next) => { logger.debug({ method: req.method, path: req.path }, 'req'); next(); });

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/admin', adminRateLimiter(), requireAdmin, adminRoutes);
app.use('/webhooks', webhookRateLimiter(), webhookRoutes);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  logger.info({ port }, '[server] listening');
});
