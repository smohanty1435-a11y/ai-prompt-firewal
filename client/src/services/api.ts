import axios from 'axios';
import type {
  ScanResult,
  DashboardMetrics,
  BenchmarkSample,
  BenchmarkEvaluationResponse,
  HealthStatus,
} from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

function formatAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const errorData = err.response?.data as { error?: string; message?: string; code?: string } | undefined;
    const message = errorData?.error || errorData?.message || err.message || 'API request failed';
    throw new ApiError(message, errorData?.code, err.response?.status);
  }
  throw new ApiError((err as Error).message || 'Unexpected network error');
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await apiClient.get<HealthStatus>('/health');
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async scanText(
    text: string,
    sourceType: 'text' | 'pasted' = 'text'
  ): Promise<{ success: boolean; scan: ScanResult }> {
    try {
      const response = await apiClient.post<{ success: boolean; scan: ScanResult }>('/scans', {
        text,
        sourceType,
      });
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async scanUrl(
    url: string
  ): Promise<{ success: boolean; scan: ScanResult; ingestion?: any }> {
    try {
      const response = await apiClient.post<{ success: boolean; scan: ScanResult; ingestion?: any }>(
        '/scans',
        { url }
      );
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async scanPdf(file: File): Promise<{ success: boolean; scan: ScanResult }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{ success: boolean; scan: ScanResult }>(
        '/scans',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async getScan(id: string): Promise<{ success: boolean; scan: ScanResult }> {
    try {
      const response = await apiClient.get<{ success: boolean; scan: ScanResult }>(`/scans/${id}`);
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async getScansHistory(params?: {
    page?: number;
    limit?: number;
    decision?: string;
    sourceType?: string;
    category?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    scans: ScanResult[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        scans: ScanResult[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/scans', {
        params,
      });
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async getDashboardSummary(): Promise<{ success: boolean; metrics: DashboardMetrics }> {
    try {
      const response = await apiClient.get<{ success: boolean; metrics: DashboardMetrics }>(
        '/dashboard/summary'
      );
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async sendProtectedChat(message: string): Promise<{
    success: boolean;
    blocked: boolean;
    quarantined?: boolean;
    message?: string;
    reply?: string;
    scan: ScanResult;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        blocked: boolean;
        quarantined?: boolean;
        message?: string;
        reply?: string;
        scan: ScanResult;
      }>('/protected-chat', { message });
      return response.data;
    } catch (err) {
      // 403 Forbidden means request was deliberately blocked by the Sentinel AI firewall
      if (axios.isAxiosError(err) && err.response?.status === 403 && err.response.data) {
        return err.response.data as {
          success: boolean;
          blocked: boolean;
          quarantined?: boolean;
          message?: string;
          reply?: string;
          scan: ScanResult;
        };
      }
      return formatAxiosError(err);
    }
  },

  async getBenchmarkSamples(): Promise<{ success: boolean; total: number; samples: BenchmarkSample[] }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        total: number;
        samples: BenchmarkSample[];
      }>('/benchmark/samples');
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },

  async runBenchmarkEvaluation(): Promise<BenchmarkEvaluationResponse> {
    try {
      const response = await apiClient.post<BenchmarkEvaluationResponse>('/benchmark/run');
      return response.data;
    } catch (err) {
      return formatAxiosError(err);
    }
  },
};
