import {
  getSheets,
  getSpreadsheetId,
} from './auth';

export async function getTierMakerItems(): Promise<{ handle: string; name?: string; category?: string; priority?: boolean }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (Projects)!A:E',
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string; priority?: boolean }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A = Name, Column B = Twitter URL, Column C = Category, Column D = Tier List checkbox, Column E = Recommended Follow, Column F = Priority
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();
      const tierVal = row[3]?.toString().toUpperCase().trim();
      const priVal = row[5]?.toString().toUpperCase().trim();
      const showInTier = tierVal === 'TRUE' || tierVal === 'YES' || tierVal === '1' || tierVal === 'X' || tierVal === '✓';
      const priority = priVal === 'TRUE' || priVal === 'YES' || priVal === '1' || priVal === 'X' || priVal === '✓';

      // Only include items with Tier List checkbox (column D) checked
      if (!showInTier) continue;

      if (twitterUrl) {
        // Extract handle from URL
        let handle = twitterUrl;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '');

        if (handle) {
          items.push({
            handle,
            name: displayName || undefined,
            category: category || undefined,
            priority,
          });
        }
      }
    }

    // Sort by priority first
    items.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (b.priority && !a.priority) return 1;
      return 0;
    });

    return items;
  } catch (error) {
    console.error('Error fetching tier maker items:', error);
    return [];
  }
}

export async function addTierMakerItems(items: { handle: string; name?: string; recommendedFollow?: boolean; tierList?: boolean; applied?: boolean }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // First, get existing data to find last row and check for duplicates
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'TierMaker List (Projects)'!A:B",
  });

  const existingRows = existingData.data.values || [];

  // Build set of existing handles (from column B - Twitter URLs)
  const existingHandles = new Set<string>();
  for (const row of existingRows) {
    const url = row[1]?.toLowerCase() || '';
    const handle = url.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('@', '').trim();
    if (handle) existingHandles.add(handle.toLowerCase());
  }

  // Filter out duplicates
  const newItems = items.filter(item => !existingHandles.has(item.handle.toLowerCase()));

  if (newItems.length === 0) {
    console.log('addTierMakerItems - all items already exist, skipping');
    return;
  }

  const nextRow = existingRows.length + 1;
  console.log('addTierMakerItems - last row with data:', existingRows.length, 'next row:', nextRow);
  console.log('addTierMakerItems - filtered duplicates:', items.length - newItems.length);

  // Columns: A=Name, B=Twitter URL, C=Category, D=Tier List checkbox, E=Recommended Follow, F=Priority, G=Applied, H=(extra)
  const rows = newItems.map(item => [
    item.name || item.handle,                    // A: Name
    `https://x.com/${item.handle}`,              // B: Twitter URL
    '',                                          // C: Category
    item.tierList ? 'TRUE' : '',                 // D: Tier List checkbox
    item.recommendedFollow ? 'TRUE' : '',        // E: Recommended Follow
    '',                                          // F: Priority
    item.applied ? 'TRUE' : '',                  // G: Applied (self-submitted)
    '',                                          // H: (extra column)
  ]);

  console.log('addTierMakerItems - spreadsheetId:', spreadsheetId);
  console.log('addTierMakerItems - writing to row:', nextRow);
  console.log('addTierMakerItems - rows to write:', rows);

  try {
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'TierMaker List (Projects)'!A${nextRow}:H${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
    console.log('addTierMakerItems - result:', result.data);
  } catch (error) {
    console.error('addTierMakerItems - ERROR:', error);
    throw error;
  }
}

