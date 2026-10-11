import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';

export const app = express();

// Security and middleware setup
app.use(
  cors({
    origin: '*', // For development and hackathon local testing
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes under /api
app.use('/api', apiRouter);

// Centralized 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized Error handler (no internal stack traces exposed to client)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorObj = err as Error;
  console.error('[Sentinel AI Server Error]:', errorObj);
  res.status(500).json({
    success: false,
    error: errorObj.message || 'An unexpected internal server error occurred',
    code: 'INTERNAL_SERVER_ERROR',
  });
});
