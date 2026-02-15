const { google } = require('googleapis');
const fs = require('fs');

const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Update NFT_Whitelist - add Contract column after Slug
  // Current: Slug | Name | Enabled
  // New: Slug | Contract | Name | Enabled

  console.log('Updating NFT_Whitelist...');

  // Read current data
  const nftResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A:C',
  });

  const nftRows = nftResponse.data.values || [];

  // Transform data - insert Contract column
  const newNftRows = nftRows.map((row, i) => {
    if (i === 0) {
      return ['Slug', 'Contract', 'Name', 'Enabled'];
    }
    // Slug, empty contract (to be filled), Name, Enabled
    return [row[0] || '', '', row[1] || '', row[2] || 'TRUE'];
  });

  // Clear and rewrite
  await sheets.spreadsheets.values.clear({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A:D',
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: newNftRows },
  });

  console.log(`NFT_Whitelist: Updated ${newNftRows.length} rows`);

  // Update Token_Whitelist - add Contract column after Symbol
  // Current: Symbol | Name | Enabled
  // New: Symbol | Contract | Name | Enabled

  console.log('Updating Token_Whitelist...');

  const tokenResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A:C',
  });

  const tokenRows = tokenResponse.data.values || [];

  // Transform data - insert Contract column
  const newTokenRows = tokenRows.map((row, i) => {
    if (i === 0) {
      return ['Symbol', 'Contract', 'Name', 'Enabled'];
    }
    return [row[0] || '', '', row[1] || '', row[2] || 'TRUE'];
  });

  // Clear and rewrite
  await sheets.spreadsheets.values.clear({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A:D',
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: newTokenRows },
  });

  console.log(`Token_Whitelist: Updated ${newTokenRows.length} rows`);

  // Re-apply checkbox validation to column D (was column C)
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
  });

  const sheetIdMap = {};
  for (const sheet of spreadsheet.data.sheets || []) {
    sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
  }

  for (const tabName of ['NFT_Whitelist', 'Token_Whitelist']) {
    const sheetId = sheetIdMap[tabName];
    if (sheetId === undefined) continue;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 3,  // Column D (0-indexed)
              endColumnIndex: 4,
            },
            rule: {
              condition: { type: 'BOOLEAN' },
              showCustomUi: true,
            },
          },
        }],
      },
    });
    console.log(`${tabName}: Applied checkbox validation to Enabled column`);
  }

  console.log('\nDone! Contract column added. Fill in the contract addresses in column B.');
}

main().catch(console.error);
