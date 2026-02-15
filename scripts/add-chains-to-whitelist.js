const { google } = require('googleapis');
const fs = require('fs');

const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

// Major chains to whitelist
const CHAINS = [
  { name: 'Ethereum', logo: 'ethereum' },
  { name: 'Arbitrum', logo: 'arbitrum' },
  { name: 'Base', logo: 'base' },
  { name: 'Optimism', logo: 'optimism' },
  { name: 'Polygon', logo: 'polygon' },
  { name: 'Solana', logo: 'solana' },
  { name: 'Avalanche', logo: 'avalanche' },
  { name: 'BSC', logo: 'binance' },
  { name: 'Sui', logo: 'sui' },
  { name: 'zkSync Era', logo: 'zksync-era' },
  { name: 'Fantom', logo: 'fantom' },
  { name: 'Mantle', logo: 'mantle' },
  { name: 'Linea', logo: 'linea' },
  { name: 'Scroll', logo: 'scroll' },
  { name: 'Blast', logo: 'blast' },
  { name: 'Manta', logo: 'manta' },
  { name: 'Mode', logo: 'mode' },
  { name: 'Gnosis', logo: 'gnosis' },
  { name: 'Celo', logo: 'celo' },
  { name: 'Moonbeam', logo: 'moonbeam' },
  { name: 'Tron', logo: 'tron' },
  { name: 'TON', logo: 'ton' },
  { name: 'Aptos', logo: 'aptos' },
  { name: 'Sei', logo: 'sei' },
  { name: 'Starknet', logo: 'starknet' },
  { name: 'Near', logo: 'near' },
  { name: 'Cronos', logo: 'cronos' },
  { name: 'Kava', logo: 'kava' },
  { name: 'Metis', logo: 'metis' },
  { name: 'Aurora', logo: 'aurora' },
];

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Reading current Whitelist...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Whitelist!A:E',
  });

  const rows = response.data.values || [];

  // Check if chains already exist
  const existingTypes = new Set(rows.slice(1).map(r => r[0]));
  if (existingTypes.has('Chain')) {
    console.log('Chains already in whitelist, skipping...');
    return;
  }

  // Add chain rows
  const chainRows = CHAINS.map(chain => [
    'Chain',
    chain.name.toLowerCase(),  // Identifier (lowercase name for matching)
    chain.logo,                // Contract column repurposed as logo
    chain.name,                // Display name
    'TRUE',                    // Enabled
  ]);

  console.log(`Adding ${chainRows.length} chains to whitelist...`);

  // Append chains to existing data
  await sheets.spreadsheets.values.append({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Whitelist!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: chainRows },
  });

  console.log('Done! Chains added to whitelist.');
}

main().catch(console.error);
