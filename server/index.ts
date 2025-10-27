import express from 'express';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(helmet({ hsts: false }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/admin', adminRoutes);
app.use('/webhooks', webhookRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`[server] Listening on :${port}`);
});
