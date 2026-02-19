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

    if (action === 'fix-people-headers') {
      const { fixPeopleSheetHeaders } = await import('@/lib/sheets/tierMaker');
      await fixPeopleSheetHeaders();
      return NextResponse.json({ success: true, message: 'People sheet headers updated' });
    }

    if (action === 'shift-people-columns') {
      const { shiftPeopleColumns, fixPeopleSheetHeaders } = await import('@/lib/sheets/tierMaker');
      const result = await shiftPeopleColumns();
      await fixPeopleSheetHeaders();
      return NextResponse.json({ success: true, message: `Shifted ${result.shifted} rows and updated headers` });
    }

    if (action === 'remove-from-people') {
      const handleToRemove = (handle || '').toLowerCase().replace('@', '');
      if (!handleToRemove) {
        return NextResponse.json({ error: 'Handle required' }, { status: 400 });
      }

      const { google } = await import('googleapis');
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

      // Find in People sheet - check both Name (A) and Twitter URL (B) columns
      const peopleRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'TierMaker List (People)'!A:H",
      });
      const peopleRows = peopleRes.data.values || [];
      const rowsToRemove: number[] = [];

      for (let i = 1; i < peopleRows.length; i++) {
        const name = (peopleRows[i][0] || '').toLowerCase();
        const url = (peopleRows[i][1] || '').toLowerCase();
        if (url.includes(handleToRemove) || name.includes(handleToRemove)) {
          rowsToRemove.push(i + 1);
        }
      }

      if (rowsToRemove.length === 0) {
        // Debug: find rows that might match
        const possibleMatches = peopleRows.slice(1).filter((row, i) => {
          const name = (row[0] || '').toLowerCase();
          const url = (row[1] || '').toLowerCase();
          return name.includes('pudgy') || url.includes('pudgy');
        }).map((row, i) => ({ row: i + 2, name: row[0], url: row[1] }));
        return NextResponse.json({ success: false, message: 'Not found in People sheet', debug: { totalRows: peopleRows.length, possibleMatches } });
      }

      // Clear all matching rows
      for (const rowIndex of rowsToRemove) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'TierMaker List (People)'!A${rowIndex}:H${rowIndex}`,
        });
      }

      return NextResponse.json({ success: true, message: `Removed ${rowsToRemove.length} row(s) for ${handleToRemove} from People sheet` });
    }

    if (action === 'move-to-projects') {
      const handleToMove = (handle || '').toLowerCase().replace('@', '');
      if (!handleToMove) {
        return NextResponse.json({ error: 'Handle required' }, { status: 400 });
      }

      const { google } = await import('googleapis');
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

      // Check if already in Projects sheet
      const projectsRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'TierMaker List (Projects)'!A:B",
      });
      const projectRows = projectsRes.data.values || [];
      const existsInProjects = projectRows.some(row => {
        const url = (row[1] || '').toLowerCase();
        return url.includes(handleToMove);
      });

      if (existsInProjects) {
        // Already exists, just remove from People sheet
        const peopleRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'TierMaker List (People)'!A:H",
        });
        const peopleRows = peopleRes.data.values || [];
        let removed = 0;
        for (let i = 1; i < peopleRows.length; i++) {
          const url = (peopleRows[i][1] || '').toLowerCase();
          if (url.includes(handleToMove)) {
            await sheets.spreadsheets.values.clear({
              spreadsheetId,
              range: `'TierMaker List (People)'!A${i + 1}:H${i + 1}`,
            });
            removed++;
          }
        }
        return NextResponse.json({ success: true, message: `Already in Projects. Removed ${removed} duplicate(s) from People sheet.` });
      }

      // Find in People sheet
      const peopleRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'TierMaker List (People)'!A:H",
      });
      const peopleRows = peopleRes.data.values || [];
      let foundRowIndex = -1;
      let foundRowData: string[] | null = null;

      for (let i = 1; i < peopleRows.length; i++) {
        const url = (peopleRows[i][1] || '').toLowerCase();
        if (url.includes(handleToMove)) {
          foundRowIndex = i + 1; // 1-indexed for sheets
          foundRowData = peopleRows[i];
          break;
        }
      }

      if (!foundRowData) {
        return NextResponse.json({ success: false, message: 'Not found in People sheet' });
      }

      // Add to Projects sheet
      const nextProjectRow = projectRows.length + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'TierMaker List (Projects)'!A${nextProjectRow}:H${nextProjectRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            foundRowData[0] || handleToMove,  // Name
            foundRowData[1] || `https://x.com/${handleToMove}`,  // Twitter
            '',  // Category
            foundRowData[6] || '',  // Tier List (was G in people, now D in projects)
            foundRowData[4] || '',  // Recommended Follow (E in both)
            foundRowData[5] || '',  // Priority (F in both)
            '',  // Applied
            '',  // Extra
          ]],
        },
      });

      // Clear the row in People sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'TierMaker List (People)'!A${foundRowIndex}:H${foundRowIndex}`,
      });

      return NextResponse.json({ success: true, message: `Moved ${handleToMove} to Projects sheet (row ${foundRowIndex} cleared in People)` });
    }

    if (action === 'import-fallback-dev-notes') {
      const { google } = await import('googleapis');
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

      // Fallback notes from the developer-notes page (Feb 13-17)
      const fallbackNotes = [
        { date: 'February 17, 2025', title: 'Combined Top Wallets & All Wallets', description: 'Merged Top Wallets into All Wallets section. Now shows all Silver+ wallets (198k+) with tier filters, search, sorting by tier/txns/badges, and 500 wallet limit with scrolling.', type: 'feature' },
        { date: 'February 17, 2025', title: 'Silver Wallet Enrichment', description: 'Started scraping 180k silver tier wallets with profile pictures and transaction counts using 15 parallel workers.', type: 'feature' },
        { date: 'February 17, 2025', title: 'Media Player Controls Redesign', description: 'Moved play/pause and mute buttons to bottom time bar. Week navigation arrows now below the date display.', type: 'improvement' },
        { date: 'February 17, 2025', title: 'Heatmap Image Fallbacks', description: 'Fixed heatmap PFP loading for tokens like SOL by switching to foreignObject with HTML img and proper error handling.', type: 'fix' },
        { date: 'February 17, 2025', title: 'NFT Leaderboard 0% Fix', description: 'NFT leaderboard now shows "-" instead of "0.0%" when there\'s no price change data.', type: 'fix' },
        { date: 'February 17, 2025', title: 'Suggestion Status Messages', description: 'Added descriptive error messages when suggesting handles: shows if pending, approved, or rejected (with count).', type: 'improvement' },
        { date: 'February 17, 2025', title: 'Admin Override for Suggestions', description: 'Admin can now add names even if previously rejected. Regular users still see rejection messages.', type: 'feature' },
        { date: 'February 17, 2025', title: 'Pending Filter Fix', description: 'Fixed approved items showing in pending list by normalizing status comparison (trim + lowercase).', type: 'fix' },
        { date: 'February 16, 2025', title: 'NFT / Meme Heatmap Combined', description: 'Combined NFT and Meme treemaps into a single component with toggle. Added MCap/Volume size metric toggle. NFTs show by default.', type: 'feature' },
        { date: 'February 16, 2025', title: 'Market Heatmap PFPs', description: 'Added profile pictures to Market Heatmap coins with local fallbacks and error handling.', type: 'improvement' },
        { date: 'February 16, 2025', title: 'Coin Whitelist', description: 'Added whitelist for Market Heatmap to prevent scam tokens from appearing. Only approved coins show up.', type: 'feature' },
        { date: 'February 16, 2025', title: 'Abstract TVL via DeFi Llama', description: 'Switched Abstract Dashboard TVL data source from L2Beat to DeFi Llama for more conservative numbers.', type: 'improvement' },
        { date: 'February 16, 2025', title: 'Abstract Weekly News Recap', description: 'Added video player module to Abstract Dashboard for weekly news recap videos.', type: 'feature' },
        { date: 'February 16, 2025', title: 'Developer Notes Page', description: 'Added this page to track development updates and changes.', type: 'feature' },
        { date: 'February 16, 2025', title: 'Admin Analytics API', description: 'Created analytics tracking API endpoint for admin dashboard.', type: 'feature' },
        { date: 'February 15, 2025', title: 'Abstract Token PFPs', description: 'Downloaded and saved token profile pictures locally in /public/tokens/ for fallback when API fails.', type: 'improvement' },
        { date: 'February 15, 2025', title: 'Whitelist System', description: 'Implemented Google Sheets-based whitelist for NFTs and tokens on Abstract Dashboard.', type: 'feature' },
        { date: 'February 15, 2025', title: 'Token/NFT Leaderboards', description: 'Added Top Abstract NFTs and Top Abstract Tokens leaderboard tables.', type: 'feature' },
        { date: 'February 14, 2025', title: 'Abstract Dashboard Launch', description: 'Initial launch of the Abstract chain dashboard with tier stats, TVL, and activity metrics.', type: 'feature' },
        { date: 'February 14, 2025', title: 'Tier Cards', description: 'Added 3D animated tier cards showing user distribution across Bronze to Ethereal tiers.', type: 'feature' },
        { date: 'February 14, 2025', title: 'Elite Wallets Leaderboard', description: 'Added top wallets leaderboard with tier badges and XP display.', type: 'feature' },
        { date: 'February 14, 2025', title: 'Recommended People', description: 'Added recommended Abstract community members to follow.', type: 'feature' },
        { date: 'February 13, 2025', title: 'Market Analysis Page', description: 'Created comprehensive market analysis page with multiple data modules.', type: 'feature' },
        { date: 'February 13, 2025', title: 'Draggable Dashboard', description: 'Implemented drag-and-drop reordering for dashboard modules with localStorage persistence.', type: 'feature' },
        { date: 'February 13, 2025', title: 'Fear & Greed Index', description: 'Added crypto Fear & Greed Index display.', type: 'feature' },
        { date: 'February 13, 2025', title: 'ETF Flows', description: 'Added Bitcoin and Ethereum ETF flow tracking.', type: 'feature' },
      ];

      // Get existing notes to check for duplicates
      const existingRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Developer Notes'!A:F",
      });
      const existingRows = existingRes.data.values || [];
      const existingTitles = new Set(existingRows.slice(1).map(row => (row[1] || '').toLowerCase()));

      // Filter out duplicates and prepare new rows
      const newNotes = fallbackNotes.filter(note => !existingTitles.has(note.title.toLowerCase()));

      if (newNotes.length === 0) {
        return NextResponse.json({ success: true, message: 'All notes already exist in sheet' });
      }

      const timestamp = new Date().toISOString();
      const rows = newNotes.map(note => [
        note.date,
        note.title,
        note.description,
        note.type,
        'pending',
        timestamp,
      ]);

      // Append new notes
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Developer Notes'!A:F",
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      });

      return NextResponse.json({ success: true, message: `Imported ${newNotes.length} new dev notes as pending` });
    }

    if (action === 'reset-dev-notes') {
      const { google } = await import('googleapis');
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

      // Get all dev notes
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Developer Notes'!A:F",
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return NextResponse.json({ success: true, message: 'No dev notes found' });
      }

      // Update all rows to set status (column E) to 'pending'
      const updates: string[][] = [];
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) { // Has data
          updates.push(['pending']);
          count++;
        } else {
          updates.push(['']); // Empty row
        }
      }

      if (updates.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'Developer Notes'!E2:E${updates.length + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: updates,
          },
        });
      }

      return NextResponse.json({ success: true, message: `Reset ${count} dev notes to pending` });
    }

    if (action === 'create-analytics-sheet') {
      const { google } = await import('googleapis');
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

      // Create Analytics sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Analytics' }
            }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Analytics!A1:D1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Timestamp', 'Type', 'Page', 'Tool']]
        }
      });

      return NextResponse.json({ success: true, message: 'Analytics sheet created' });
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
      // 1. If socialAnalytics checked → project (only shown for projects in UI)
      // 2. Explicit "project" keyword in source → project
      // 3. Everything else → person (people are more common, projects must be explicit)
      let isPerson = true; // Default to person
      if (approveOptions.socialAnalytics === true) {
        isPerson = false;
      } else if (source.includes('project')) {
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
