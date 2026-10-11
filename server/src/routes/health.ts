import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Sentinel AI Prompt Injection Firewall',
    environment: env.NODE_ENV,
    dependencies: {
      database: {
        status: dbStatus.connected ? 'connected' : 'disconnected',
        mode: dbStatus.inMemory ? 'in-memory-standalone' : 'external-mongodb',
      },
      llmClassifier: {
        configured: Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim() !== '' && !env.OPENROUTER_API_KEY.includes('your_openrouter')),
        model: env.OPENROUTER_MODEL,
      },
      ssrfGuard: {
        status: 'active',
        maxDownloadBytes: env.MAX_URL_DOWNLOAD_BYTES,
      },
    },
  });
});
