import {
  getSheets,
  SPREADSHEET_IDS,
  TABS,
  formatDate,
  formatTimestamp,
} from './auth';

export interface OpenSeaSnapshot {
  slug: string;
  name: string;
  floorPrice: number;
  floorPriceSymbol: string;
  volume24h: number;
  owners: number;
  marketCap: number;
  chain: string;
}

export interface OpenSeaHistoryRecord extends OpenSeaSnapshot {
  date: string;
  timestamp: string;
}

const OPENSEA_HISTORY_TAB = TABS.OPENSEA_HISTORY;

// Save a batch of OpenSea snapshots
export async function saveOpenSeaSnapshots(snapshots: OpenSeaSnapshot[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = SPREADSHEET_IDS.BOT_DATA;


  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);

  const rows = snapshots.map(snapshot => [
    date,
    timestamp,
    snapshot.slug,
    snapshot.name,
    snapshot.floorPrice,
    snapshot.floorPriceSymbol,
    snapshot.volume24h,
    snapshot.owners,
    snapshot.marketCap,
    snapshot.chain,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${OPENSEA_HISTORY_TAB}!A:J`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });

  // Apply dropdown + conditional formatting to the chain column (J)
  await applyChainColumnFormatting(sheets, spreadsheetId);
}

// Set up dropdown validation and color-coded conditional formatting on the chain column (J = index 9)
async function applyChainColumnFormatting(
  sheets: ReturnType<typeof getSheets>,
  spreadsheetId: string
): Promise<void> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === OPENSEA_HISTORY_TAB);
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === undefined) return;

    const chainColIndex = 9; // Column J (0-indexed)

    // Clear existing conditional format rules for column J, then re-add them
    const existingRules = sheet?.conditionalFormats || [];
    const deleteRequests = existingRules
      .map((_, idx) => idx)
      .reverse()
      .filter(idx => {
        const ranges = existingRules[idx]?.ranges || [];
        return ranges.some(r => r.startColumnIndex === chainColIndex && r.endColumnIndex === chainColIndex + 1);
      })
      .map(idx => ({ deleteConditionalFormatRule: { sheetId, index: idx } }));

    const columnRange = {
      sheetId,
      startRowIndex: 1, // Skip header
      startColumnIndex: chainColIndex,
      endColumnIndex: chainColIndex + 1,
    };

    const requests = [
      ...deleteRequests,
      // Data validation: dropdown with chain options
      {
        setDataValidation: {
          range: columnRange,
          rule: {
            condition: {
              type: 'ONE_OF_LIST' as const,
              values: [
                { userEnteredValue: 'ethereum' },
                { userEnteredValue: 'abstract' },
                { userEnteredValue: 'matic' },
                { userEnteredValue: 'solana' },
              ],
            },
            showCustomUi: true,
            strict: false,
          },
        },
      },
      // Conditional format: abstract = purple background
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [columnRange],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ' as const,
                values: [{ userEnteredValue: 'abstract' }],
              },
              format: {
                backgroundColor: { red: 0.7, green: 0.5, blue: 0.9, alpha: 1 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1, alpha: 1 } },
              },
            },
          },
          index: 0,
        },
      },
      // Conditional format: ethereum = blue background
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [columnRange],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ' as const,
                values: [{ userEnteredValue: 'ethereum' }],
              },
              format: {
                backgroundColor: { red: 0.35, green: 0.55, blue: 0.85, alpha: 1 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1, alpha: 1 } },
              },
            },
          },
          index: 1,
        },
      },
      // Conditional format: matic = purple-ish
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [columnRange],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ' as const,
                values: [{ userEnteredValue: 'matic' }],
              },
              format: {
                backgroundColor: { red: 0.5, green: 0.3, blue: 0.75, alpha: 1 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1, alpha: 1 } },
              },
            },
          },
          index: 2,
        },
      },
      // Conditional format: solana = green
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [columnRange],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ' as const,
                values: [{ userEnteredValue: 'solana' }],
              },
              format: {
                backgroundColor: { red: 0.0, green: 0.7, blue: 0.55, alpha: 1 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1, alpha: 1 } },
              },
            },
          },
          index: 3,
        },
      },
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  } catch (error) {
    // Non-fatal — data is already saved, formatting is cosmetic
    console.warn('Failed to apply chain column formatting:', error);
  }
}

// Get yesterday's floor prices for calculating 24h change
export async function getYesterdayFloorPrices(): Promise<Map<string, number>> {
  const sheets = getSheets();
  const spreadsheetId = SPREADSHEET_IDS.BOT_DATA;


  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${OPENSEA_HISTORY_TAB}!A:E`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return new Map();

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // Also check 2 days ago in case yesterday's scrape failed
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = formatDate(twoDaysAgo);

    const floorPrices = new Map<string, number>();

    // Go through rows (newest first would be ideal, but we'll just get the most recent per slug)
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const date = row[0];
      const slug = row[2];
      const floorPrice = parseFloat(row[4]) || 0;

      // Only look at yesterday or 2 days ago
      if (date !== yesterdayStr && date !== twoDaysAgoStr) continue;

      // Only store if we don't already have this slug (so we get the most recent)
      if (!floorPrices.has(slug)) {
        floorPrices.set(slug, floorPrice);
      }
    }

    return floorPrices;
  } catch (error) {
    console.error('Error fetching yesterday floor prices:', error);
    return new Map();
  }
}

// Clean up old data (keep only last 30 days)
export async function cleanupOldOpenSeaHistory(): Promise<number> {
  const sheets = getSheets();
  const spreadsheetId = SPREADSHEET_IDS.BOT_DATA;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${OPENSEA_HISTORY_TAB}!A:A`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return 0;

    // Calculate cutoff date (30 days ago)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = formatDate(cutoff);

    // Find rows to delete (older than cutoff)
    const rowsToDelete: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const date = rows[i][0];
      if (date && date < cutoffStr) {
        rowsToDelete.push(i + 1); // 1-indexed for sheets
      }
    }

    if (rowsToDelete.length === 0) return 0;

    // Get sheet ID for batch update
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === OPENSEA_HISTORY_TAB);
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) return 0;

    // Group consecutive rows into contiguous ranges for efficient deletion
    // rowsToDelete is sorted ascending (1-indexed sheet rows)
    const ranges: { start: number; end: number }[] = [];
    let rangeStart = rowsToDelete[0];
    let rangeEnd = rowsToDelete[0];

    for (let i = 1; i < rowsToDelete.length; i++) {
      if (rowsToDelete[i] === rangeEnd + 1) {
        rangeEnd = rowsToDelete[i];
      } else {
        ranges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = rowsToDelete[i];
        rangeEnd = rowsToDelete[i];
      }
    }
    ranges.push({ start: rangeStart, end: rangeEnd });

    // Delete ranges in reverse order to maintain correct indices
    const deleteRequests = ranges.reverse().map(range => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: range.start - 1, // convert to 0-indexed
          endIndex: range.end,          // endIndex is exclusive in Sheets API
        },
      },
    }));

    // Send all deletes in a single batchUpdate to avoid index shifting between calls
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: deleteRequests,
      },
    });

    return rowsToDelete.length;
  } catch (error) {
    console.error('Error cleaning up old opensea history:', error);
    return 0;
  }
}
