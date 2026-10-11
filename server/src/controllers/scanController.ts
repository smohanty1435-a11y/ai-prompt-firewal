import type { Request, Response } from 'express';
import { z } from 'zod';
import { executeFirewallPipeline } from '../firewall/pipeline.js';
import { ingestUrl, SecuritySSRFError } from '../ingestion/urlIngester.js';
import { ingestPdf, SecurityPdfError } from '../ingestion/pdfIngester.js';
import { ScanModel } from '../models/Scan.js';
import type { SourceType } from '../types/firewall.js';

const scanTextSchema = z.object({
  text: z.string().min(1, 'Input text cannot be empty').max(100000, 'Input exceeds maximum allowed length'),
  sourceType: z.enum(['text', 'pasted']).default('text'),
});

const scanUrlSchema = z.object({
  url: z.string().url('Invalid URL format').max(2000),
});

export async function handleScanInput(req: Request, res: Response): Promise<void> {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. PDF Upload Case (multipart/form-data via multer)
    if (req.file) {
      try {
        const pdfData = await ingestPdf(req.file.buffer, req.file.originalname);
        const result = await executeFirewallPipeline(pdfData.extractedText, {
          sourceType: 'pdf',
          sourceMetadata: {
            filename: pdfData.filename,
            fileSizeBytes: pdfData.fileSizeBytes,
            charCount: pdfData.charCount,
          },
          clientIp,
        });

        res.status(200).json({ success: true, scan: result });
        return;
      } catch (pdfErr) {
        if (pdfErr instanceof SecurityPdfError) {
          res.status(400).json({ success: false, error: pdfErr.message, code: 'PDF_SECURITY_REJECTION' });
          return;
        }
        res.status(400).json({ success: false, error: (pdfErr as Error).message });
        return;
      }
    }

    // 2. URL Scan Case
    if (req.body?.url) {
      const parsedUrl = scanUrlSchema.safeParse(req.body);
      if (!parsedUrl.success) {
        res.status(400).json({ success: false, error: parsedUrl.error.issues[0]?.message || 'Invalid URL' });
        return;
      }

      try {
        const urlData = await ingestUrl(parsedUrl.data.url);
        const result = await executeFirewallPipeline(urlData.extractedText, {
          sourceType: 'url',
          sourceMetadata: {
            url: urlData.url,
            domain: new URL(urlData.finalUrl).hostname,
            charCount: urlData.charCount,
          },
          clientIp,
        });

        res.status(200).json({
          success: true,
          scan: result,
          ingestion: {
            title: urlData.title,
            resolvedIp: urlData.resolvedIp,
            extractedComments: urlData.extractedComments,
            hiddenDirectives: urlData.hiddenDirectives,
          },
        });
        return;
      } catch (urlErr) {
        if (urlErr instanceof SecuritySSRFError) {
          res.status(403).json({
            success: false,
            error: urlErr.message,
            code: 'SSRF_PROTECTION_BLOCKED',
          });
          return;
        }
        res.status(400).json({ success: false, error: (urlErr as Error).message });
        return;
      }
    }

    // 3. Text / Pasted Content Case
    const parsedText = scanTextSchema.safeParse(req.body);
    if (!parsedText.success) {
      res.status(400).json({
        success: false,
        error: parsedText.error.issues[0]?.message || 'Invalid request body. Expected "text" or "url".',
      });
      return;
    }

    const result = await executeFirewallPipeline(parsedText.data.text, {
      sourceType: parsedText.data.sourceType as SourceType,
      clientIp,
    });

    res.status(200).json({ success: true, scan: result });
  } catch (err: unknown) {
    console.error('[ScanController] Unexpected scan error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal firewall scan failure. Fail-safe triggered.',
      code: 'FIREWALL_EXECUTION_ERROR',
    });
  }
}

export async function handleGetScanById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ success: false, error: 'Scan ID is required' });
    return;
  }

  try {
    const scan = await ScanModel.findOne({ scanId: id }).lean();
    if (!scan) {
      res.status(404).json({ success: false, error: `Scan not found for ID: ${id}` });
      return;
    }

    res.status(200).json({ success: true, scan });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function handleGetScansList(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const decision = req.query.decision as string | undefined;
  const sourceType = req.query.sourceType as string | undefined;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  const query: Record<string, unknown> = {};

  if (decision && ['ALLOW', 'BLOCK', 'QUARANTINE', 'REVIEW'].includes(decision)) {
    query.decision = decision;
  }
  if (sourceType && ['text', 'pasted', 'pdf', 'url'].includes(sourceType)) {
    query.sourceType = sourceType;
  }
  if (category) {
    query.attackCategories = category;
  }
  if (search) {
    query.$or = [
      { scanId: { $regex: search, $options: 'i' } },
      { explanation: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const total = await ScanModel.countDocuments(query);
    const scans = await ScanModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
