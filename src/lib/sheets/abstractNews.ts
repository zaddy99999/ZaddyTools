import { getSheets, SPREADSHEET_IDS } from './auth';

export interface AbstractNewsItem {
  id: string;
  content: string;       // Tweet content or news text
  source: string;        // @handle or source name
  sourceUrl?: string;    // Link to original tweet/post
  date: string;          // Date posted
  category?: string;     // Official, Community, News, etc.
  summary?: string;      // AI-generated summary (if available)
}

const TAB_NAME = 'abstract news';

export async function getAbstractNews(): Promise<AbstractNewsItem[]> {
  try {
    const sheets = getSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.MAIN,
      range: `'${TAB_NAME}'!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Only header or empty

    // Skip header row, map to objects
    // Expected columns: Content, Source, SourceURL, Date, Category, Summary
    return rows.slice(1).map((row, idx) => ({
      id: `abstract-sheet-${idx}`,
      content: row[0] || '',
      source: row[1] || 'Abstract',
      sourceUrl: row[2] || '',
      date: row[3] || new Date().toISOString(),
      category: row[4] || 'News',
      summary: row[5] || '',
    })).filter(item => item.content.trim() !== '');
  } catch (error) {
    console.error('Error fetching abstract news from sheet:', error);
    return [];
  }
}

export async function addAbstractNewsItem(item: Omit<AbstractNewsItem, 'id'>): Promise<boolean> {
  try {
    const sheets = getSheets();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.MAIN,
      range: `'${TAB_NAME}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          item.content,
          item.source,
          item.sourceUrl || '',
          item.date,
          item.category || 'News',
          item.summary || '',
        ]],
      },
    });

    return true;
  } catch (error) {
    console.error('Error adding abstract news item:', error);
    return false;
  }
}
