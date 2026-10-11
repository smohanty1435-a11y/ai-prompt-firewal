import dns from 'node:dns/promises';
import * as cheerio from 'cheerio';
import ipaddr from 'ipaddr.js';
import { env } from '../config/env.js';

export interface UrlIngestionResult {
  url: string;
  finalUrl: string;
  resolvedIp: string;
  title: string;
  extractedText: string;
  charCount: number;
  extractedComments: string[];
  hiddenDirectives: string[];
}

export class SecuritySSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecuritySSRFError';
  }
}

/**
 * Validates that an IP address is a safe, publicly routable address.
 * Rejects RFC1918, loopback, link-local, carrier-grade NAT, multicast, and unique-local IPv6.
 */
export function validatePublicIp(ipString: string): void {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;

  try {
    addr = ipaddr.parse(ipString);
  } catch {
    throw new SecuritySSRFError(`Invalid IP address resolved: ${ipString}`);
  }

  // If IPv4-mapped IPv6 address (::ffff:127.0.0.1), unmap it
  if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }

  const range = addr.range();
  const FORBIDDEN_RANGES = new Set([
    'loopback',
    'private',
    'linkLocal',
    'carrierGradeNat',
    'uniqueLocal',
    'unspecified',
    'multicast',
    'broadcast',
    'rfc6598',
  ]);

  if (FORBIDDEN_RANGES.has(range)) {
    throw new SecuritySSRFError(`Destination IP ${ipString} is in forbidden private/reserved range: ${range}`);
  }
}

export async function ingestUrl(rawUrl: string, maxRedirects: number = 3): Promise<UrlIngestionResult> {
  let currentUrl = rawUrl.trim();
  let redirectCount = 0;
  const maxDownloadBytes = env.MAX_URL_DOWNLOAD_BYTES;
  const timeoutMs = env.URL_FETCH_TIMEOUT_MS;

  while (redirectCount <= maxRedirects) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new SecuritySSRFError(`Malformed URL: ${currentUrl}`);
    }

    // 1. Enforce scheme: only http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new SecuritySSRFError(`Forbidden protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
    }

    // 2. Enforce port: default ports or explicit 80/443 only
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
    if (port !== 80 && port !== 443) {
      throw new SecuritySSRFError(`Forbidden destination port ${port}. Only standard ports (80, 443) are allowed.`);
    }

    // 3. Reject obvious local hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      throw new SecuritySSRFError(`Access to localhost or internal network target is blocked: ${hostname}`);
    }

    // 4. Resolve DNS and inspect resolved IPs against SSRF
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new SecuritySSRFError(`Could not resolve host ${hostname}`);
    }

    for (const record of addresses) {
      validatePublicIp(record.address);
    }

    const primaryIp = addresses[0].address;

    // 5. Fetch content with redirect: 'manual' to validate each hop
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SentinelAI-Security-Scanner/1.0',
          Accept: 'text/html, text/plain;q=0.9',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      throw new Error(`Failed to fetch URL: ${(fetchErr as Error).message}`);
    }
    clearTimeout(timeout);

    // 6. Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SecuritySSRFError(`Redirect HTTP ${response.status} missing Location header`);
      }
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new SecuritySSRFError(`Exceeded maximum allowed redirects (${maxRedirects})`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue; // Re-validate the new URL
    }

    if (!response.ok) {
      throw new Error(`Target returned HTTP error ${response.status} ${response.statusText}`);
    }

    // 7. Verify Content-Type
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
      throw new Error(`Unsupported content type "${contentType}". Only HTML and plain text documents are permitted.`);
    }

    // 8. Enforce size limit
    const bodyText = await response.text();
    if (Buffer.byteLength(bodyText, 'utf-8') > maxDownloadBytes) {
      throw new Error(`Downloaded content exceeded maximum size limit of ${maxDownloadBytes / 1024 / 1024}MB`);
    }

    // 9. Safe DOM / HTML parsing using Cheerio
    const $ = cheerio.load(bodyText);

    // Extract HTML comments to detect hidden indirect prompt injection payloads
    const extractedComments: string[] = [];
    $('*')
      .contents()
      .each((_, el) => {
        if (el.type === 'comment' && el.data) {
          const comment = el.data.trim();
          if (comment.length > 5 && (comment.toLowerCase().includes('ai') || comment.toLowerCase().includes('ignore') || comment.toLowerCase().includes('instruction'))) {
            extractedComments.push(comment.slice(0, 300));
          }
        }
      });

    // Strip script, style, and executable tags
    $('script, style, iframe, object, embed, noscript, svg').remove();

    // Search for hidden inline CSS text (display:none, visibility:hidden, opacity:0, font-size:0)
    const hiddenDirectives: string[] = [];
    $('[style]').each((_, el) => {
      const style = ($(el).attr('style') || '').toLowerCase();
      if (
        style.includes('display:none') ||
        style.includes('visibility:hidden') ||
        style.includes('font-size:0') ||
        style.includes('color:white') ||
        style.includes('color:#fff') ||
        style.includes('opacity:0')
      ) {
        const text = $(el).text().trim();
        if (text.length > 5) {
          hiddenDirectives.push(text.slice(0, 300));
        }
      }
    });

    const title = $('title').text().trim() || parsed.hostname;
    const bodyContent = $('body').text().replace(/\s+/g, ' ').trim() || bodyText;

    // Combine comments + hidden directives + body for full firewall inspection
    const fullInspectionText = [
      title ? `Title: ${title}` : '',
      extractedComments.length > 0 ? `[HTML Comments Detected]: ${extractedComments.join(' | ')}` : '',
      hiddenDirectives.length > 0 ? `[Hidden Element Text]: ${hiddenDirectives.join(' | ')}` : '',
      `Content: ${bodyContent}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      url: rawUrl,
      finalUrl: currentUrl,
      resolvedIp: primaryIp,
      title,
      extractedText: fullInspectionText,
      charCount: fullInspectionText.length,
      extractedComments,
      hiddenDirectives,
    };
  }

  throw new SecuritySSRFError(`Exceeded maximum redirect limit (${maxRedirects})`);
}
