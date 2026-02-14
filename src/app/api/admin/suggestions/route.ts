import { NextResponse } from 'next/server';
import { getSuggestions, updateSuggestionStatus, addTierMakerItems, addPeopleTierMakerItems } from '@/lib/sheets';

// Simple admin auth check
const ADMIN_KEY = process.env.ADMIN_KEY || 'zaddy-admin-2024';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('x-admin-key');
  return authHeader === ADMIN_KEY;
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
    const body = await request.json();
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
