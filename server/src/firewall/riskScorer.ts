import type { DeterministicResult, LLMClassificationResult } from '../types/firewall.js';

export interface ScoredRisk {
  finalRiskScore: number; // 0 to 100
  confidenceScore: number; // 0 to 100 (calibrated)
  scoringBreakdown: {
    deterministicContribution: number;
    llmContribution: number;
    obfuscationPenalty: number;
    benignAdjustment: number;
    explanation: string;
  };
}

/**
 * Documented Risk Scoring Engine:
 * - Blends deterministic pattern weights (65%) with LLM semantic reasoning (35%).
 * - Calibrates confidence from agreement between deterministic signals and LLM.
 * - Caps risk at 25 for verified benign educational context.
 * - Adds a +15 penalty for intentional obfuscation (zero-width characters, encoded payloads).
 */
export function calculateRiskScore(
  deterministic: DeterministicResult,
  llm?: { result: LLMClassificationResult; fallbackUsed: boolean }
): ScoredRisk {
  const detScore = deterministic.rawScore;
  let obfuscationPenalty = 0;
  let benignAdjustment = 0;

  let compositeScore = detScore;
  let detContribution = detScore;
  let llmContribution = 0;
  let confidenceScore = 75; // Baseline deterministic confidence

  if (llm && !llm.fallbackUsed) {
    const llmScore = llm.result.riskScore;
    detContribution = Math.round(detScore * 0.65);
    llmContribution = Math.round(llmScore * 0.35);
    compositeScore = detContribution + llmContribution;

    // Calibrate confidence from consensus
    const detSaidMalicious = detScore >= 40;
    const llmSaidMalicious = llm.result.isMalicious || llmScore >= 40;

    if (detSaidMalicious === llmSaidMalicious) {
      // Strong consensus
      confidenceScore = Math.min(95, Math.round(70 + (llm.result.confidence * 25)));
    } else {
      // Divergence / Disagreement between rule matches and semantic classifier
      confidenceScore = 60;
    }
  } else {
    // LLM was not used or failed
    confidenceScore = deterministic.detectedCategories.length > 0 ? 82 : 75;
  }

  // Obfuscation penalty
  if (deterministic.hasObfuscation && deterministic.detectedCategories.length > 0) {
    obfuscationPenalty = 15;
    compositeScore += obfuscationPenalty;
  }

  // Benign educational context adjustment
  if (deterministic.isBenignContext) {
    const preAdjustment = compositeScore;
    // Cap at 25 unless critical tool abuse is present
    const hasCriticalToolAbuse = deterministic.evidence.some(
      (e) => e.category === 'tool_abuse' && e.severity === 'CRITICAL'
    );
    if (!hasCriticalToolAbuse) {
      compositeScore = Math.min(25, Math.round(compositeScore * 0.3));
      benignAdjustment = compositeScore - preAdjustment;
    }
  }

  const finalRiskScore = Math.min(100, Math.max(0, compositeScore));

  let explanation = `Risk score ${finalRiskScore}/100 derived from deterministic rule severity (${detContribution} pts)`;
  if (llm && !llm.fallbackUsed) {
    explanation += ` and LLM classifier assessment (${llmContribution} pts)`;
  }
  if (obfuscationPenalty > 0) {
    explanation += `, with +${obfuscationPenalty} penalty for detected evasion obfuscation`;
  }
  if (benignAdjustment < 0) {
    explanation += `, with educational/defensive context calibration (${benignAdjustment} pts)`;
  }

  return {
    finalRiskScore,
    confidenceScore,
    scoringBreakdown: {
      deterministicContribution: detContribution,
      llmContribution,
      obfuscationPenalty,
      benignAdjustment,
      explanation,
    },
  };
}
