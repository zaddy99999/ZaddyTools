import { NextResponse } from 'next/server';
import { getSuggestions, updateSuggestionStatus, addTierMakerItems, addPeopleTierMakerItems } from '@/lib/sheets';
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

    const suggestions = await getSuggestions(status || undefined);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { rowIndex, status, addToList, suggestion } = body;

    if (!rowIndex || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Update the suggestion status
    await updateSuggestionStatus(rowIndex, status);

    // If approved and addToList is true, add to the appropriate list
    if (status === 'approved' && addToList && suggestion) {
      const toolType = suggestion.toolType || 'social-clips';

      if (toolType === 'tier-maker-projects' || toolType === 'tier-maker') {
        // Extract handle from URL or use name
        let handle = suggestion.projectName;
        if (suggestion.giphyUrl?.includes('x.com/') || suggestion.giphyUrl?.includes('twitter.com/')) {
          handle = suggestion.giphyUrl.split('/').pop() || handle;
        }
        await addTierMakerItems([{
          handle: handle.replace('@', ''),
          name: suggestion.projectName,
        }]);
      } else if (toolType === 'tier-maker-people') {
        let handle = suggestion.projectName;
        if (suggestion.giphyUrl?.includes('x.com/') || suggestion.giphyUrl?.includes('twitter.com/')) {
          handle = suggestion.giphyUrl.split('/').pop() || handle;
        }
        await addPeopleTierMakerItems([{
          name: suggestion.projectName,
          handle: handle.replace('@', ''),
          category: suggestion.notes || 'Community',
        }]);
      }
      // For social-clips, the suggestion is just logged, no auto-add needed
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}
