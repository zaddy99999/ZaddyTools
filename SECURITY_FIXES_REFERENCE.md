# Security Fixes - Code Reference

This document provides code examples for fixing the identified security vulnerabilities.

---

## 1. Timing-Safe Authentication (MEDIUM Priority)

**Replace in:** `/src/app/api/admin/suggestions/route.ts`

```typescript
import crypto from 'crypto';

// OLD (VULNERABLE):
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('x-admin-key');
  return authHeader === ADMIN_KEY;  // NOT timing-safe!
}

// NEW (SECURE):
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('x-admin-key') || '';
  const expected = process.env.ADMIN_KEY || '';

  if (!expected) {
    console.warn('ADMIN_KEY not configured');
    return false;
  }

  try {
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected)
    );
  } catch {
    // Buffers are different lengths - not equal
    return false;
  }
}
```

---

## 2. URL Validation Helper

**Create new file:** `/src/lib/validation.ts`

```typescript
/**
 * Validate and extract Twitter handle from URL
 */
export function extractTwitterHandle(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Only allow x.com and twitter.com
    if (!['x.com', 'twitter.com'].includes(urlObj.hostname)) {
      return null;
    }

    // Extract pathname and remove leading/trailing slashes
    const pathname = urlObj.pathname.replace(/^\/|\/$/g, '');

    // Validate Twitter handle format (1-15 alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(pathname)) {
      return null;
    }

    return pathname;
  } catch (error) {
    return null;
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const urlObj = new URL(urlString);
    return ['http', 'https'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate RSS feed URL (prevent SSRF)
 */
export function isValidRssFeedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Only allow https for RSS feeds
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Block private IP ranges
    const hostname = urlObj.hostname;
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^0\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,  // Link-local
      /^fc00:/,        // ULA IPv6
      /^fe80:/,        // Link-local IPv6
    ];

    if (privatePatterns.some(pattern => pattern.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input) return '';

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"']/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    }[char] || char));
}
```

**Usage in tier-maker route:**

```typescript
// OLD (VULNERABLE):
if (suggestion.giphyUrl?.includes('x.com/') || suggestion.giphyUrl?.includes('twitter.com/')) {
  handle = suggestion.giphyUrl.split('/').pop() || handle;
}

// NEW (SECURE):
import { extractTwitterHandle } from '@/lib/validation';

if (suggestion.giphyUrl) {
  const extractedHandle = extractTwitterHandle(suggestion.giphyUrl);
  if (extractedHandle) {
    handle = extractedHandle;
  } else {
    return NextResponse.json(
      { error: 'Invalid Twitter URL format' },
      { status: 400 }
    );
  }
}
```

---

## 3. Rate Limiting Middleware

**Create new file:** `/src/lib/rateLimit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Use Vercel KV or Redis for distributed rate limiting in production
// This is an in-memory fallback for development
const store = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimitMiddleware(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const now = Date.now();
    const record = store.get(ip);

    // Create or reset record
    if (!record || now > record.resetTime) {
      store.set(ip, { count: 1, resetTime: now + config.windowMs });
      return null; // Allow request
    }

    // Check limit
    if (record.count >= config.maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((record.resetTime - now) / 1000))
          }
        }
      );
    }

    // Increment counter
    record.count++;
    return null; // Allow request
  };
}

// Recommended limits
export const RATE_LIMITS = {
  // Public endpoints
  public: { maxRequests: 60, windowMs: 60 * 1000 }, // 60/min
  // Write operations
  write: { maxRequests: 10, windowMs: 60 * 1000 }, // 10/min
  // Admin operations
  admin: { maxRequests: 30, windowMs: 60 * 1000 }, // 30/min
  // CRON jobs
  cron: { maxRequests: 5, windowMs: 60 * 1000 }, // 5/min
};
```

**Usage in API route:**

```typescript
import { createRateLimiter, RATE_LIMITS } from '@/lib/rateLimit';

const rateLimiter = createRateLimiter(RATE_LIMITS.write);

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = rateLimiter(request as any);
  if (rateLimitResponse) return rateLimitResponse;

  // ... rest of handler
}
```

---

## 4. Proper CRON Authorization

**Replace in:** `/src/app/api/run/route.ts`

```typescript
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// OLD (VULNERABLE):
async function handleRun(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '') || null;
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  if (!vercelCronHeader && !validateCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}

// NEW (SECURE):
async function handleRun(request: NextRequest) {
  // Option 1: Verify Vercel signature (RECOMMENDED)
  if (isVercelCronRequest(request)) {
    return handleCronJob(request);
  }

  // Option 2: Accept bearer token with timing-safe comparison
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';

  if (validateCronSecureToken(token)) {
    return handleCronJob(request);
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Verify that request is from Vercel Cron (using HMAC signature)
 *
 * Note: Vercel Cron actually uses x-vercel-cron header but doesn't sign it.
 * For production, implement your own HMAC-based verification or use
 * a third-party cron service with webhook signatures.
 */
function isVercelCronRequest(request: NextRequest): boolean {
  // In production, verify HMAC signature from request body
  // const signature = request.headers.get('x-signature');
  // return verifyHmacSignature(signature, requestBody);

  // For now, require bearer token
  return false;
}

/**
 * Validate CRON secret with timing-safe comparison
 */
function validateCronSecureToken(token: string): boolean {
  const expected = process.env.CRON_SECRET || '';

  if (!expected) {
    console.error('CRON_SECRET not configured');
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

async function handleCronJob(request: NextRequest) {
  // ... existing job logic
}
```

