import { timingSafeEqual, createHash } from 'crypto';

// In-memory session store (in production, use Redis or a database)
// Sessions expire after 24 hours
export const sessions = new Map<string, { createdAt: number; hash: string }>();
export const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired sessions periodically
export function cleanupSessions() {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(token);
    }
  });
}

// Timing-safe comparison to prevent timing attacks
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time behavior
    const dummy = Buffer.from(a);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Hash the admin key for session validation
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Validate session token
export function validateSession(sessionToken: string): boolean {
  cleanupSessions();
  const session = sessions.get(sessionToken);
  return !!(session && Date.now() - session.createdAt < SESSION_TTL);
}
