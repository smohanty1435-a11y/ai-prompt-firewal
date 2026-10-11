import { describe, it, expect } from 'vitest';
import { validatePublicIp, SecuritySSRFError } from '../src/ingestion/urlIngester.js';

describe('Sentinel AI SSRF Protection Layer', () => {
  it('blocks loopback IPv4 (127.0.0.1)', () => {
    expect(() => validatePublicIp('127.0.0.1')).toThrow(SecuritySSRFError);
  });

  it('blocks loopback IPv6 (::1)', () => {
    expect(() => validatePublicIp('::1')).toThrow(SecuritySSRFError);
  });

  it('blocks private class A (10.0.0.5)', () => {
    expect(() => validatePublicIp('10.0.0.5')).toThrow(SecuritySSRFError);
  });

  it('blocks private class B (172.16.0.1)', () => {
    expect(() => validatePublicIp('172.16.0.1')).toThrow(SecuritySSRFError);
  });

  it('blocks private class C (192.168.1.1)', () => {
    expect(() => validatePublicIp('192.168.1.1')).toThrow(SecuritySSRFError);
  });

  it('blocks link-local / AWS metadata IP (169.254.169.254)', () => {
    expect(() => validatePublicIp('169.254.169.254')).toThrow(SecuritySSRFError);
  });

  it('allows valid public routable IP (8.8.8.8)', () => {
    expect(() => validatePublicIp('8.8.8.8')).not.toThrow();
  });

  it('allows valid public routable IP (1.1.1.1)', () => {
    expect(() => validatePublicIp('1.1.1.1')).not.toThrow();
  });
});
