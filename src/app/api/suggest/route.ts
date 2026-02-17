import { NextResponse } from 'next/server';
import { submitSuggestion, SuggestionData, isAlreadySuggested } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rateLimit';

// Rate limit: 10 requests per minute
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 10,       // 10 requests per minute
};

const MAX_PROJECT_NAME_LENGTH = 200;
const MAX_URL_LENGTH = 2000;
const MAX_NOTES_LENGTH = 1000;

// URL validation regex - allows http/https URLs
const URL_REGEX = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;

// Sanitize string to prevent XSS - removes potentially dangerous characters
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

// Validate URL format
function isValidUrl(url: string): boolean {
  if (url.length > MAX_URL_LENGTH) {
    return false;
  }
  return URL_REGEX.test(url);
}

export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.projectName || typeof body.projectName !== 'string' || !body.projectName.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Validate projectName length
    if (body.projectName.length > MAX_PROJECT_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Twitter URL is required
    if (!body.twitterUrl) {
      return NextResponse.json(
        { error: 'Twitter/X URL is required' },
        { status: 400 }
      );
    }

    // Validate twitterUrl format - allow handles or URLs
    const twitterUrl = body.twitterUrl.trim();
    const isHandle = twitterUrl.startsWith('@') || (!twitterUrl.includes('/') && !twitterUrl.includes('.'));
    if (!isHandle && !isValidUrl(twitterUrl)) {
      return NextResponse.json(
        { error: 'Invalid Twitter/X URL format' },
        { status: 400 }
      );
    }

    // Extract clean handle from URL or handle input
    let cleanHandle = twitterUrl;
    if (cleanHandle.includes('x.com/') || cleanHandle.includes('twitter.com/')) {
      cleanHandle = cleanHandle.split('/').pop() || cleanHandle;
    }
    cleanHandle = cleanHandle.replace(/^@/, '').replace(/[?#].*$/, '').trim();

    // Validate Twitter account exists using unavatar.io
    if (cleanHandle && /^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
      try {
        const checkResponse = await fetch(`https://unavatar.io/twitter/${cleanHandle}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        // If we get redirected to a fallback/default avatar, account likely doesn't exist
        const finalUrl = checkResponse.url;
        if (finalUrl.includes('fallback') || finalUrl.includes('default') || !checkResponse.ok) {
          return NextResponse.json(
            { error: 'Twitter account does not exist. Please check the handle.' },
            { status: 400 }
          );
        }
      } catch {
        // If check fails, allow submission but log warning
        console.warn('Could not verify Twitter account:', cleanHandle);
      }
    } else if (cleanHandle) {
      return NextResponse.json(
        { error: 'Invalid Twitter handle. Only letters, numbers, and underscores allowed.' },
        { status: 400 }
      );
    }

    // Validate giphyUrl format if provided
    if (body.giphyUrl) {
      if (typeof body.giphyUrl !== 'string' || !isValidUrl(body.giphyUrl)) {
        return NextResponse.json(
          { error: 'Invalid GIPHY URL format' },
          { status: 400 }
        );
      }
    }

    // Validate tiktokUrl format if provided
    if (body.tiktokUrl) {
      if (typeof body.tiktokUrl !== 'string' || !isValidUrl(body.tiktokUrl)) {
        return NextResponse.json(
          { error: 'Invalid TikTok URL format' },
          { status: 400 }
        );
      }
    }

    if (!body.category || !['web2', 'web3'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Category must be web2 or web3' },
        { status: 400 }
      );
    }

    // Validate notes length if provided
    if (body.notes && (typeof body.notes !== 'string' || body.notes.length > MAX_NOTES_LENGTH)) {
      return NextResponse.json(
        { error: `Notes must be ${MAX_NOTES_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Check if already suggested
    const alreadySuggested = await isAlreadySuggested(body.projectName);
    if (alreadySuggested) {
      return NextResponse.json(
        { error: 'This project has already been suggested' },
        { status: 409 }
      );
    }

    // Sanitize all inputs to prevent XSS
    const suggestion: SuggestionData = {
      projectName: sanitizeString(body.projectName),
      twitterUrl: body.twitterUrl ? sanitizeString(body.twitterUrl) : undefined,
      giphyUrl: body.giphyUrl ? sanitizeString(body.giphyUrl) : undefined,
      tiktokUrl: body.tiktokUrl ? sanitizeString(body.tiktokUrl) : undefined,
      category: body.category,
      notes: body.notes ? sanitizeString(body.notes) : undefined,
      toolType: body.toolType ? sanitizeString(body.toolType) : 'social-clips',
      source: body.source ? sanitizeString(body.source) : 'social-clips',
    };

    await submitSuggestion(suggestion);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}
