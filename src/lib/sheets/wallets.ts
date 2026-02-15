import {
  getSheets,
  getSpreadsheetId,
  TABS,
} from './auth';

// ==================== TOP WALLETS ====================

export interface TopWallet {
  id: string;
  wallet: string;
  name: string;
  tier: number;
  tierV2: number;
  badges: number;
  streaming: boolean;
  pfp?: string;
  txs?: number;
}

export async function writeTopWallets(obsidian: TopWallet[], diamond: TopWallet[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Ensure tab exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.TOP_WALLETS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.TOP_WALLETS } },
          }],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring TopWallets tab:', error);
  }

  // Build all rows - header + all wallets
  const header = ['tier_name', 'id', 'wallet', 'name', 'tier', 'tierV2', 'badges', 'streaming', 'pfp', 'txs', 'portal_link'];

  const obsidianRows = obsidian.map(w => [
    'Obsidian',
    w.id,
    w.wallet,
    w.name,
    w.tier,
    w.tierV2,
    w.badges,
    w.streaming ? 'yes' : 'no',
    w.pfp || '',
    w.txs || '',
    `https://portal.abs.xyz/profile/${w.wallet}`,
  ]);

  const diamondRows = diamond.map(w => [
    'Diamond',
    w.id,
    w.wallet,
    w.name,
    w.tier,
    w.tierV2,
    w.badges,
    w.streaming ? 'yes' : 'no',
    w.pfp || '',
    w.txs || '',
    `https://portal.abs.xyz/profile/${w.wallet}`,
  ]);

  const allRows = [header, ...obsidianRows, ...diamondRows];

  // Single write call - clear and update
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.TOP_WALLETS}!A:K`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.TOP_WALLETS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: allRows,
    },
  });
}
