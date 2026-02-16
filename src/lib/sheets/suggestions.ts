import {
  getSheets,
  getSpreadsheetId,
  formatTimestamp,
  TABS,
} from './auth';

export interface SuggestionData {
  projectName: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  toolType?: string; // e.g., 'social-clips', 'tier-maker', 'game-guide', etc.
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
        range: `${TABS.SUGGESTIONS}!A1:I1`,
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
          ]],
        },
      });

      // Add dropdown validation for tool_type column (H) if we have the sheet ID
      if (newSheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
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
            }],
          },
        });
      }
    }
  } catch (error) {
    console.error('Error ensuring suggestions tab exists:', error);
  }

  // Append the suggestion
  const cleanHandle = suggestion.projectName.replace(/^@/, '');
  const twitterLink = `https://x.com/${cleanHandle}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!A:I`,
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
      ]],
    },
  });
}

export async function getSuggestions(status?: 'pending' | 'approved' | 'rejected'): Promise<SuggestionRow[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.SUGGESTIONS}!A:I`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const suggestions: SuggestionRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowStatus = (row[6] || 'pending') as 'pending' | 'approved' | 'rejected';

      // Filter by status if specified
      if (status && rowStatus !== status) continue;

      suggestions.push({
        rowIndex: i + 1, // 1-indexed for sheets
        timestamp: row[0] || '',
        projectName: row[1] || '',
        giphyUrl: row[2] || undefined,
        tiktokUrl: row[3] || undefined,
        category: (row[4] || 'web3') as 'web2' | 'web3',
        notes: row[5] || undefined,
        status: rowStatus,
        toolType: row[7] || 'social-clips',
        twitterLink: row[8] || undefined,
      });
    }

    // Sort by timestamp descending (newest first)
    return suggestions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
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
