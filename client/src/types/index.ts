export type AttackCategory =
  | 'instruction_override'
  | 'role_change'
  | 'secret_extraction'
  | 'tool_abuse'
  | 'credential_theft'
  | 'context_poisoning'
  | 'indirect_prompt_injection'
  | 'encoded_instructions'
  | 'multistep_jailbreak';

export type SourceType = 'text' | 'pasted' | 'pdf' | 'url';

export type FirewallDecision = 'ALLOW' | 'BLOCK' | 'QUARANTINE' | 'REVIEW';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EvidenceSnippet {
  category: AttackCategory;
  severity: SeverityLevel;
  matchedPattern: string;
  snippet: string;
  explanation: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ScanResult {
  scanId: string;
  sourceType: SourceType;
  sourceMetadata?: {
    filename?: string;
    fileSizeBytes?: number;
    url?: string;
    domain?: string;
    charCount?: number;
  };
  decision: FirewallDecision;
  riskScore: number;
  confidenceScore: number;
  attackCategories: AttackCategory[];
  explanation: string;
  remediation: string;
  evidence: EvidenceSnippet[];
  detectionMethods: ('deterministic_rules' | 'obfuscation_analysis' | 'llm_classifier' | 'ssrf_guard')[];
  processingDurationMs: number;
  timestamp: string;
}

export interface DashboardMetrics {
  totalScans: number;
  blockedCount: number;
  allowedCount: number;
  quarantinedCount: number;
  averageRiskScore: number;
  blockRatePercentage: number;
  categoryDistribution: Record<AttackCategory, number>;
  sourceDistribution: Record<SourceType, number>;
  recentScans: ScanResult[];
}

export interface BenchmarkSample {
  id: string;
  name: string;
  category: AttackCategory | 'benign';
  expectedDecision: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  description: string;
  prompt: string;
}

export interface BenchmarkSummary {
  totalSamples: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precisionPercentage: number;
  recallPercentage: number;
  falsePositiveRatePercentage: number;
}

export interface BenchmarkItemResult {
  id: string;
  name: string;
  category: AttackCategory | 'benign';
  expectedDecision: string;
  actualDecision: FirewallDecision;
  riskScore: number;
  passed: boolean;
  scan: ScanResult;
}

export interface BenchmarkEvaluationResponse {
  success: boolean;
  summary: BenchmarkSummary;
  results: BenchmarkItemResult[];
}

export interface HealthStatus {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  service: string;
  environment: string;
  dependencies: {
    database: { status: string; mode: string };
    llmClassifier: { configured: boolean; model: string };
    ssrfGuard: { status: string };
  };
}
