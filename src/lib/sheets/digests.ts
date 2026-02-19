import {
  getSheets,
  getSpreadsheetIdForTab,
  TABS,
} from './auth';

// Digest types and functions
export interface DigestData {
  id: string; // e.g., "daily-2024-02-11-08" or "weekly-2024-02-11"
  mode: 'daily' | 'weekly';
  dateLabel: string;
  summary?: string;
  summaryUrl?: string;
  sections: { content: string; url?: string; category?: string; featured?: boolean }[];
  generatedAt: string;
  expiresAt: string; // When this digest should be regenerated
}

export async function saveDigest(digest: DigestData): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.DIGESTS);

  // Check if digest already exists, update or append
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.DIGESTS}!A:G`,
  });

  const rows = existing.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === digest.id) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  const sectionsJson = JSON.stringify({
    summaryUrl: digest.summaryUrl,
    items: digest.sections.map(s => ({
      content: s.content,
      url: s.url,
      category: s.category,
      featured: s.featured,
    })),
  });

  const rowData = [
    digest.id,
    digest.mode,
    digest.dateLabel,
    digest.summary,
    sectionsJson,
    digest.generatedAt,
    digest.expiresAt,
  ];

  if (rowIndex > 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A${rowIndex}:G${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowData] },
    });
  }
}

export async function getDigest(id: string): Promise<DigestData | null> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.DIGESTS);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const sectionsData = JSON.parse(rows[i][4] || '{}');
        // Handle both old array format and new object format
        const items = Array.isArray(sectionsData) ? sectionsData : (sectionsData.items || []);
        const summaryUrl = Array.isArray(sectionsData) ? sectionsData[0]?.summaryUrl : sectionsData.summaryUrl;
        return {
          id: rows[i][0],
          mode: rows[i][1] as 'daily' | 'weekly',
          dateLabel: rows[i][2],
          summary: rows[i][3],
          summaryUrl,
          sections: items.map((s: { content: string; url?: string; category?: string; featured?: boolean }) => ({
            content: s.content,
            url: s.url,
            category: s.category,
            featured: s.featured,
          })),
          generatedAt: rows[i][5],
          expiresAt: rows[i][6],
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching digest:', error);
    return null;
  }
}

export async function getLatestDigests(mode: 'daily' | 'weekly', limit = 5): Promise<DigestData[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.DIGESTS);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
    });

    const rows = response.data.values || [];
    const digests: DigestData[] = [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === mode) {
        const sectionsData = JSON.parse(rows[i][4] || '{}');
        const items = Array.isArray(sectionsData) ? sectionsData : (sectionsData.items || []);
        const summaryUrl = Array.isArray(sectionsData) ? sectionsData[0]?.summaryUrl : sectionsData.summaryUrl;
        digests.push({
          id: rows[i][0],
          mode: rows[i][1] as 'daily' | 'weekly',
          dateLabel: rows[i][2],
          summary: rows[i][3],
          summaryUrl,
          sections: items.map((s: { content: string; url?: string; category?: string; featured?: boolean }) => ({
            content: s.content,
            url: s.url,
            category: s.category,
            featured: s.featured,
          })),
          generatedAt: rows[i][5],
          expiresAt: rows[i][6],
        });
      }
    }

    // Sort by generated time descending and limit
    return digests
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching digests:', error);
    return [];
  }
}
