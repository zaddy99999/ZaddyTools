const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load from JSON credentials file
const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

const NFT_WHITELIST = [
  ['Slug', 'Name', 'Status', 'Supply'],
  ['gigaverse-roms-abstract', 'Gigaverse ROMs', 'Active', ''],
  ['genesishero-abstract', 'OCH Genesis Hero', 'Active', ''],
  ['finalbosu', 'Final Bosu', 'Active', ''],
  ['bearish', 'BEARISH', 'Active', '8888'],
  ['fugzfamily', 'Fugz', 'Active', ''],
  ['ruyui', 'RUYUI', 'Active', ''],
  ['wolf-game', 'Wolf Game', 'Active', ''],
  ['och-ringbearer', 'OCH Ringbearer', 'Active', ''],
  ['web3-playboys', 'Web3 Playboys', 'Active', ''],
  ['plooshy-apartments-abstract', 'Plooshy Apartments', 'Active', ''],
  ['hamieverse-genesis', 'Hamieverse Genesis', 'Active', ''],
  ['glowbuds', 'Glowbuds', 'Active', ''],
  ['checkmate-pass-abstract', 'Checkmate Pass', 'Active', ''],
  ['pengztracted-abstract', 'Pengztracted', 'Active', ''],
  ['abstractio', 'Abstractio', 'Active', ''],
  ['abstract-hotdogs-abstract', 'Abstract Hotdogs', 'Active', ''],
  ['dreamiliomaker-abstract', 'Dreamilio Maker', 'Active', ''],
  ['buumeeofficial', 'Buumee', 'Active', ''],
  ['ultraman-archive78', 'Ultraman Archive', 'Active', ''],
  ['gigaverse-giglings', 'Gigaverse Giglings', 'Active', ''],
];

const TOKEN_WHITELIST = [
  ['Symbol', 'Name', 'Status'],
  ['CHECK', 'Check', 'Active'],
  ['ABX', 'Aborean', 'Active'],
  ['ABSTER', 'Abster', 'Active'],
  ['YGG', 'YGG', 'Active'],
  ['gtBTC', 'Gate BTC', 'Active'],
  ['BIG', 'Big Hoss', 'Active'],
  ['BURR', 'Burr', 'Active'],
  ['Polly', 'Polly', 'Active'],
  ['CHAD', 'Chad', 'Active'],
  ['GOD', 'God', 'Active'],
  ['KONA', 'Kona', 'Active'],
  ['PANDA', 'Panda', 'Active'],
  ['TYAG', 'Tyag', 'Active'],
  ['CHIMP', 'Chimp', 'Active'],
  ['CHILL', 'Chill', 'Active'],
  ['MOCHI', 'Mochi', 'Active'],
  ['GIGLIO', 'Giglio', 'Active'],
  ['WETH', 'Wrapped ETH', 'Active'],
  ['USDC', 'USDC', 'Active'],
  ['ABS', 'Abstract', 'Active'],
];

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Try to create new sheets (tabs), ignore error if they exist
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: 'NFT_Whitelist' } } },
          { addSheet: { properties: { title: 'Token_Whitelist' } } },
        ],
      },
    });
    console.log('Created new sheets');
  } catch (e) {
    console.log('Sheets may already exist, continuing...');
  }

  // Write NFT whitelist
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'NFT_Whitelist!A1',
    valueInputOption: 'RAW',
    requestBody: { values: NFT_WHITELIST },
  });
  console.log('NFT whitelist written');

  // Write Token whitelist
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Token_Whitelist!A1',
    valueInputOption: 'RAW',
    requestBody: { values: TOKEN_WHITELIST },
  });
  console.log('Token whitelist written');

  console.log('Done! Check the Google Sheet.');
}

main().catch(console.error);
