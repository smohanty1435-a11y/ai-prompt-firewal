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

export interface DeterministicResult {
  detectedCategories: AttackCategory[];
  rawScore: number;
  evidence: EvidenceSnippet[];
  ruleMatches: string[];
  isBenignContext: boolean;
  benignExplanation?: string;
  hasObfuscation: boolean;
}

export interface LLMClassificationResult {
  isMalicious: boolean;
  confidence: number; // 0 to 1
  categories: AttackCategory[];
  reasoning: string;
  riskScore: number; // 0 to 100
  suggestedDecision: FirewallDecision;
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
  riskScore: number; // 0 to 100
  confidenceScore: number; // 0 to 100
  attackCategories: AttackCategory[];
  explanation: string;
  remediation: string;
  evidence: EvidenceSnippet[];
  detectionMethods: ('deterministic_rules' | 'obfuscation_analysis' | 'llm_classifier' | 'ssrf_guard')[];
  processingDurationMs: number;
  timestamp: string;
}

export interface AuditEventRecord {
  eventId: string;
  scanId: string;
  sourceType: SourceType;
  decision: FirewallDecision;
  riskScore: number;
  attackCategories: AttackCategory[];
  actionTaken: 'PASSED' | 'REJECTED' | 'SANITIZED' | 'FLAGGED_FOR_REVIEW';
  clientIp?: string;
  timestamp: string;
  reason: string;
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
