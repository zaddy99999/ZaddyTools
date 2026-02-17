import { NextResponse } from 'next/server';
import { getSuggestions, updateSuggestionStatus, addTierMakerItems, addPeopleTierMakerItems, applyToolTypeDropdown, getExistingHandles } from '@/lib/sheets';

// Whitelisted wallet address for admin access
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

function isAuthorized(request: Request): boolean {
  // Check for whitelisted wallet address
  const walletAddress = request.headers.get('x-wallet-address');
  if (walletAddress && walletAddress.toLowerCase() === WHITELISTED_WALLET) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const debug = searchParams.get('debug') === 'true';

    // Get existing handles to check for duplicates
    const existingHandles = await getExistingHandles();
    const suggestions = await getSuggestions(status || undefined, existingHandles);

    if (debug) {
      return NextResponse.json({
        suggestions,
        count: suggestions.length,
        existingHandlesCount: existingHandles.size,
      });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { action } = body;

    if (action === 'apply-dropdown') {
      await applyToolTypeDropdown();
      return NextResponse.json({ success: true, message: 'Dropdown validation applied to tool_type column' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST suggestions:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
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
