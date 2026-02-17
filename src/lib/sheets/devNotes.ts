import {
  getSheets,
  getSpreadsheetId,
  formatTimestamp,
  TABS,
} from './auth';

export interface DevNote {
  id: number; // row index
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'improvement' | 'refactor';
  status: 'pending' | 'approved';
  createdAt: string;
}

const DEV_NOTES_TAB = 'Developer Notes';

// Ensure the tab exists with proper headers
async function ensureDevNotesTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(DEV_NOTES_TAB)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: DEV_NOTES_TAB },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${DEV_NOTES_TAB}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['date', 'title', 'description', 'type', 'status', 'created_at']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring dev notes tab:', error);
  }
}

export async function getDevNotes(status?: 'pending' | 'approved'): Promise<DevNote[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await ensureDevNotesTab();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${DEV_NOTES_TAB}!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const notes: DevNote[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const noteStatus = (row[4] || 'pending') as 'pending' | 'approved';

      // Filter by status if specified
      if (status && noteStatus !== status) continue;

      notes.push({
        id: i + 1, // 1-indexed row number
        date: row[0] || '',
        title: row[1] || '',
        description: row[2] || '',
        type: (row[3] || 'feature') as DevNote['type'],
        status: noteStatus,
        createdAt: row[5] || '',
      });
    }

    // Sort by date descending, then by created_at descending
    return notes.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error('Error fetching dev notes:', error);
    return [];
  }
}

export async function addDevNote(note: Omit<DevNote, 'id' | 'createdAt'>): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await ensureDevNotesTab();

  const now = new Date();
  const timestamp = formatTimestamp(now);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${DEV_NOTES_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        note.date,
        note.title,
        note.description,
        note.type,
        note.status,
        timestamp,
      ]],
    },
  });
}

export async function updateDevNote(
  rowIndex: number,
  updates: Partial<Pick<DevNote, 'date' | 'title' | 'description' | 'type' | 'status'>>
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get current row data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${DEV_NOTES_TAB}!A${rowIndex}:F${rowIndex}`,
  });

  const currentRow = response.data.values?.[0] || [];

  // Merge updates
  const updatedRow = [
    updates.date ?? currentRow[0] ?? '',
    updates.title ?? currentRow[1] ?? '',
    updates.description ?? currentRow[2] ?? '',
    updates.type ?? currentRow[3] ?? 'feature',
    updates.status ?? currentRow[4] ?? 'pending',
    currentRow[5] || '', // keep original created_at
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${DEV_NOTES_TAB}!A${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });
}

export async function deleteDevNote(rowIndex: number): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${DEV_NOTES_TAB}!A${rowIndex}:F${rowIndex}`,
  });
}
