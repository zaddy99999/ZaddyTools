const { google } = require('googleapis');
const fs = require('fs');

const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

// Token contract addresses from GeckoTerminal
const TOKEN_CONTRACTS = {
  'CHECK': '0x2226444afcccf9e760c01649ef1f9e66985a4b35',
  'ABX': '0x4c68e4102c0f120cce9f08625bd12079806b7c4d',
  'ABSTER': '0xc325b7e2736a5202bd860f5974d0aa375e57ede5',
  'YGG': '0xa9053dc939d74222f7aa0b3a2be407abbfd56c6a',
  'GTBTC': '0x0035b877c3ab50cffa9ed52ba05282c7045f78dd',
  'BIG': '0xdf70075737e9f96b078ab4461eee3e055e061223',
  'BURR': '0x4b16703f7b0de03d23fd54606ed5786a59e3f27e',
  'POLLY': '0x987cf44f3f5d854ec0703123d7fd003a8b56ebb4',
  'CHAD': '0xab02e1b9315779347c5e2cb8206b57c715911b4c',
  'GOD': '0x3d72ddd35cadb4e5b22cdb20b36f98077be84284',
  'KONA': '0x92aba186c85b5afeb3a2cedc8772ae8638f1b565',
  'TYAG': '0x0a2c776e4f9017ca0679e6064d2f99cf397b6457',
  'CHIMP': '0x7dea81e0506962807397e5a4006d613a1c903134',
};

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Reading current Token_Whitelist...');

  // Read current data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A:D',
  });

  const rows = response.data.values || [];
  console.log(`Found ${rows.length} rows (including header)`);

  // Update contract addresses based on symbol
  const updatedRows = rows.map((row, i) => {
    if (i === 0) return row; // Skip header

    const symbol = row[0]?.trim()?.toUpperCase();
    const currentContract = row[1]?.trim() || '';
    const name = row[2] || '';
    const enabled = row[3] || 'TRUE';

    // If we have a contract address for this symbol and it's not already set, add it
    const newContract = TOKEN_CONTRACTS[symbol] || currentContract;

    if (newContract && !currentContract) {
      console.log(`  ${symbol}: Adding contract ${newContract}`);
    }

    return [row[0], newContract, name, enabled];
  });

  // Write back the updated data
  await sheets.spreadsheets.values.update({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: updatedRows },
  });

  console.log('\nDone! Contract addresses updated in Google Sheet.');
}

main().catch(console.error);
