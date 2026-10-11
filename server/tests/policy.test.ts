import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/firewall/policyEngine.js';
import { calculateRiskScore } from '../src/firewall/riskScorer.js';
import type { DeterministicResult, EvidenceSnippet } from '../src/types/firewall.js';

describe('Sentinel AI Risk Scoring & Policy Engine', () => {
  it('correctly assigns BLOCK when risk score is high (>= 75)', () => {
    const decision = evaluatePolicy(85, ['instruction_override'], [], false);
    expect(decision.decision).toBe('BLOCK');
  });

  it('correctly assigns QUARANTINE when risk is medium (40-74)', () => {
    const decision = evaluatePolicy(50, ['indirect_prompt_injection'], [], false);
    expect(decision.decision).toBe('QUARANTINE');
  });

  it('correctly assigns ALLOW when risk is low (< 40)', () => {
    const decision = evaluatePolicy(15, [], [], false);
    expect(decision.decision).toBe('ALLOW');
  });

  it('triggers immediate BLOCK on critical tool abuse even if score is moderate', () => {
    const criticalEvidence: EvidenceSnippet[] = [
      {
        category: 'tool_abuse',
        severity: 'CRITICAL',
        matchedPattern: 'rm -rf',
        snippet: 'execute bash: rm -rf /',
        explanation: 'Destructive shell command injection',
      },
    ];
    const decision = evaluatePolicy(55, ['tool_abuse'], criticalEvidence, false);
    expect(decision.decision).toBe('BLOCK');
  });

  it('calculates risk score and applies benign adjustment', () => {
    const mockDet: DeterministicResult = {
      detectedCategories: ['instruction_override'],
      rawScore: 20,
      evidence: [],
      ruleMatches: [],
      isBenignContext: true,
      hasObfuscation: false,
    };
    const scored = calculateRiskScore(mockDet);
    expect(scored.finalRiskScore).toBeLessThanOrEqual(25);
    expect(scored.confidenceScore).toBeGreaterThanOrEqual(70);
  });
});
