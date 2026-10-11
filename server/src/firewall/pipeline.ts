import { randomUUID } from 'node:crypto';
import { runDeterministicChecks } from './deterministic.js';
import { classifyWithLLM } from './llmClassifier.js';
import { calculateRiskScore } from './riskScorer.js';
import { evaluatePolicy } from './policyEngine.js';
import { ScanModel } from '../models/Scan.js';
import { AuditEventModel } from '../models/AuditEvent.js';
import type { AttackCategory, FirewallDecision, ScanResult, SourceType } from '../types/firewall.js';

export interface PipelineOptions {
  sourceType: SourceType;
  sourceMetadata?: {
    filename?: string;
    fileSizeBytes?: number;
    url?: string;
    domain?: string;
    charCount?: number;
  };
  clientIp?: string;
  skipDbPersistence?: boolean;
}

export async function executeFirewallPipeline(
  rawInput: string,
  options: PipelineOptions
): Promise<ScanResult> {
  const startTime = Date.now();
  const scanId = `scn_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  // 1. Deterministic Security Heuristics
  const deterministicResult = runDeterministicChecks(rawInput);
  const detectionMethods: ScanResult['detectionMethods'] = ['deterministic_rules'];

  if (deterministicResult.hasObfuscation) {
    detectionMethods.push('obfuscation_analysis');
  }

  // 2. LLM-Assisted Classification
  // Trigger LLM if score is borderline, or if direct prompt input needs deep semantic verification
  let llmResult: Awaited<ReturnType<typeof classifyWithLLM>> | undefined;
  
  // If input is non-trivial and not already conclusively CRITICAL (> 85)
  if (rawInput.length > 5 && rawInput.length < 50000) {
    try {
      llmResult = await classifyWithLLM(rawInput, options.sourceType);
      if (!llmResult.fallbackUsed) {
        detectionMethods.push('llm_classifier');
      }
    } catch (err) {
      console.warn(`[Pipeline] LLM classification caught unhandled error: ${(err as Error).message}`);
    }
  }

  // 3. Risk Scoring Engine
  const scoredRisk = calculateRiskScore(deterministicResult, llmResult);

  // 4. Attack Categories Consolidation
  const categorySet = new Set<AttackCategory>(deterministicResult.detectedCategories);
  if (llmResult && !llmResult.fallbackUsed) {
    for (const cat of llmResult.result.categories) {
      categorySet.add(cat);
    }
  }
  const attackCategories = Array.from(categorySet);

  // 5. Policy Decision
  const policy = evaluatePolicy(
    scoredRisk.finalRiskScore,
    attackCategories,
    deterministicResult.evidence,
    deterministicResult.isBenignContext
  );

  const processingDurationMs = Date.now() - startTime;
  const timestamp = new Date().toISOString();

  // 6. Formulate Structured Scan Result
  const result: ScanResult = {
    scanId,
    sourceType: options.sourceType,
    sourceMetadata: {
      ...options.sourceMetadata,
      charCount: rawInput.length,
    },
    decision: policy.decision,
    riskScore: scoredRisk.finalRiskScore,
    confidenceScore: scoredRisk.confidenceScore,
    attackCategories,
    explanation: policy.explanation,
    remediation: policy.remediation,
    evidence: deterministicResult.evidence,
    detectionMethods,
    processingDurationMs,
    timestamp,
  };

  // 7. Audit Event and Database Persistence (non-blocking for performance)
  if (!options.skipDbPersistence) {
    persistScanAndAudit(result, options.clientIp).catch((dbErr) => {
      console.error(`[Pipeline] Persistence error for scan ${scanId}:`, (dbErr as Error).message);
    });
  }

  return result;
}

async function persistScanAndAudit(result: ScanResult, clientIp?: string): Promise<void> {
  try {
    // 1. Save Scan Document
    await ScanModel.create({
      scanId: result.scanId,
      sourceType: result.sourceType,
      sourceMetadata: result.sourceMetadata,
      decision: result.decision,
      riskScore: result.riskScore,
      confidenceScore: result.confidenceScore,
      attackCategories: result.attackCategories,
      detectionMethods: result.detectionMethods,
      explanation: result.explanation,
      remediation: result.remediation,
      evidence: result.evidence,
      processingDurationMs: result.processingDurationMs,
    });

    // 2. Save Audit Event Document
    const actionTakenMap: Record<FirewallDecision, 'PASSED' | 'REJECTED' | 'SANITIZED' | 'FLAGGED_FOR_REVIEW'> = {
      ALLOW: 'PASSED',
      BLOCK: 'REJECTED',
      QUARANTINE: 'SANITIZED',
      REVIEW: 'FLAGGED_FOR_REVIEW',
    };

    const eventId = `aud_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await AuditEventModel.create({
      eventId,
      scanId: result.scanId,
      sourceType: result.sourceType,
      decision: result.decision,
      riskScore: result.riskScore,
      attackCategories: result.attackCategories,
      actionTaken: actionTakenMap[result.decision],
      reason: result.explanation,
      clientIp,
    });
  } catch (err) {
    // Catch gracefully to never break pipeline response flow
    console.warn(`[Pipeline] Failed to persist scan or audit record: ${(err as Error).message}`);
  }
}
