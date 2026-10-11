import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

async function bootstrap(): Promise<void> {
  console.log('----------------------------------------------------');
  console.log('   SENTINEL AI - PROMPT INJECTION FIREWALL SERVER    ');
  console.log('----------------------------------------------------');

  try {
    await connectDatabase();
  } catch (dbErr) {
    console.warn(`[Bootstrap] Non-fatal DB initialization notice: ${(dbErr as Error).message}`);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[Sentinel AI] Firewall Gateway running on port ${env.PORT}`);
    console.log(`[Sentinel AI] Health endpoint: http://localhost:${env.PORT}/api/health`);
    console.log(`[Sentinel AI] Active Model: ${env.OPENROUTER_MODEL}`);
    console.log(`[Sentinel AI] Policy Thresholds: Block >= ${env.POLICY_BLOCK_THRESHOLD}, Quarantine >= ${env.POLICY_QUARANTINE_THRESHOLD}`);
    console.log('----------------------------------------------------');
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Sentinel AI] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Sentinel AI] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal startup failure:', err);
  process.exit(1);
});
