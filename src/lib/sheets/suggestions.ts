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
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: TABS.SUGGESTIONS },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SUGGESTIONS}!A1:H1`,
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
          ]],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring suggestions tab exists:', error);
  }

  // Append the suggestion
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!A:H`,
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
      range: `${TABS.SUGGESTIONS}!A:H`,
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
