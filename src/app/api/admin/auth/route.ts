import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  sessions,
  SESSION_TTL,
  cleanupSessions,
  safeCompare,
  hashKey,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/admin-session';

export async function POST(request: Request) {
  try {
    const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 5 });
    if (rateLimitResponse) return rateLimitResponse;

    // Get client IP for lockout tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // Check if IP is locked out
    if (isLockedOut(clientIp)) {
      return NextResponse.json({ error: 'Too many failed attempts. Please try again later.' }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { adminKey, sessionToken } = body;

    // Clean up expired sessions
    cleanupSessions();

    // Validate existing session token
    if (sessionToken) {
      const session = sessions.get(sessionToken);
      if (session && Date.now() - session.createdAt < SESSION_TTL) {
        return NextResponse.json({ valid: true });
      }
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Authenticate with admin key
    if (adminKey) {
      const envAdminKey = process.env.ADMIN_KEY;
      if (!envAdminKey) {
        console.error('ADMIN_KEY environment variable is not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      if (safeCompare(adminKey, envAdminKey)) {
        // Clear failed attempts on successful login
        clearFailedAttempts(clientIp);

        // Create a new session token
        const newSessionToken = randomUUID();
        sessions.set(newSessionToken, {
          createdAt: Date.now(),
          hash: hashKey(envAdminKey),
        });

        return NextResponse.json({
          success: true,
          sessionToken: newSessionToken,
          expiresIn: SESSION_TTL
        });
      }

      // Record failed attempt on invalid admin key
      recordFailedAttempt(clientIp);
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Missing adminKey or sessionToken' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
