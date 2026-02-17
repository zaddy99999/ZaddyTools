import { NextRequest, NextResponse } from 'next/server';
import { submitSuggestion, isAlreadySuggested } from '@/lib/sheets/suggestions';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { handle, type } = body;

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Clean the handle (remove @ if present, remove invalid chars)
    const cleanHandle = handle.trim().replace(/^@/, '').replace(/[?#].*$/, '');

    if (!cleanHandle) {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
    }

    // Validate handle format
    if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
      return NextResponse.json(
        { error: 'Invalid Twitter handle. Only letters, numbers, and underscores allowed.' },
        { status: 400 }
      );
    }

    // Validate Twitter account exists
    try {
      const checkResponse = await fetch(`https://unavatar.io/twitter/${cleanHandle}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      const finalUrl = checkResponse.url;
      if (finalUrl.includes('fallback') || finalUrl.includes('default') || !checkResponse.ok) {
        return NextResponse.json(
          { error: 'Twitter account does not exist. Please check the handle.' },
          { status: 400 }
        );
      }
    } catch {
      console.warn('Could not verify Twitter account:', cleanHandle);
    }

    // Check if already suggested
    const suggestionCheck = await isAlreadySuggested(cleanHandle);
    if (suggestionCheck.exists) {
      let errorMsg = 'This handle has already been suggested';
      if (suggestionCheck.status === 'rejected') {
        errorMsg = `This handle was previously rejected${suggestionCheck.count && suggestionCheck.count > 1 ? ` (${suggestionCheck.count} times)` : ''}. Contact admin to add manually.`;
      } else if (suggestionCheck.status === 'approved') {
        errorMsg = 'This handle was already approved and should be on the list.';
      } else {
        errorMsg = 'This handle is pending review.';
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: 409 }
      );
    }

    // Map the type to a proper toolType for filtering
    const toolTypeMap: Record<string, string> = {
      'person': 'recommended-follows',
      'project': 'recommended-follows',
      'tierlist': 'tier-maker',
      'build-your-team': 'build-your-team',
    };
    const toolType = toolTypeMap[type] || 'recommended-follows';

    await submitSuggestion({
      projectName: cleanHandle,
      category: 'web3',
      notes: `Suggested for ${type || 'recommended follows'}`,
      toolType,
      source: toolType, // e.g., 'recommended-follows', 'tier-maker', 'build-your-team'
    });

    return NextResponse.json({ success: true, handle: cleanHandle });
  } catch (error) {
    console.error('Error submitting follow suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}
