import { google, sheets_v4 } from 'googleapis';

// Two spreadsheets:
// 1. Main (human-editable): Curated data that humans might edit (whitelists, game docs, tier makers, etc.)
// 2. Bot Data: Automated logs, metrics, digests that are hard to read
export const SPREADSHEET_IDS = {
  MAIN: '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE',      // Human-editable curated data
  BOT_DATA: '1V9F04yo3At3g-Vr7_jT49pFc4b083UiWOFVwQF2xpUk',  // Bot logs and metrics
};

export const TABS = {
  // Bot data tabs (go to BOT_DATA spreadsheet)
  DAILY_LOG: 'daily_log',
  LATEST: 'latest',
  METRICS: 'metrics',
  DIGESTS: 'digests',
  OPENSEA_HISTORY: 'opensea_history',
  // Human-editable tabs (stay on MAIN spreadsheet)
  SUGGESTIONS: 'suggestions',
  GAME_GUIDE_DOCS: 'GameGuideDocs',
  GAME_GUIDE_FAQ: 'GameGuideFAQ',
  LORE_LINKS: 'LoreLinks',
  QUESTIONS: 'Questions',
  TOP_WALLETS: 'TopWallets',
};

// Which tabs go to which spreadsheet
export const BOT_DATA_TABS = new Set([TABS.DAILY_LOG, TABS.LATEST, TABS.METRICS, TABS.DIGESTS, TABS.OPENSEA_HISTORY]);

export function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export function getSheets(): sheets_v4.Sheets {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export function getSpreadsheetId(): string {
  // Default to main spreadsheet (for backwards compatibility)
  return SPREADSHEET_IDS.MAIN;
}

export function getSpreadsheetIdForTab(tab: string): string {
  // Route bot data tabs to the bot data spreadsheet
  if (BOT_DATA_TABS.has(tab)) {
    return SPREADSHEET_IDS.BOT_DATA;
  }
  return SPREADSHEET_IDS.MAIN;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}
