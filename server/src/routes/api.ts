import { Router } from 'express';
import multer from 'multer';
import { handleScanInput, handleGetScanById, handleGetScansList } from '../controllers/scanController.js';
import { handleProtectedChat } from '../controllers/chatController.js';
import { handleGetDashboardSummary } from '../controllers/dashboardController.js';
import { handleGetBenchmarkSamples, handleRunBenchmarkEvaluation } from '../controllers/benchmarkController.js';
import { healthRouter } from './health.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

export const apiRouter = Router();

// Health check
apiRouter.use(healthRouter);

// Firewall Scan routes
apiRouter.post('/scans', upload.single('file'), handleScanInput);
apiRouter.get('/scans/:id', handleGetScanById);
apiRouter.get('/scans', handleGetScansList);

// Protected AI Chat route
apiRouter.post('/protected-chat', handleProtectedChat);

// Dashboard metrics route
apiRouter.get('/dashboard/summary', handleGetDashboardSummary);

// Benchmark Lab routes
apiRouter.get('/benchmark/samples', handleGetBenchmarkSamples);
apiRouter.post('/benchmark/run', handleRunBenchmarkEvaluation);