export async function updateTierMakerItem(name: string, newUrl: string): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get all rows to find the one to update
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'TierMaker List (Projects)!A:C',
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === name.toLowerCase()) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `TierMaker List (Projects)!B${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newUrl]],
      },
    });
  }
}

export async function deleteTierMakerItem(name: string): Promise<boolean> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get all rows to find the one to delete
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'TierMaker List (Projects)!A:C',
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === name.toLowerCase()) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  if (rowIndex > 0) {
    // Clear the row (Google Sheets doesn't have a simple delete row API via values)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `TierMaker List (Projects)!A${rowIndex}:C${rowIndex}`,
    });
    return true;
  }

  return false;
}

// People tier maker functions - uses column G for tier list checkbox
// Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Build Team
export async function getPeopleTierMakerItems(): Promise<{ handle: string; name?: string; category?: string; recommended?: boolean; priority?: boolean }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'TierMaker List (People)'!A:H",
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string; recommended?: boolean; priority?: boolean }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A=Name, B=Twitter, C=Category, D=Tier, E=Recommended, F=Priority, G=Tier List, H=Build Team
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();
      const tierVal = row[6]?.toString().toUpperCase().trim(); // Column G = Tier List
      const showInTier = tierVal === 'TRUE' || tierVal === 'YES' || tierVal === '1' || tierVal === 'X' || tierVal === '✓';

      // Only include items with column G checked
      if (!showInTier) continue;

      if (twitterUrl) {
        // Extract handle from URL
        let handle = twitterUrl;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '').replace(/[?#].*$/, '');
        if (handle) {
          items.push({
            handle,
            name: displayName || undefined,
            category: category || undefined,
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching people tier maker items:', error);
    return [];
  }
}

// Get only recommended people (checkbox checked), sorted by priority first, applied last
// Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Build Team
export async function getRecommendedPeople(): Promise<{ handle: string; name?: string; category?: string; priority?: boolean; applied?: boolean }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'TierMaker List (People)'!A:H",
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string; priority?: boolean; applied?: boolean }[] = [];

    const isChecked = (val: string | undefined) => {
      const v = val?.toString().toUpperCase().trim();
      return v === 'TRUE' || v === 'YES' || v === '1' || v === 'X' || v === '✓';
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();

      // Column E (index 4) = Recommended Follow
      const recommended = isChecked(row[4]);
      // Column F (index 5) = Priority
      const priority = isChecked(row[5]);
      const applied = false;

      // Only include items with recommended checkbox checked (NOT tier checkbox)
      if (!recommended) continue;

      if (twitterUrl) {
        let handle = twitterUrl;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '');
        if (handle) {
          items.push({
            handle,
            name: displayName || undefined,
            category: category || undefined,
            priority,
            applied,
          });
        }
      }
    }

    // Sort: priority first, then non-applied, then applied last
    return items.sort((a, b) => {
      // Priority always comes first
      if (a.priority && !b.priority) return -1;
      if (b.priority && !a.priority) return 1;
      // Applied people go to the bottom (unless they have priority)
      if (a.applied && !b.applied) return 1;
      if (b.applied && !a.applied) return -1;
      return 0;
    });
  } catch (error) {
    console.error('Error fetching recommended people:', error);
    return [];
  }
}

export async function addPeopleTierMakerItems(items: { name: string; handle: string; category?: string; recommendedFollow?: boolean; tierList?: boolean; teamBuilder?: boolean; priority?: boolean; applied?: boolean }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // First, get existing data to find last row and check for duplicates
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'TierMaker List (People)'!A:B",
  });

  const existingRows = existingData.data.values || [];

  // Build set of existing handles (from column B - Twitter URLs)
  const existingHandles = new Set<string>();
  for (const row of existingRows) {
    const url = row[1]?.toLowerCase() || '';
    const handle = url.replace('https://x.com/', '').replace('https://twitter.com/', '').replace('@', '').trim();
    if (handle) existingHandles.add(handle.toLowerCase());
  }

  // Filter out duplicates
  const newItems = items.filter(item => !existingHandles.has(item.handle.toLowerCase()));

  if (newItems.length === 0) {
    console.log('addPeopleTierMakerItems - all items already exist, skipping');
    return;
  }

  const nextRow = existingRows.length + 1;
  console.log('addPeopleTierMakerItems - last row with data:', existingRows.length, 'next row:', nextRow);
  console.log('addPeopleTierMakerItems - filtered duplicates:', items.length - newItems.length);

  // Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Build Team
  const rows = newItems.map(item => [
    item.name,                                   // A: Name
    `https://x.com/${item.handle}`,              // B: Twitter link
    item.category || 'Community',                // C: Category
    '',                                          // D: Tier (unused)
    item.recommendedFollow ? 'TRUE' : '',        // E: Recommended Follow
    item.priority ? 'TRUE' : '',                 // F: Priority
    item.tierList ? 'TRUE' : '',                 // G: Tier List
    item.teamBuilder ? 'TRUE' : '',              // H: Build Team
  ]);

  console.log('addPeopleTierMakerItems - spreadsheetId:', spreadsheetId);
  console.log('addPeopleTierMakerItems - writing to row:', nextRow);
  console.log('addPeopleTierMakerItems - rows to write:', rows);

  try {
    const endRow = nextRow + rows.length - 1;
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'TierMaker List (People)'!A${nextRow}:H${endRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
    console.log('addPeopleTierMakerItems - result:', result.data);
  } catch (error) {
    console.error('addPeopleTierMakerItems - ERROR:', error);
    throw error;
  }
}

