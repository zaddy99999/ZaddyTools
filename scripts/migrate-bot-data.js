const { google } = require('googleapis');
const fs = require('fs');

// Load from JSON credentials file
const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';
const BOT_DATA_SPREADSHEET_ID = '1V9F04yo3At3g-Vr7_jT49pFc4b083UiWOFVwQF2xpUk';

const TABS_TO_MIGRATE = ['daily_log', 'latest', 'metrics', 'digests'];

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get sheet IDs from main spreadsheet (needed for deletion)
  const mainSpreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
  });

  const sheetIdMap = {};
  for (const sheet of mainSpreadsheet.data.sheets || []) {
    sheetIdMap[sheet.properties.title] = sheet.properties.sheetId;
  }

  console.log('Found sheets in main:', Object.keys(sheetIdMap));

  for (const tabName of TABS_TO_MIGRATE) {
    console.log(`\nMigrating ${tabName}...`);

    // Check if tab exists in main spreadsheet
    if (!(tabName in sheetIdMap)) {
      console.log(`  Tab ${tabName} not found in main spreadsheet, skipping`);
      continue;
    }

    try {
      // Read data from main spreadsheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${tabName}!A:Z`,
      });

      const data = response.data.values || [];
      console.log(`  Read ${data.length} rows from main spreadsheet`);

      if (data.length > 0) {
        // Clear existing data in bot data spreadsheet
        await sheets.spreadsheets.values.clear({
          spreadsheetId: BOT_DATA_SPREADSHEET_ID,
          range: `${tabName}!A:Z`,
        });

        // Write data to bot data spreadsheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: BOT_DATA_SPREADSHEET_ID,
          range: `${tabName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: data,
          },
        });
        console.log(`  Wrote ${data.length} rows to bot data spreadsheet`);
      }

      // Delete the tab from main spreadsheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteSheet: {
              sheetId: sheetIdMap[tabName],
            },
          }],
        },
      });
      console.log(`  Deleted ${tabName} from main spreadsheet`);

    } catch (error) {
      console.error(`  Error migrating ${tabName}:`, error.message);
    }
  }

  console.log('\nMigration complete!');
}

main().catch(console.error);
