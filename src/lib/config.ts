import { ChannelConfig, ChannelCategory } from './types';
import { google } from 'googleapis';

interface ChannelEntry {
  url: string;
  category?: ChannelCategory;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function getChannelUrlsFromSheet(): Promise<ChannelConfig[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // First, get all sheet names to find the right one
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    // Try to find a channels tab, or use the first sheet
    let channelsTab = sheetNames.find(name =>
      name?.toLowerCase().includes('channel') ||
      name?.toLowerCase() === 'sheet1' ||
      name?.toLowerCase() === 'input'
    ) || sheetNames[0] || 'Sheet1';

    console.log(`Reading channels from tab: ${channelsTab}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${channelsTab}'!A:E`, // Expecting: Name, URL, Category, Abstract, TikTok
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      console.log('No channels found in sheet');
      return [];
    }

    // Skip header row, parse channels
    const channels: ChannelConfig[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const url = row[1]?.trim(); // Column B = URL
      const category = (row[2]?.trim()?.toLowerCase() as ChannelCategory) || 'web2'; // Column C = Category
      const abstractValue = row[3]?.trim()?.toLowerCase(); // Column D = Abstract (yes/no)
      const isAbstract = abstractValue === 'yes' || abstractValue === 'true' || abstractValue === '1';
      const tiktokUrl = row[4]?.trim(); // Column E = TikTok URL

      if (url && url.startsWith('http')) {
        channels.push({
          url,
          rank: channels.length + 1,
          category: category === 'web3' ? 'web3' : 'web2',
          isAbstract,
          tiktokUrl: tiktokUrl?.startsWith('http') ? tiktokUrl : undefined,
        });
      }
    }

    console.log(`Loaded ${channels.length} channels from Google Sheet`);
    return channels;
  } catch (error) {
    console.error('Failed to fetch channels from sheet:', error);
    throw error;
  }
}

// Legacy sync function for backwards compatibility
export function getChannelUrls(categoryFilter?: ChannelCategory[]): ChannelConfig[] {
  // This is now a fallback - prefer getChannelUrlsFromSheet
  console.warn('Using legacy getChannelUrls - channels should be loaded from sheet');
  return [];
}

export function validateCronSecret(providedSecret: string | null): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    // If no secret configured, only allow in development
    return process.env.NODE_ENV === 'development';
  }
  return providedSecret === expectedSecret;
}
