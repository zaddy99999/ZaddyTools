import {
  getSheets,
  getSpreadsheetId,
  formatTimestamp,
  TABS,
} from './auth';

export interface SuggestionData {
  projectName: string;
  twitterUrl?: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  toolType?: string; // e.g., 'social-clips', 'tier-maker', 'game-guide', etc.
  source?: string; // e.g., 'tier-maker', 'recommended-follows', 'build-your-team'
}

export interface SuggestionRow {
  rowIndex: number;
  timestamp: string;
  projectName: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  toolType?: string;
  twitterLink?: string;
  source?: string;
  handle?: string;
  rejectionCount?: number;
  isExistingItem?: boolean;
}

export async function submitSuggestion(suggestion: SuggestionData): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const now = new Date();
  const timestamp = formatTimestamp(now);

  // Ensure the suggestions tab exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.SUGGESTIONS)) {
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: TABS.SUGGESTIONS },
            },
          }],
        },
      });

      // Get the new sheet ID
      const newSheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SUGGESTIONS}!A1:J1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'timestamp',
            'project_name',
            'giphy_url',
            'tiktok_url',
            'category',
            'notes',
            'status',
            'tool_type',
            'twitter_link',
            'source',
          ]],
        },
      });

      // Add dropdown validation for tool_type column (H) and status column (G) if we have the sheet ID
      if (newSheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              // Status dropdown (column G)
              {
                setDataValidation: {
                  range: {
                    sheetId: newSheetId,
                    startRowIndex: 1,
                    startColumnIndex: 6, // Column G (0-indexed)
                    endColumnIndex: 7,
                  },
                  rule: {
                    condition: {
                      type: 'ONE_OF_LIST',
                      values: [
                        { userEnteredValue: 'pending' },
                        { userEnteredValue: 'approved' },
                        { userEnteredValue: 'rejected' },
                      ],
                    },
                    showCustomUi: true,
                    strict: true,
                  },
                },
              },
              // Tool type dropdown (column H)
              {
                setDataValidation: {
                  range: {
                    sheetId: newSheetId,
                    startRowIndex: 1,
                    startColumnIndex: 7, // Column H (0-indexed)
                    endColumnIndex: 8,
                  },
                  rule: {
                    condition: {
                      type: 'ONE_OF_LIST',
                      values: [
                        { userEnteredValue: 'recommended-follows' },
                        { userEnteredValue: 'tier-maker' },
                        { userEnteredValue: 'build-your-team' },
                        { userEnteredValue: 'social-clips' },
                        { userEnteredValue: 'game-guide' },
                        { userEnteredValue: 'other' },
                      ],
                    },
                    showCustomUi: true,
                    strict: false,
                  },
                },
              },
              // Conditional formatting for status - pending (yellow)
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [{ sheetId: newSheetId, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 }],
                    booleanRule: {
                      condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'pending' }] },
                      format: { backgroundColor: { red: 1, green: 0.85, blue: 0.4 } },
                    },
                  },
                  index: 0,
                },
              },
              // Conditional formatting for status - approved (green)
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [{ sheetId: newSheetId, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 }],
                    booleanRule: {
                      condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'approved' }] },
                      format: { backgroundColor: { red: 0.7, green: 0.93, blue: 0.7 } },
                    },
                  },
                  index: 1,
                },
              },
              // Conditional formatting for status - rejected (red)
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [{ sheetId: newSheetId, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 }],
                    booleanRule: {
                      condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'rejected' }] },
                      format: { backgroundColor: { red: 0.96, green: 0.7, blue: 0.7 } },
                    },
                  },
                  index: 2,
                },
              },
            ],
          },
        });
      }
    }
  } catch (error) {
    console.error('Error ensuring suggestions tab exists:', error);
  }

  // Append the suggestion
  // Extract handle and build twitter link from provided URL or projectName
  let twitterLink = '';
  if (suggestion.twitterUrl) {
    const twitterInput = suggestion.twitterUrl.trim();
    if (twitterInput.includes('x.com/') || twitterInput.includes('twitter.com/')) {
      // Full URL provided
      twitterLink = twitterInput.replace('twitter.com', 'x.com');
    } else {
      // Handle provided
      const handle = twitterInput.replace(/^@/, '');
      twitterLink = `https://x.com/${handle}`;
    }
  } else {
    const cleanHandle = suggestion.projectName.replace(/^@/, '');
    twitterLink = `https://x.com/${cleanHandle}`;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        timestamp,
        suggestion.projectName,
        suggestion.giphyUrl || '',
        suggestion.tiktokUrl || '',
        suggestion.category,
        suggestion.notes || '',
        'pending',
        suggestion.toolType || 'social-clips',
        twitterLink,
        suggestion.source || '',
      ]],
    },
  });
}

