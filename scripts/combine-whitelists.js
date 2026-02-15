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

  console.log('Reading NFT_Whitelist...');
  const nftResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A:D',
  });
  const nftRows = nftResponse.data.values || [];

  console.log('Reading Token_Whitelist...');
  const tokenResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A:D',
  });
  const tokenRows = tokenResponse.data.values || [];

  // Build combined data
  // New format: Type | Identifier | Contract | Name | Enabled
  const combinedRows = [
    ['Type', 'Identifier', 'Contract', 'Name', 'Enabled']
  ];

  // Add NFTs (skip header, skip empty rows)
  for (let i = 1; i < nftRows.length; i++) {
    const row = nftRows[i];
    const slug = row[0]?.trim();
    if (!slug) continue;

    combinedRows.push([
      'NFT',
      slug,                    // Identifier (slug for NFTs)
      row[1]?.trim() || '',   // Contract
      row[2]?.trim() || '',   // Name
      row[3] || 'TRUE',       // Enabled
    ]);
  }

  // Add Tokens (skip header, skip empty rows)
  for (let i = 1; i < tokenRows.length; i++) {
    const row = tokenRows[i];
    const symbol = row[0]?.trim();
    if (!symbol) continue;

    combinedRows.push([
      'Token',
      symbol,                  // Identifier (symbol for tokens)
      row[1]?.trim() || '',   // Contract
      row[2]?.trim() || '',   // Name
      row[3] || 'TRUE',       // Enabled
    ]);
  }

  console.log(`Combined: ${combinedRows.length - 1} items (NFTs + Tokens)`);

  // Check if Whitelist tab exists, create if not
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
  });

  const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);

  if (!existingTabs.includes('Whitelist')) {
    console.log('Creating Whitelist tab...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: 'Whitelist' } },
        }],
      },
    });
  }

  // Clear and write combined data
  console.log('Writing combined whitelist...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Whitelist!A:E',
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Whitelist!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: combinedRows },
  });

  // Get sheet ID for checkbox validation
  const updatedSpreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
  });

  const whitelistSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Whitelist');
  if (whitelistSheet) {
    const sheetId = whitelistSheet.properties.sheetId;

    // Apply checkbox validation to Enabled column (E)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 4,  // Column E (0-indexed)
              endColumnIndex: 5,
            },
            rule: {
              condition: { type: 'BOOLEAN' },
              showCustomUi: true,
            },
          },
        }],
      },
    });
    console.log('Applied checkbox validation to Enabled column');
  }

  // Delete old tabs
  console.log('Deleting old NFT_Whitelist and Token_Whitelist tabs...');
  const sheetsToDelete = [];
  for (const sheet of updatedSpreadsheet.data.sheets) {
    if (sheet.properties.title === 'NFT_Whitelist' || sheet.properties.title === 'Token_Whitelist') {
      sheetsToDelete.push({
        deleteSheet: { sheetId: sheet.properties.sheetId }
      });
    }
  }

  if (sheetsToDelete.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      requestBody: { requests: sheetsToDelete },
    });
  }

  console.log('\nDone! Combined whitelist created.');
  console.log('Format: Type | Identifier | Contract | Name | Enabled');
}

main().catch(console.error);
