import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/sentinel-ai'),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('google/gemini-2.5-flash'),
  POLICY_BLOCK_THRESHOLD: z.coerce.number().min(0).max(100).default(75),
  POLICY_QUARANTINE_THRESHOLD: z.coerce.number().min(0).max(100).default(40),
  FAIL_CLOSED_ON_ERROR: z.coerce.boolean().default(true),
  MAX_URL_DOWNLOAD_BYTES: z.coerce.number().default(1048576), // 1MB
  URL_FETCH_TIMEOUT_MS: z.coerce.number().default(8000), // 8s
  MAX_PDF_SIZE_BYTES: z.coerce.number().default(5242880), // 5MB
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