export async function getSuggestions(status?: 'pending' | 'approved' | 'rejected', existingHandles?: Set<string>): Promise<SuggestionRow[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.SUGGESTIONS}!A:J`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    // Count rejections per handle (across all suggestions)
    const rejectionCounts = new Map<string, number>();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const projectName = row[1] || '';
      const rowStatus = row[6] || 'pending';
      const handle = projectName.replace(/^@/, '').toLowerCase();

      if (rowStatus === 'rejected' && handle) {
        rejectionCounts.set(handle, (rejectionCounts.get(handle) || 0) + 1);
      }
    }

    const suggestions: SuggestionRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowStatus = (row[6] || 'pending') as 'pending' | 'approved' | 'rejected';

      // Filter by status if specified
      if (status && rowStatus !== status) continue;

      const projectName = row[1] || '';
      const handle = projectName.replace(/^@/, '').toLowerCase();
      const rejectionCount = rejectionCounts.get(handle) || 0;
      const isExistingItem = existingHandles ? existingHandles.has(handle) : undefined;

      suggestions.push({
        rowIndex: i + 1, // 1-indexed for sheets
        timestamp: row[0] || '',
        projectName: projectName,
        giphyUrl: row[2] || undefined,
        tiktokUrl: row[3] || undefined,
        category: (row[4] || 'web3') as 'web2' | 'web3',
        notes: row[5] || undefined,
        status: rowStatus,
        toolType: row[7] || 'social-clips',
        twitterLink: row[8] || `https://x.com/${handle}`,
        source: row[9] || undefined,
        handle,
        rejectionCount,
        isExistingItem,
      });
    }

    // Sort by timestamp descending (newest first)
    const sorted = suggestions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Remove duplicates - keep only the most recent per handle
    const seen = new Set<string>();
    const deduplicated = sorted.filter(s => {
      const key = s.handle?.toLowerCase() || s.projectName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

// Get all existing handles from tier maker lists
export async function getExistingHandles(): Promise<Set<string>> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const handles = new Set<string>();

  try {
    // Get projects tier maker handles
    const projectsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (Projects)!B:B',
    });

    const projectRows = projectsResponse.data.values || [];
    for (let i = 1; i < projectRows.length; i++) {
      const url = projectRows[i]?.[0]?.trim();
      if (url) {
        let handle = url;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '').replace(/[?#].*$/, '').toLowerCase();
        if (handle) handles.add(handle);
      }
    }

    // Get people tier maker handles
    const peopleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (People)!B:B',
    });

    const peopleRows = peopleResponse.data.values || [];
    for (let i = 1; i < peopleRows.length; i++) {
      const url = peopleRows[i]?.[0]?.trim();
      if (url) {
        let handle = url;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '').replace(/[?#].*$/, '').toLowerCase();
        if (handle) handles.add(handle);
      }
    }
  } catch (error) {
    console.error('Error fetching existing handles:', error);
  }

  return handles;
}

// Check if a handle has already been suggested (regardless of status)
export async function isAlreadySuggested(handle: string): Promise<boolean> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const normalizedHandle = handle.replace(/^@/, '').toLowerCase();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.SUGGESTIONS}!B:B`, // project_name column
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const projectName = rows[i]?.[0] || '';
      const existingHandle = projectName.replace(/^@/, '').toLowerCase();
      if (existingHandle === normalizedHandle) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking if already suggested:', error);
    return false;
  }
}

export async function updateSuggestionStatus(
  rowIndex: number,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!G${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status]],
    },
  });
}

// Apply dropdown validation to tool_type column and add twitter_link column to existing sheet
export async function applyToolTypeDropdown(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get the sheet ID for the suggestions tab
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const suggestionsSheet = spreadsheet.data.sheets?.find(
    s => s.properties?.title === TABS.SUGGESTIONS
  );

  if (!suggestionsSheet?.properties?.sheetId) {
    throw new Error('Suggestions sheet not found');
  }

  const sheetId = suggestionsSheet.properties.sheetId;

  // Add twitter_link header to column I if not present
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!I1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['twitter_link']],
    },
  });

  // Apply dropdown validation to column H (tool_type)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: 1, // Skip header row
            startColumnIndex: 7, // Column H (0-indexed)
            endColumnIndex: 8,
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'recommended-follows' },
                { userEnteredValue: 'tier-maker' },
                { userEnteredValue: 'build-your-team' },
                { userEnteredValue: 'social-clips' },
                { userEnteredValue: 'game-guide' },
                { userEnteredValue: 'other' },
              ],
            },
            showCustomUi: true,
            strict: false,
          },
        },
      }],
    },
  });
}
