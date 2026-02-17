import { NextResponse } from 'next/server';
import { getSuggestions, updateSuggestionStatus, addTierMakerItems, addPeopleTierMakerItems, applyToolTypeDropdown, getExistingHandles, submitSuggestion, deleteSuggestion } from '@/lib/sheets';

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

    const { action, projectName, handle, category, source, status } = body;
    console.log('POST suggestions body:', { action, projectName, handle, category, source, status });

    if (action === 'apply-dropdown') {
      await applyToolTypeDropdown();
      return NextResponse.json({ success: true, message: 'Dropdown validation applied to tool_type column' });
    }

    if (action === 'migrate-people-columns') {
      const { migratePeopleColumns } = await import('@/lib/sheets/tierMaker');
      const result = await migratePeopleColumns();
      return NextResponse.json({ success: true, message: `Migrated ${result.migrated} rows` });
    }

    // Quick add suggestion
    if (projectName || handle) {
      const suggestionHandle = (handle || projectName || '').replace(/^@/, '').trim();

      // Admin can always add - no duplicate check needed

      await submitSuggestion({
        projectName: suggestionHandle,
        category: category || 'web3',
        toolType: source || 'quick-add',
        source: source || 'quick-add',
      });
      return NextResponse.json({ success: true, message: 'Suggestion added' });
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
    const { rowIndex, status, addToList, suggestion, editData, approveOptions } = body;

    if (!rowIndex) {
      return NextResponse.json({ error: 'Invalid request - missing rowIndex' }, { status: 400 });
    }

    // Handle edit data (updating row content)
    if (editData) {
      const { updateSuggestionRow } = await import('@/lib/sheets/suggestions');
      await updateSuggestionRow(rowIndex, editData);
      return NextResponse.json({ success: true });
    }

    // Handle status update
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Extract handle for batch operations
    const handle = suggestion?.handle || suggestion?.projectName?.replace(/^@/, '') || undefined;

    // Update the suggestion status (if rejecting, this will also reject other pending entries with same handle)
    await updateSuggestionStatus(rowIndex, status, status === 'rejected' ? handle : undefined);

    // Handle approval with options (new multi-select approval)
    if (status === 'approved' && approveOptions && suggestion) {
      // Extract handle from project name or URL
      let handle = suggestion.handle || suggestion.projectName || '';
      if (suggestion.twitterUrl?.includes('x.com/') || suggestion.twitterUrl?.includes('twitter.com/')) {
        handle = suggestion.twitterUrl.split('/').pop() || handle;
      }
      handle = handle.replace('@', '').replace(/[?#].*$/, '').trim();

      const source = (suggestion.source || suggestion.toolType || '').toLowerCase();
      // Determine person vs project:
      // 1. If teamBuilder checked → person (only shown for people in UI)
      // 2. If socialAnalytics checked → project (only shown for projects in UI)
      // 3. Explicit "project" keyword → project
      // 4. Explicit "people"/"person"/"build-your-team" → person
      // 5. Ambiguous (recommended-follows, etc) → default to project (safer)
      let isPerson = false;
      if (approveOptions.teamBuilder === true) {
        isPerson = true;
      } else if (approveOptions.socialAnalytics === true) {
        isPerson = false;
      } else if (source.includes('project')) {
        isPerson = false;
      } else if (source.includes('people') || source.includes('person') || source.includes('build-your-team')) {
        isPerson = true;
      } else {
        // Ambiguous - default to project to avoid adding random things to people list
        isPerson = false;
      }

      // Check if this was self-submitted (applied)
      const isApplied = source.includes('apply') || source.includes('application') || source.includes('submit');

      // Collect all the checkboxes that should be set - explicit booleans to prevent undefined issues
      const recommendedFollow = approveOptions.recommendedFollows === true;
      const tierList = approveOptions.tierList === true;
      const priority = approveOptions.priority === true;
      const teamBuilder = approveOptions.teamBuilder === true;

      console.log('Approval:', { handle, source, isPerson, isApplied, recommendedFollow, tierList, teamBuilder, priority });

      // Add to the appropriate sheet with correct checkboxes
      if (isPerson) {
        // For people, add to People sheet with appropriate checkboxes
        // Team Builder uses the People sheet too (same as tier list)
        const shouldAddTierList = tierList || teamBuilder;

        if (recommendedFollow || shouldAddTierList || teamBuilder || priority) {
          console.log('Adding person to sheet:', { handle, recommendedFollow, tierList: shouldAddTierList, teamBuilder, priority });
          await addPeopleTierMakerItems([{
            name: suggestion.projectName || handle,
            handle,
            category: suggestion.notes || 'Community',
            recommendedFollow,
            tierList: shouldAddTierList,
            teamBuilder,
            priority,
            applied: isApplied,
          }]);
        } else {
          console.log('Skipping person - no options selected');
        }
      } else {
        // For projects, add to Projects sheet with appropriate checkboxes
        // Social Analytics uses the same Projects sheet
        const socialAnalytics = approveOptions.socialAnalytics === true;
        if (recommendedFollow || tierList || socialAnalytics) {
          console.log('Adding project to sheet:', { handle, recommendedFollow, tierList });
          await addTierMakerItems([{
            handle,
            name: suggestion.projectName || handle,
            recommendedFollow,
            tierList,
            applied: isApplied,
          }]);
        } else {
          console.log('Skipping project - no options selected');
        }
      }
    }

    // Legacy: If approved and addToList is true (old behavior)
    if (status === 'approved' && addToList && suggestion && !approveOptions) {
      const toolType = suggestion.toolType || 'social-clips';

      if (toolType === 'tier-maker-projects' || toolType === 'tier-maker') {
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rowIndex = parseInt(searchParams.get('rowIndex') || '0', 10);

    if (!rowIndex) {
      return NextResponse.json({ error: 'Missing rowIndex' }, { status: 400 });
    }

    await deleteSuggestion(rowIndex);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 });
  }
}
