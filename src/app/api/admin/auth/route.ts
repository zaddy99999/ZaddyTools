import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  sessions,
  SESSION_TTL,
  cleanupSessions,
  safeCompare,
  hashKey,
} from '@/lib/admin-session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Missing adminKey or sessionToken' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
