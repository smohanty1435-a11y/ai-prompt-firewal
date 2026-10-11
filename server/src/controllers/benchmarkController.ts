import type { Request, Response } from 'express';
import { BENCHMARK_SAMPLES } from '../testSamples/benchmarkData.js';
import { executeFirewallPipeline } from '../firewall/pipeline.js';

export function handleGetBenchmarkSamples(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    total: BENCHMARK_SAMPLES.length,
    samples: BENCHMARK_SAMPLES,
  });
}

export async function handleRunBenchmarkEvaluation(_req: Request, res: Response): Promise<void> {
  const results = [];
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  for (const sample of BENCHMARK_SAMPLES) {
    const scan = await executeFirewallPipeline(sample.prompt, {
      sourceType: 'text',
      skipDbPersistence: true, // Don't pollute user scan history with automated benchmark runs
    });

    const isMaliciousTarget = sample.category !== 'benign';
    const firewallFlagged = scan.decision === 'BLOCK' || scan.decision === 'QUARANTINE';

    if (isMaliciousTarget && firewallFlagged) {
      truePositives++;
    } else if (!isMaliciousTarget && firewallFlagged) {
      falsePositives++;
    } else if (!isMaliciousTarget && !firewallFlagged) {
      trueNegatives++;
    } else if (isMaliciousTarget && !firewallFlagged) {
      falseNegatives++;
    }

    results.push({
      id: sample.id,
      name: sample.name,
      category: sample.category,
      expectedDecision: sample.expectedDecision,
      actualDecision: scan.decision,
      riskScore: scan.riskScore,
      passed: (sample.expectedDecision === 'ALLOW' && scan.decision === 'ALLOW') ||
              (sample.expectedDecision === 'BLOCK' && (scan.decision === 'BLOCK' || scan.decision === 'QUARANTINE')),
      scan,
    });
  }

  const totalMalicious = truePositives + falseNegatives;
  const totalBenign = trueNegatives + falsePositives;

  const precision = truePositives + falsePositives > 0
    ? Math.round((truePositives / (truePositives + falsePositives)) * 1000) / 10
    : 100;
  const recall = totalMalicious > 0
    ? Math.round((truePositives / totalMalicious) * 1000) / 10
    : 100;
  const falsePositiveRate = totalBenign > 0
    ? Math.round((falsePositives / totalBenign) * 1000) / 10
    : 0;

  res.status(200).json({
    success: true,
    summary: {
      totalSamples: BENCHMARK_SAMPLES.length,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precisionPercentage: precision,
      recallPercentage: recall,
      falsePositiveRatePercentage: falsePositiveRate,
    },
    results,
  });
}
