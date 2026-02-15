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
      // Column A = display name, Column B = Twitter URL, Column C = category, Column D = priority, Column E = tier checkbox
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();
      const priVal = row[3]?.toString().toUpperCase().trim();
      const tierVal = row[4]?.toString().toUpperCase().trim();
      const priority = priVal === 'TRUE' || priVal === 'YES' || priVal === '1' || priVal === 'X' || priVal === '✓';
      const showInTier = tierVal === 'TRUE' || tierVal === 'YES' || tierVal === '1' || tierVal === 'X' || tierVal === '✓';

      // Only include items with tier checkbox checked
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

export async function addTierMakerItems(items: { handle: string; name?: string }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const rows = items.map(item => [
    `https://x.com/${item.handle}`,
    item.name || item.handle,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'TierMaker List (Projects)!A:B',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
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

// People tier maker functions
export async function getPeopleTierMakerItems(): Promise<{ handle: string; name?: string; category?: string; recommended?: boolean; priority?: boolean }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (People)!A:F',
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string; recommended?: boolean; priority?: boolean }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A = display name, Column B = Twitter URL, Column C = category, Column D = recommended checkbox, Column E = priority, Column F = tier checkbox
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();
      const recVal = row[3]?.toString().toUpperCase().trim();
      const priVal = row[4]?.toString().toUpperCase().trim();
      const tierVal = row[5]?.toString().toUpperCase().trim();
      const recommended = recVal === 'TRUE' || recVal === 'YES' || recVal === '1' || recVal === 'X' || recVal === '✓';
      const priority = priVal === 'TRUE' || priVal === 'YES' || priVal === '1' || priVal === 'X' || priVal === '✓';
      const showInTier = tierVal === 'TRUE' || tierVal === 'YES' || tierVal === '1' || tierVal === 'X' || tierVal === '✓';

      // Only include items with tier checkbox checked
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
            recommended,
            priority,
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

// Get only recommended people (checkbox checked), sorted by priority first
export async function getRecommendedPeople(): Promise<{ handle: string; name?: string; category?: string; priority?: boolean }[]> {
  const allPeople = await getPeopleTierMakerItems();
  return allPeople
    .filter(p => p.recommended)
    .sort((a, b) => {
      // Priority people first
      if (a.priority && !b.priority) return -1;
      if (b.priority && !a.priority) return 1;
      return 0;
    });
}

export async function addPeopleTierMakerItems(items: { name: string; handle: string; category?: string }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const rows = items.map(item => [
    item.name,
    `https://x.com/${item.handle}`,
    item.category || 'Community',
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'TierMaker List (People)!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
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
