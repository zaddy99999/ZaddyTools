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
      range: 'TierMaker List (Projects)!A:F',
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

  // Find first empty row in column A (not just last row with any data)
  let nextRow = 2; // Start after header
  for (let i = 1; i < existingRows.length; i++) {
    const cellA = existingRows[i]?.[0];
    if (!cellA || cellA.toString().trim() === '') {
      nextRow = i + 1;
      break;
    }
    nextRow = i + 2; // Move to next row after this one
  }
  // If no empty row found in existing data, use length + 1
  if (nextRow <= existingRows.length) {
    console.log('addTierMakerItems - found empty row at:', nextRow);
  } else {
    nextRow = existingRows.length + 1;
  }
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
    const endRow = nextRow + rows.length - 1;
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'TierMaker List (Projects)'!A${nextRow}:H${endRow}`,
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
      range: `'TierMaker List (Projects)'!A${rowIndex}:H${rowIndex}`,
    });
    return true;
  }

  return false;
}

// People tier maker functions - uses column G for tier list checkbox
// Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Team Builder
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
      // Column A=Name, B=Twitter, C=Category, D=Tier, E=Recommended, F=Priority, G=Tier List, H=Team Builder
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
// Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Team Builder
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

    const seenHandles = new Set<string>();

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

        // Skip duplicates (case-insensitive)
        const handleLower = handle.toLowerCase();
        if (handle && !seenHandles.has(handleLower)) {
          seenHandles.add(handleLower);
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

    // Separate into priority and non-priority groups
    const priorityItems = items.filter(item => item.priority);
    const nonPriorityItems = items.filter(item => !item.priority);

    // Shuffle function (Fisher-Yates)
    const shuffle = <T>(arr: T[]): T[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Priority in spreadsheet order, non-priority randomized
    return [...priorityItems, ...shuffle(nonPriorityItems)];
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

  // Find first empty row in column A (not just last row with any data)
  let nextRow = 2; // Start after header
  for (let i = 1; i < existingRows.length; i++) {
    const cellA = existingRows[i]?.[0];
    if (!cellA || cellA.toString().trim() === '') {
      nextRow = i + 1;
      break;
    }
    nextRow = i + 2; // Move to next row after this one
  }
  // If no empty row found in existing data, use length + 1
  if (nextRow <= existingRows.length) {
    console.log('addPeopleTierMakerItems - found empty row at:', nextRow);
  } else {
    nextRow = existingRows.length + 1;
  }
  console.log('addPeopleTierMakerItems - last row with data:', existingRows.length, 'next row:', nextRow);
  console.log('addPeopleTierMakerItems - filtered duplicates:', items.length - newItems.length);

  // Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Team Builder
  const rows = newItems.map(item => [
    item.name,                                   // A: Name
    `https://x.com/${item.handle}`,              // B: Twitter link
    item.category || 'Community',                // C: Category
    '',                                          // D: Tier (unused)
    item.recommendedFollow ? 'TRUE' : '',        // E: Recommended Follow
    item.priority ? 'TRUE' : '',                 // F: Priority
    item.tierList ? 'TRUE' : '',                 // G: Tier List
    item.teamBuilder ? 'TRUE' : '',              // H: Team Builder
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

// Migration: Shift old columns (D,E,F,G) to new columns (E,F,G,H) for People sheet
// Old: D=Recommended, E=Priority, F=Tier list, G=Applied
// New: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended, F=Priority, G=Tier List, H=Team Builder
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

// Fix the People sheet header row to match the correct column layout
export async function fixPeopleSheetHeaders(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Columns: A=Name, B=Twitter, C=Category, D=Tier, E=Recommended Follow, F=Priority, G=Tier List, H=Team Builder
  const headers = [
    'Name',
    'Twitter',
    'Category',
    'Tier',
    'Recommended Follow',
    'Priority',
    'Tier List',
    'Team Builder',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'TierMaker List (People)'!A1:H1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers],
    },
  });

  console.log('People sheet headers updated');
}

// Shift data from old 9-column layout (with empty F) to new 8-column layout
export async function shiftPeopleColumns(): Promise<{ shifted: number }> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Read all data (columns A-I, the old layout)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'TierMaker List (People)'!A:I",
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { shifted: 0 };
  }

  // Build new data: skip column F (index 5), shift G->F, H->G, I->H
  const newData: string[][] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    newData.push([
      row[0] || '',  // A: Name
      row[1] || '',  // B: Twitter
      row[2] || '',  // C: Category
      row[3] || '',  // D: Tier
      row[4] || '',  // E: Recommended Follow
      row[6] || '',  // F: Priority (was G)
      row[7] || '',  // G: Tier List (was H)
      row[8] || '',  // H: Team Builder (was I)
    ]);
  }

  if (newData.length === 0) {
    return { shifted: 0 };
  }

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'TierMaker List (People)'!A2:H${newData.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newData,
    },
  });

  // Clear old column I
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "'TierMaker List (People)'!I:I",
  });

  console.log(`Shifted ${newData.length} rows`);
  return { shifted: newData.length };
}
