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

  // Get sheet IDs
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
  });

  const sheetIdMap = {};
  for (const sheet of spreadsheet.data.sheets || []) {
    sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
  }

  console.log('Setting up checkboxes for NFT_Whitelist and Token_Whitelist...');

  // For each whitelist, convert Status column to checkboxes
  for (const tabName of ['NFT_Whitelist', 'Token_Whitelist']) {
    const sheetId = sheetIdMap[tabName];
    if (!sheetId && sheetId !== 0) {
      console.log(`Sheet ${tabName} not found, skipping`);
      continue;
    }

    // Read current data to get row count
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `${tabName}!A:C`,
    });

    const rows = response.data.values || [];
    const rowCount = rows.length;

    // Update header to "Enabled"
    await sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `${tabName}!C1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Enabled']] },
    });

    // Convert Status column to checkboxes (column C, starting from row 2)
    // First, set all values to TRUE (since they were "Active")
    const checkboxValues = [];
    for (let i = 1; i < rowCount; i++) {
      checkboxValues.push([true]);
    }

    if (checkboxValues.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${tabName}!C2:C${rowCount}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: checkboxValues },
      });
    }

    // Apply checkbox data validation to column C
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,  // Skip header
              endRowIndex: 1000, // Cover plenty of rows
              startColumnIndex: 2,  // Column C (0-indexed)
              endColumnIndex: 3,
            },
            rule: {
              condition: { type: 'BOOLEAN' },
              showCustomUi: true,
            },
          },
        }],
      },
    });

    console.log(`${tabName}: Updated ${rowCount - 1} rows with checkboxes`);
  }

  console.log('\nDone! You can now check/uncheck items in the Enabled column.');
}

main().catch(console.error);
