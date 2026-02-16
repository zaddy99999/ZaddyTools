import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Allowed origins for API requests
 * Only requests from these origins will be allowed to access /api/* routes
 */
const ALLOWED_ORIGINS = [
  'https://zaddytools.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
];

/**
 * Check if the origin is a Vercel preview deployment for this project
 */
function isVercelPreview(origin: string): boolean {
  // Vercel preview URLs: zaddytools-*.vercel.app or zaddytools-*-username.vercel.app
  return /^https:\/\/zaddytools-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

/**
 * Check if the request is from an allowed origin
 */
function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check Origin header first (preferred)
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    if (isVercelPreview(origin)) return true;
    return false;
  }

  // Fall back to Referer header (for same-origin requests that don't send Origin)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (ALLOWED_ORIGINS.includes(refererOrigin)) return true;
      if (isVercelPreview(refererOrigin)) return true;
    } catch {
      return false;
    }
  }

  // No Origin or Referer - this could be:
  // 1. A server-side request (curl, Postman, etc.) - BLOCK
  // 2. A same-origin navigation - but API routes shouldn't be navigated to directly
  // Block by default for security
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow CORS preflight requests to get proper CORS error instead of 403
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Check if request is from allowed origin
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
