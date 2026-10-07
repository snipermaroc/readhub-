import http from 'http';
import https from 'https';
import zlib from 'zlib';
import dns from 'dns';

export interface FetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  headers?: Record<string, string>;
}

/**
 * Checks if an IPv4 or IPv6 string falls into a private, loopback, link-local, multicast, or reserved range.
 */
export function isIpPrivateOrReserved(ip: string): boolean {
  if (!ip) return true;

  let cleanIp = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Handle IPv6-mapped IPv4 e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1
  if (cleanIp.startsWith('::ffff:')) {
    const rawv4 = cleanIp.substring(7);
    if (rawv4.includes('.')) {
      cleanIp = rawv4;
    } else {
      const hexParts = rawv4.split(':');
      if (hexParts.length === 2) {
        const n1 = parseInt(hexParts[0], 16);
        const n2 = parseInt(hexParts[1], 16);
        cleanIp = `${(n1 >> 8) & 255}.${n1 & 255}.${(n2 >> 8) & 255}.${n2 & 255}`;
      }
    }
  }

  // IPv4 Check
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, o1, o2, o3, o4] = ipv4Match.map(Number);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    if (
      o1 === 0 || // 0.0.0.0/8
      o1 === 10 || // 10.0.0.0/8 (RFC1918)
      o1 === 127 || // 127.0.0.0/8 (Loopback)
      (o1 === 100 && o2 >= 64 && o2 <= 127) || // 100.64.0.0/10 (Carrier-Grade NAT)
      (o1 === 169 && o2 === 254) || // 169.254.0.0/16 (Link-local & AWS/GCP Metadata)
      (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12 (RFC1918)
      (o1 === 192 && o2 === 168) || // 192.168.0.0/16 (RFC1918)
      (o1 === 192 && o2 === 0 && o3 === 0) || // 192.0.0.0/24
      (o1 === 192 && o2 === 0 && o3 === 2) || // 192.0.2.0/24
      (o1 === 198 && o2 === 51 && o3 === 100) || // 198.51.100.0/24
      (o1 === 203 && o2 === 0 && o3 === 113) || // 203.0.113.0/24
      o1 >= 224 // 224.0.0.0/4 (Multicast & Reserved)
    ) {
      return true;
    }
    return false;
  }

  // IPv6 Check
  if (
    cleanIp === '::' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('fe80:') || // Link-local
    cleanIp.startsWith('fc00:') || // Unique local
    cleanIp.startsWith('fd00:') || // Unique local
    cleanIp.startsWith('ff') || // Multicast
    cleanIp.startsWith('2001:db8:') || // Documentation
    cleanIp.startsWith('64:ff9b:') // NAT64
  ) {
    return true;
  }

  return false;
}

// Synchronous SSRF Protection: Syntactic & Static IP/Hostname Check
export function validateUrlSafety(inputUrl: string): { safe: boolean; error?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(inputUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: 'Only HTTP and HTTPS protocols are allowed.' };
    }

    // Unescape URL encoding in hostname and normalize
    let rawHost = parsed.hostname;
    try {
      rawHost = decodeURIComponent(rawHost);
    } catch {}

    const host = rawHost.toLowerCase().trim().replace(/^\[|\]$/g, '');

    // Check loopback, internal domains
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.lan') ||
      host.endsWith('.home') ||
      host.endsWith('.arpa')
    ) {
      return { safe: false, error: 'Access to localhost and internal network domains is forbidden.' };
    }

    // Cloud metadata endpoints (AWS, GCP, Azure, Oracle, DigitalOcean)
    if (
      host === '169.254.169.254' ||
      host === '169.254.170.2' ||
      host === '100.100.100.200' ||
      host === 'metadata.google.internal' ||
      host === 'metadata' ||
      host === 'instance-data' ||
      host.endsWith('.metadata.google.internal')
    ) {
      return { safe: false, error: 'Access to cloud metadata services is forbidden.' };
    }

    // Hex / Octal / Decimal IP check (e.g. 0x7f000001, 2130706433, 0177.0.0.1)
    if (/^(0x[0-9a-f]+|\d+)$/i.test(host) || /^(0[0-7]+\.|\b0x)/i.test(host)) {
      return { safe: false, error: 'Integer, octal, or hex encoded IP addresses are forbidden.' };
    }

    // Check direct IP address if host is an IP
    if (isIpPrivateOrReserved(host)) {
      return { safe: false, error: 'Access to private, loopback, link-local, or reserved IP addresses is forbidden.' };
    }

    return { safe: true, parsedUrl: parsed };
  } catch (err: any) {
    return { safe: false, error: `Invalid URL: ${err.message}` };
  }
}

// Asynchronous SSRF Protection: Includes DNS Resolution to prevent DNS Rebinding Attacks
export async function validateUrlSafetyAsync(inputUrl: string): Promise<{ safe: boolean; error?: string; parsedUrl?: URL }> {
  const staticCheck = validateUrlSafety(inputUrl);
  if (!staticCheck.safe || !staticCheck.parsedUrl) return staticCheck;

  let rawHost = staticCheck.parsedUrl.hostname;
  try {
    rawHost = decodeURIComponent(rawHost);
  } catch {}
  const hostname = rawHost.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // If the hostname is already an IP address, the static check already validated it
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6 = hostname.includes(':');
  if (isIpv4 || isIpv6) {
    return staticCheck;
  }

  try {
    // Resolve hostname to IP addresses via DNS
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: `Could not resolve domain name: ${hostname}` };
    }

    for (const addr of addresses) {
      if (isIpPrivateOrReserved(addr.address)) {
        return {
          safe: false,
          error: `Domain ${hostname} resolved to a forbidden private/reserved IP address (${addr.address}).`,
        };
      }
    }
  } catch (err: any) {
    return { safe: false, error: `DNS resolution failed for ${hostname}: ${err.message}` };
  }

  return staticCheck;
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<{ status: number; text: string; contentType: string }> {
  const safety = await validateUrlSafetyAsync(url);
  if (!safety.safe || !safety.parsedUrl) {
    throw new Error(safety.error || 'Blocked by security validation');
  }

  const timeoutMs = options.timeoutMs || 15000;
  const maxSizeBytes = options.maxSizeBytes || 15 * 1024 * 1024; // 15MB
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (MangaHub Importer/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        ...options.headers,
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxSizeBytes) {
      throw new Error(`Payload exceeds maximum size limit of ${maxSizeBytes / (1024 * 1024)}MB`);
    }

    // Check if gzipped content
    const isGzip =
      res.headers.get('content-encoding')?.includes('gzip') ||
      url.endsWith('.gz') ||
      (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);

    if (isGzip) {
      try {
        buffer = zlib.gunzipSync(buffer);
      } catch (err: any) {
        console.warn('Gzip decompression error, reading as raw text:', err.message);
      }
    }

    const text = buffer.toString('utf-8');
    return {
      status: res.status,
      text,
      contentType,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}
