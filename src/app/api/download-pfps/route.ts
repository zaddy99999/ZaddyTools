import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateSession, safeCompare } from '@/lib/admin-session';

function isAuthorized(request: Request): boolean {
  // First, check for session token (new secure method)
  const sessionToken = request.headers.get('x-admin-session');
  if (sessionToken && validateSession(sessionToken)) {
    return true;
  }

  // Fallback: check for direct admin key (for backward compatibility)
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.error('ADMIN_KEY environment variable is not configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-key');
  if (!authHeader) {
    return false;
  }

  return safeCompare(authHeader, adminKey);
}

const PFP_DIR = path.join(process.cwd(), 'public', 'pfp');

interface Person {
  handle: string;
  name: string;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 2 requests per minute (Heavy operation)
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 2 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Fetch the recommended people list
    const peopleRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recommended-people`);
    if (!peopleRes.ok) {
      throw new Error('Failed to fetch people list');
    }

    const people: Person[] = await peopleRes.json();

    // Ensure directory exists
    await fs.mkdir(PFP_DIR, { recursive: true });

    const results: { handle: string; status: string }[] = [];

    // Download each profile picture
    for (const person of people) {
      const handle = person.handle;
      const filePath = path.join(PFP_DIR, `${handle}.jpg`);

      // Check if already exists
      try {
        await fs.access(filePath);
        results.push({ handle, status: 'exists' });
        continue;
      } catch {
        // File doesn't exist, download it
      }

      try {
        const imageUrl = `https://unavatar.io/twitter/${handle}`;
        const imageRes = await fetch(imageUrl);

        if (!imageRes.ok) {
          results.push({ handle, status: 'failed' });
          continue;
        }

        const buffer = await imageRes.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(buffer));
        results.push({ handle, status: 'downloaded' });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({ handle, status: 'error' });
      }
    }

    const downloaded = results.filter(r => r.status === 'downloaded').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    return NextResponse.json({
      success: true,
      total: people.length,
      downloaded,
      existing,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error downloading PFPs:', error);
    return NextResponse.json({ error: 'Failed to download PFPs' }, { status: 500 });
  }
}
