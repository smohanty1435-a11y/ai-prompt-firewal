import type { Request, Response } from 'express';
import { ScanModel } from '../models/Scan.js';
import type { AttackCategory, SourceType } from '../types/firewall.js';

export async function handleGetDashboardSummary(_req: Request, res: Response): Promise<void> {
  try {
    const totalScans = await ScanModel.countDocuments();

    if (totalScans === 0) {
      res.status(200).json({
        success: true,
        metrics: {
          totalScans: 0,
          blockedCount: 0,
          allowedCount: 0,
          quarantinedCount: 0,
          averageRiskScore: 0,
          blockRatePercentage: 0,
          categoryDistribution: {
            instruction_override: 0,
            role_change: 0,
            secret_extraction: 0,
            tool_abuse: 0,
            credential_theft: 0,
            context_poisoning: 0,
            indirect_prompt_injection: 0,
            encoded_instructions: 0,
            multistep_jailbreak: 0,
          },
          sourceDistribution: {
            text: 0,
            pasted: 0,
            pdf: 0,
            url: 0,
          },
          recentScans: [],
        },
      });
      return;
    }

    // Aggregations on actual persisted scans
    const [decisionCounts, avgScoreResult, recentScans, categoryCounts, sourceCounts] = await Promise.all([
      ScanModel.aggregate([
        { $group: { _id: '$decision', count: { $sum: 1 } } },
      ]),
      ScanModel.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$riskScore' } } },
      ]),
      ScanModel.find().sort({ createdAt: -1 }).limit(8).lean(),
      ScanModel.aggregate([
        { $unwind: '$attackCategories' },
        { $group: { _id: '$attackCategories', count: { $sum: 1 } } },
      ]),
      ScanModel.aggregate([
        { $group: { _id: '$sourceType', count: { $sum: 1 } } },
      ]),
    ]);

    const decisionsMap: Record<string, number> = {};
    for (const d of decisionCounts) {
      decisionsMap[d._id] = d.count;
    }

    const blockedCount = decisionsMap['BLOCK'] || 0;
    const allowedCount = decisionsMap['ALLOW'] || 0;
    const quarantinedCount = decisionsMap['QUARANTINE'] || 0;
    const averageRiskScore = avgScoreResult[0]?.avgScore ? Math.round(avgScoreResult[0].avgScore * 10) / 10 : 0;
    const blockRatePercentage = totalScans > 0 ? Math.round((blockedCount / totalScans) * 1000) / 10 : 0;

    const categoryDistribution: Record<AttackCategory, number> = {
      instruction_override: 0,
      role_change: 0,
      secret_extraction: 0,
      tool_abuse: 0,
      credential_theft: 0,
      context_poisoning: 0,
      indirect_prompt_injection: 0,
      encoded_instructions: 0,
      multistep_jailbreak: 0,
    };
    for (const c of categoryCounts) {
      if (c._id in categoryDistribution) {
        categoryDistribution[c._id as AttackCategory] = c.count;
      }
    }

    const sourceDistribution: Record<SourceType, number> = {
      text: 0,
      pasted: 0,
      pdf: 0,
      url: 0,
    };
    for (const s of sourceCounts) {
      if (s._id in sourceDistribution) {
        sourceDistribution[s._id as SourceType] = s.count;
      }
    }

    res.status(200).json({
      success: true,
      metrics: {
        totalScans,
        blockedCount,
        allowedCount,
        quarantinedCount,
        averageRiskScore,
        blockRatePercentage,
        categoryDistribution,
        sourceDistribution,
        recentScans,
      },
    });
  } catch (err: unknown) {
    console.error('[DashboardController] Error generating summary:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to derive metrics: ' + (err as Error).message,
    });
  }
}