// Memecoins tier maker - read from TierMaker List (Projects) where category is Memecoins/Meme
export async function getMemecoinsTierMaker(): Promise<{ handle: string; name: string; category?: string }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (Projects)!A:E',
    });

    const rows = response.data.values || [];
    const items: { handle: string; name: string; category?: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A = display name, Column B = Twitter URL, Column C = category, Column D = priority, Column E = tier checkbox
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim()?.toLowerCase();
      const tierVal = row[4]?.toString().toUpperCase().trim();
      const showInTier = tierVal === 'TRUE' || tierVal === 'YES' || tierVal === '1' || tierVal === 'X' || tierVal === '✓';

      // Only include items with tier checkbox checked
      if (!showInTier) continue;

      // Only include items with Memecoins or Meme category (handles comma-separated categories too)
      const isMeme = category && (
        category === 'memecoins' ||
        category === 'meme' ||
        category === 'memecoin' ||
        category.includes('memecoin')
      );
      if (isMeme) {
        if (twitterUrl) {
          // Extract handle from URL
          let handle = twitterUrl;
          if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
            handle = handle.split('/').pop() || handle;
          }
          handle = handle.replace('@', '');
          if (handle) {
            items.push({
              handle,
              name: displayName || handle,
              category: 'Memecoins',
            });
          }
        }
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching memecoins tier maker items:', error);
    return [];
  }
}

// Migration: Shift old columns (D,E,F,G) to new columns (E,G,H,I) for People sheet
// Old: D=Recommended, E=Priority, F=Tier list, G=Applied
// New: E=Recommended, G=Priority, H=Tier list, I=Team builder
export async function migratePeopleColumns(): Promise<{ migrated: number }> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Read all data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'TierMaker List (People)'!A:G",
  });

  const rows = response.data.values || [];
  const newData: string[][] = [];

  // Skip header row, build all new rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) {
      newData.push(['', '', '', '', '', '']); // Empty row placeholder
      continue;
    }

    // Old values from D, E, F (indices 3, 4, 5)
    const oldRecommended = row[3] || '';
    const oldPriority = row[4] || '';
    const oldTierList = row[5] || '';

    // Write to new columns D, E, F, G, H, I
    // D=clear, E=recommended, F=clear, G=priority, H=tier, I=teambuilder
    newData.push([
      '', // D - clear
      oldRecommended, // E - recommended
      '', // F - clear
      oldPriority, // G - priority
      oldTierList, // H - tier list
      '', // I - team builder
    ]);
  }

  if (newData.length === 0) {
    return { migrated: 0 };
  }

  // Batch update all rows at once
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'TierMaker List (People)'!D2:I${newData.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newData,
    },
  });

  console.log(`Migrated ${newData.length} rows`);
  return { migrated: newData.length };
}
