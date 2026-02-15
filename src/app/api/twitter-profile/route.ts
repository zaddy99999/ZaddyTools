import { NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { name: string; avatar: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Validate Twitter handle: alphanumeric + underscore only, max 15 chars
function isValidTwitterHandle(handle: string): boolean {
  const twitterHandleRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return twitterHandleRegex.test(handle);
}

// Escape HTML characters to prevent XSS
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json({ error: 'Handle required' }, { status: 400 });
  }

  // Validate handle format to prevent injection attacks
  if (!isValidTwitterHandle(handle)) {
    return NextResponse.json(
      { error: 'Invalid handle format. Must be alphanumeric and underscore only, max 15 characters.' },
      { status: 400 }
    );
  }

  // Sanitize handle for use in response (already validated, but escape for safety)
  const sanitizedHandle = escapeHtml(handle);

  // Check cache first
  const cached = cache.get(handle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      name: escapeHtml(cached.name),
      avatar: cached.avatar,
      handle: sanitizedHandle
    });
  }

  try {
    // Use fxtwitter API - reliable and no rate limiting
    const fxRes = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (fxRes.ok) {
      const data = await fxRes.json();
      if (data.user?.name) {
        const avatar = data.user.avatar_url || `https://unavatar.io/twitter/${encodeURIComponent(handle)}`;
        const sanitizedName = escapeHtml(data.user.name);
        cache.set(handle.toLowerCase(), { name: data.user.name, avatar, timestamp: Date.now() });
        return NextResponse.json({ name: sanitizedName, avatar, handle: sanitizedHandle });
      }
    }

    // Fallback: return the handle with unavatar
    const fallbackAvatar = `https://unavatar.io/twitter/${encodeURIComponent(handle)}`;
    return NextResponse.json({ name: sanitizedHandle, avatar: fallbackAvatar, handle: sanitizedHandle });
  } catch (e) {
    const fallbackAvatar = `https://unavatar.io/twitter/${encodeURIComponent(handle)}`;
    return NextResponse.json({ name: sanitizedHandle, avatar: fallbackAvatar, handle: sanitizedHandle });
  }
}
