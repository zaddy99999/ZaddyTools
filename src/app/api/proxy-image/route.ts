import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

// Allowlist of trusted image domains
const ALLOWED_DOMAINS = [
  'pbs.twimg.com',
  'abs.twimg.com',
  'i.imgur.com',
  'cdn.discordapp.com',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'nftstorage.link',
  'arweave.net',
  'opensea.io',
  'lh3.googleusercontent.com',
  'storage.googleapis.com',
];

// Private/internal IP ranges to block (SSRF prevention)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // 127.0.0.0/8 (loopback)
  /^10\./,                           // 10.0.0.0/8 (private)
  /^192\.168\./,                     // 192.168.0.0/16 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 (private)
  /^169\.254\./,                     // 169.254.0.0/16 (link-local)
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  /^192\.0\.0\./,                    // 192.0.0.0/24 (IETF Protocol Assignments)
  /^192\.0\.2\./,                    // 192.0.2.0/24 (TEST-NET-1)
  /^198\.51\.100\./,                 // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\./,                  // 203.0.113.0/24 (TEST-NET-3)
  /^224\./,                          // 224.0.0.0/4 (multicast)
  /^240\./,                          // 240.0.0.0/4 (reserved)
  /^255\./,                          // 255.0.0.0/8 (broadcast)
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::1',
  '::',
  '[::1]',
  '[::0]',
];

function isPrivateIP(hostname: string): boolean {
  // Check for blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
    return true;
  }

  // Check for IPv6 localhost variations
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const ipv6 = hostname.slice(1, -1).toLowerCase();
    if (ipv6 === '::1' || ipv6 === '::' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) {
      return true;
    }
  }

  // Check for private IPv4 ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

function validateImageUrl(urlString: string): { valid: boolean; error?: string } {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow http and https protocols
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block private/internal IPs
  if (isPrivateIP(hostname)) {
    return { valid: false, error: 'Access to internal/private addresses is not allowed' };
  }

  // Check domain allowlist
  const isAllowed = ALLOWED_DOMAINS.some(domain => {
    // Exact match or subdomain match
    return hostname === domain || hostname.endsWith('.' + domain);
  });

  if (!isAllowed) {
    return { valid: false, error: 'Domain not in allowlist' };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute (Resource protection)
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  // Validate URL for SSRF prevention
  const validation = validateImageUrl(url);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 403 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZaddyTools/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Check Content-Length header before downloading
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    if (contentLength > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image too large', maxSize: '10MB' },
        { status: 413 }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Fallback check (in case Content-Length was missing or wrong)
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image too large', maxSize: '10MB' },
        { status: 413 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
