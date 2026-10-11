import { env } from '../config/env.js';
import type { AttackCategory, FirewallDecision, EvidenceSnippet } from '../types/firewall.js';

export interface PolicyDecision {
  decision: FirewallDecision;
  explanation: string;
  remediation: string;
}

const REMEDIATION_MAP: Record<AttackCategory, string> = {
  instruction_override: 'Reject input. Sanitize instruction-altering directives and preserve foundational agent constraints.',
  role_change: 'Block prompt. Restrict persona switching and reject prompts instructing the model to bypass safety alignments.',
  secret_extraction: 'Block input. Enforce strict isolation on system prompt text and environment secrets.',
  tool_abuse: 'Halt execution immediately. Validate tool arguments against a strict allowlist; never run raw shell or SQL commands from prompts.',
  credential_theft: 'Block request and flag security audit. Prevent agent from requesting or reflecting authentication secrets.',
  context_poisoning: 'Reject manipulated input. Enforce clear token/role delimiters that cannot be spoofed by user text.',
  indirect_prompt_injection: 'Quarantine source document. Strip untrusted external instructions and treat document strictly as passive data.',
  encoded_instructions: 'Decode and inspect all encoded payload fragments. Reject inputs with high invisible/zero-width character counts.',
  multistep_jailbreak: 'Block input. Enforce continuous intent monitoring across multi-turn hypothetical framing.',
};

export function evaluatePolicy(
  riskScore: number,
  categories: AttackCategory[],
  evidence: EvidenceSnippet[],
  isBenignContext: boolean
): PolicyDecision {
  const blockThreshold = env.POLICY_BLOCK_THRESHOLD;
  const quarantineThreshold = env.POLICY_QUARANTINE_THRESHOLD;

  // 1. Critical severity triggers immediate BLOCK
  const hasCritical = evidence.some((e) => e.severity === 'CRITICAL');
  const hasCriticalToolOrOverride = evidence.some(
    (e) => (e.category === 'tool_abuse' || e.category === 'instruction_override' || e.category === 'credential_theft') &&
           e.severity === 'CRITICAL'
  );

  let decision: FirewallDecision = 'ALLOW';
  let explanation = 'No significant prompt injection or security threats detected.';

  if (hasCriticalToolOrOverride && !isBenignContext) {
    decision = 'BLOCK';
    explanation = `Blocked: Critical threat detected in categories [${categories.join(', ')}]. Direct execution risk to downstream system.`;
  } else if (riskScore >= blockThreshold) {
    decision = 'BLOCK';
    explanation = `Blocked: Risk score ${riskScore} exceeds strict block threshold (${blockThreshold}). Identified attack categories: ${categories.join(', ')}.`;
  } else if (riskScore >= quarantineThreshold) {
    decision = 'QUARANTINE';
    explanation = `Quarantined: Elevated risk score ${riskScore} meets quarantine threshold (${quarantineThreshold}). Suspicious patterns flagged for isolation.`;
  } else {
    decision = 'ALLOW';
    explanation = isBenignContext
      ? 'Allowed: Input verified as benign educational, security research, or general query.'
      : 'Allowed: Risk score within acceptable baseline tolerances.';
  }

  // 2. Generate consolidated remediation
  let remediation = 'Safe to pass to downstream AI model.';
  if (decision !== 'ALLOW') {
    if (categories.length > 0) {
      const remediations = Array.from(new Set(categories.map((c) => REMEDIATION_MAP[c] || ''))).filter(Boolean);
      remediation = remediations.join(' ');
    } else {
      remediation = 'Inspect input manually before permitting processing.';
    }
  }

  return {
    decision,
    explanation,
    remediation,
  };
}
