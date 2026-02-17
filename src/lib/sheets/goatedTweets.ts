import { getSheets, getSpreadsheetId } from './auth';

export interface GoatedTweet {
  url: string;
  handle: string;
  text?: string;
  description?: string;
  addedAt: string;
}

/**
 * Fetches goated tweets from the Google Sheet
 * Sheet tab: "goated tweets"
 * Columns: URL | Handle | Tweet Text | Description | Added At
 */
export async function getGoatedTweets(): Promise<GoatedTweet[]> {
  try {
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'goated tweets'!A:E",
    });

    const rows = response.data.values || [];

    // Skip header row
    if (rows.length <= 1) {
      return [];
    }

    return rows.slice(1).map((row) => {
      const url = row[0] || '';
      // Extract handle from URL if not provided
      let handle = row[1] || '';
      if (!handle && url) {
        const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
        if (match) {
          handle = match[1];
        }
      }

      return {
        url,
        handle,
        text: row[2] || '',
        description: row[3] || '',
        addedAt: row[4] || new Date().toISOString(),
      };
    }).filter(tweet => tweet.url); // Only return tweets with valid URLs
  } catch (error) {
    console.error('Error fetching goated tweets:', error);
    return [];
  }
}

/**
 * Adds a new goated tweet to the sheet
 */
export async function addGoatedTweet(tweet: { url: string; handle?: string; description?: string }): Promise<boolean> {
  try {
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();

    // Extract handle from URL if not provided
    let handle = tweet.handle || '';
    if (!handle && tweet.url) {
      const match = tweet.url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
      if (match) {
        handle = match[1];
      }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'goated tweets'!A:D",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          tweet.url,
          handle,
          tweet.description || '',
          new Date().toISOString(),
        ]],
      },
    });

    return true;
  } catch (error) {
    console.error('Error adding goated tweet:', error);
    return false;
  }
}