---

## 5. Proper CORS Configuration

**Update:** `/src/app/api/route.ts` or create `/src/middleware.ts`

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://zaddytools.vercel.app',
  'https://www.zaddytools.vercel.app',
  // Add your production domains here
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:3001']
    : []
  ),
];

const API_ROUTES = '/api/:path*';

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.match(/^\/api\//)) {
    const origin = request.headers.get('origin');

    // Check if origin is allowed
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      if (isAllowed) {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin!,
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Add CORS headers to actual requests
    const response = NextResponse.next();
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin!);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');
    }
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 6. Security Headers in next.config.js

**Update:** `/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['googleapis'],
  },

  async redirects() {
    return [
      {
        source: '/creator-dashboard',
        destination: '/market-analysis',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Force HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
      // CSP for API routes only
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; script-src 'none'",
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
```

---

## 7. Request Size Limiting Middleware

**Add to:** `/src/middleware.ts`

```typescript
export function middleware(request: NextRequest) {
  // Limit request size for POST/PATCH/PUT requests
  if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 1024 * 1024; // 1MB

      if (size > maxSize) {
        return NextResponse.json(
          { error: 'Payload too large' },
          { status: 413 }
        );
      }
    }
  }

  return NextResponse.next();
}
```

---

## 8. Input Validation Helper

**Add to:** `/src/lib/validation.ts`

```typescript
/**
 * Validate and sanitize project name
 */
export function validateProjectName(name: string | undefined): string | null {
  if (!name || typeof name !== 'string') return null;

  const trimmed = name.trim();

  // Length validation
  if (trimmed.length < 2 || trimmed.length > 200) {
    return null;
  }

  // No special characters that could break sheets
  if (/[=+\-@]/.test(trimmed[0])) {
    return null; // Block formulas
  }

  return trimmed;
}

/**
 * Validate notes/description
 */
export function validateNotes(notes: string | undefined): string | null {
  if (!notes) return undefined;
  if (typeof notes !== 'string') return null;

  const trimmed = notes.trim();

  if (trimmed.length > 5000) {
    return null;
  }

  // Block formulas
  if (/^[=+\-@]/.test(trimmed)) {
    return null;
  }

  return trimmed || undefined;
}

/**
 * Validate category
 */
export function validateCategory(category: any): 'web2' | 'web3' | null {
  if (typeof category !== 'string') return null;

  const normalized = category.toLowerCase();
  if (normalized === 'web2') return 'web2';
  if (normalized === 'web3') return 'web3';

  return null;
}
```

---

## 9. Fetch Timeout Wrapper

**Add to:** `/src/lib/api.ts`

```typescript
/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage:
const res = await fetchWithTimeout('https://api.example.com/data', {
  timeout: 10000,
});
```

---

## 10. Environment Variable Template

**Create:** `.env.example`

```bash
# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Authentication
ADMIN_KEY=your_super_secret_admin_key_here_at_least_32_chars_long
CRON_SECRET=your_super_secret_cron_key_here_at_least_32_chars_long

# External APIs
OPENSEA_API_KEY=your_opensea_api_key
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_TOKEN=your_replicate_token

# Environment
NODE_ENV=development
```

**Add to .gitignore:**
```
.env.local
.env.development.local
.env.production.local
.env.*.local
```

---

## Implementation Checklist

- [ ] Update timing-safe authentication
- [ ] Add URL validation library
- [ ] Implement rate limiting middleware
- [ ] Fix CRON authorization
- [ ] Add CORS middleware
- [ ] Update security headers
- [ ] Add request size limits
- [ ] Create input validation helpers
- [ ] Add fetch timeout wrapper
- [ ] Update environment configuration
- [ ] Test all endpoints
- [ ] Run security audit tools
- [ ] Deploy to staging for testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Testing Commands

```bash
# Check dependencies for vulnerabilities
npm audit

# Run linting
npm run lint

# Test authentication
curl -X GET http://localhost:3000/api/admin/suggestions \
  -H "x-admin-key: wrong-key"

# Test rate limiting
for i in {1..100}; do curl http://localhost:3000/api/suggest; done

# Test CORS
curl -H "Origin: http://attacker.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:3000/api/suggest
```

---

## References

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/routing/protected-routes)
- [Crypto Timing Attacks](https://en.wikipedia.org/wiki/Timing_attack)
