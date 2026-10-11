import { env } from '../config/env.js';

export interface PdfIngestionResult {
  filename: string;
  fileSizeBytes: number;
  extractedText: string;
  charCount: number;
  pageCount: number;
}

export class SecurityPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityPdfError';
  }
}

/**
 * Validates PDF magic header %PDF-
 */
export function validatePdfMagicBytes(buffer: Buffer): void {
  if (buffer.length < 5) {
    throw new SecurityPdfError('File is too small to be a valid PDF document');
  }

  const magic = buffer.subarray(0, 5).toString('ascii');
  if (magic !== '%PDF-') {
    throw new SecurityPdfError('Invalid file signature: Missing %PDF- magic bytes. Only valid PDF files are permitted.');
  }
}

/**
 * Extracts printable ASCII / UTF-8 text streams from raw PDF buffer as a secondary inspection pass
 */
function extractRawPdfTextStreams(buffer: Buffer): string {
  // Decode as utf-8 to preserve multibyte Unicode (including zero-width obfuscation)
  const content = buffer.toString('utf-8');
  const textChunks: string[] = [];

  // 1. Standard text string operators: (Text) Tj, (Text) ', (Text) "
  const textPattern = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(content)) !== null) {
    if (match[1] && match[1].length > 0) {
      const clean = match[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ');
      textChunks.push(clean);
    }
    if (textChunks.length > 1000) break;
  }

  // 2. TJ array operators: [(Part 1) -10 (Part 2)] TJ
  const tjPattern = /\[([^\]]+)\]\s*TJ/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjPattern.exec(content)) !== null) {
    const inner = tjMatch[1];
    const strPattern = /\(([^)]+)\)/g;
    let strMatch: RegExpExecArray | null;
    while ((strMatch = strPattern.exec(inner)) !== null) {
      if (strMatch[1]) {
        textChunks.push(strMatch[1].replace(/\\([()\\])/g, '$1'));
      }
    }
    if (textChunks.length > 1000) break;
  }

  return textChunks.join(' ');
}

export async function ingestPdf(
  buffer: Buffer,
  filename: string = 'uploaded.pdf'
): Promise<PdfIngestionResult> {
  const maxSize = env.MAX_PDF_SIZE_BYTES;

  // 1. Enforce size limit
  if (buffer.length > maxSize) {
    throw new SecurityPdfError(`PDF file size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${maxSize / 1024 / 1024}MB`);
  }

  // 2. Validate magic signature
  validatePdfMagicBytes(buffer);

  let extractedText = '';
  let pageCount = 1;

  try {
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;

    if (PDFParse) {
      const parser = new PDFParse({ data: buffer });
      if (typeof (parser as any).load === 'function') {
        await (parser as any).load();
      }
      const textResult = (await parser.getText()) as unknown;
      if (typeof textResult === 'string') {
        extractedText = textResult.trim();
      } else if (textResult && typeof (textResult as any).text === 'string') {
        extractedText = String((textResult as any).text).trim();
      } else {
        extractedText = (typeof textResult === 'object' ? JSON.stringify(textResult) : String(textResult)).trim();
      }
      const info = (await parser.getInfo?.().catch(() => null)) as unknown as Record<string, unknown> | null;
      if (info && info.pages) {
        pageCount = Number(info.pages) || 1;
      } else if (textResult && typeof (textResult as any).total === 'number') {
        pageCount = (textResult as any).total;
      }
    }
  } catch (parseErr: unknown) {
    const err = parseErr as Error;
    if (err.name === 'PasswordException' || err.message.toLowerCase().includes('password')) {
      throw new SecurityPdfError('Encrypted or password-protected PDFs are not supported for security inspection.');
    }
    // If standard parser failed on unconventional PDF format, attempt stream recovery
    console.warn(`[PDF Ingester] Primary PDF parser error: ${err.message}. Running text stream fallback.`);
    const rawStreams = extractRawPdfTextStreams(buffer);
    if (rawStreams.length > 10) {
      extractedText = rawStreams;
    } else {
      throw new SecurityPdfError(`Malformed or unparseable PDF file: ${err.message}`);
    }
  }

  // Preserve zero-width steganography if present in raw PDF text streams
  const rawStreamContent = extractRawPdfTextStreams(buffer);
  if (/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/.test(rawStreamContent)) {
    extractedText = rawStreamContent;
  }

  if (!extractedText || extractedText.trim().length === 0) {
    // Attempt fallback stream extraction if parser yielded blank (e.g., scanned or special stream PDF)
    extractedText = rawStreamContent || 'No readable text content found in PDF document.';
  }

  return {
    filename,
    fileSizeBytes: buffer.length,
    extractedText: extractedText.trim(),
    charCount: extractedText.length,
    pageCount,
  };
}
