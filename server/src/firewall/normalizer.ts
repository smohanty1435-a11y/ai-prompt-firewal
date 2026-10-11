export interface NormalizationResult {
  original: string;
  normalized: string;
  strippedZeroWidthCount: number;
  hasObfuscation: boolean;
  decodedCandidates: {
    encoding: 'base64' | 'hex' | 'rot13';
    encodedSnippet: string;
    decodedText: string;
  }[];
}

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g;
const BASE64_CANDIDATE_REGEX = /\b[A-Za-z0-9+/]{20,}={0,2}\b/g;
const HEX_CANDIDATE_REGEX = /\b(?:[0-9a-fA-F]{2}){12,}\b/g;

export function normalizeInput(input: string): NormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      original: '',
      normalized: '',
      strippedZeroWidthCount: 0,
      hasObfuscation: false,
      decodedCandidates: [],
    };
  }

  // 1. Count zero-width characters
  const zeroWidthMatches = input.match(ZERO_WIDTH_REGEX);
  const zeroWidthCount = zeroWidthMatches ? zeroWidthMatches.length : 0;

  // 2. Normalize Unicode to NFKC, strip invisible/zero-width chars, and map typographic quotes
  const nfkc = input.normalize('NFKC');
  const normalized = nfkc
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');

  const decodedCandidates: NormalizationResult['decodedCandidates'] = [];

  // 3. Scan for Base64 payloads (e.g. "SWdub3JlIGFsbCBwcmV2aW91cyBpbnN0cnVjdGlvbnM=")
  const base64Matches = input.match(BASE64_CANDIDATE_REGEX);
  if (base64Matches) {
    for (const b64 of base64Matches.slice(0, 5)) { // limit to avoid DoS
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        // Check if decoded string contains printable ASCII text
        if (/^[\x20-\x7E\s]{10,}$/.test(decoded)) {
          decodedCandidates.push({
            encoding: 'base64',
            encodedSnippet: b64.length > 40 ? b64.substring(0, 40) + '...' : b64,
            decodedText: decoded,
          });
        }
      } catch {
        // Ignore invalid base64 decodes
      }
    }
  }

  // 4. Scan for Hex payloads
  const hexMatches = input.match(HEX_CANDIDATE_REGEX);
  if (hexMatches) {
    for (const hex of hexMatches.slice(0, 5)) {
      try {
        const decoded = Buffer.from(hex, 'hex').toString('utf-8');
        if (/^[\x20-\x7E\s]{10,}$/.test(decoded)) {
          decodedCandidates.push({
            encoding: 'hex',
            encodedSnippet: hex.length > 40 ? hex.substring(0, 40) + '...' : hex,
            decodedText: decoded,
          });
        }
      } catch {
        // Ignore invalid hex
      }
    }
  }

  const hasObfuscation = zeroWidthCount >= 3 || decodedCandidates.length > 0;

  return {
    original: input,
    normalized,
    strippedZeroWidthCount: zeroWidthCount,
    hasObfuscation,
    decodedCandidates,
  };
}
