const { google } = require('googleapis');
const fs = require('fs');

const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

// NFT contract addresses from OpenSea
const NFT_CONTRACTS = {
  'gigaverse-roms-abstract': '0x59eec556cef447e13edf4bfd3d4433d8dad8a7a5',
  'genesishero-abstract': '0x7c47ea32fd27d1a74fc6e9f31ce8162e6ce070eb',
  'finalbosu': '0x5fedb9a131f798e986109dd89942c17c25c81de3',
  'bearish': '0x516dc288e26b34557f68ea1c1ff13576eff8a168',
  'fugzfamily': '0x99b9007f3c8732b9bff2ed68ab7f73f27c4a0c53',
  'ruyui': '0x9ce89a1303f2d52a9d7840fcd5a6870c2a8550c0',
  'wolf-game': '0x43c6458efebb368b78b8b71280b3cfbe73d531b9',
  'och-ringbearer': '0x610a92436b9fdfc7d0c3686bb2cbe7b3bae22904',
  'web3-playboys': '0x09bb4c785165915e66f4a645bc978a6c885a0319',
  'hamieverse-genesis': '0x6aba0f2e864e268c9580868944ec9c4fccf9446d',
  'glowbuds': '0x40148d9aec2d0aed12ccf556cd7cd79c15197644',
  'checkmate-pass-abstract': '0x9a351731a65248536d77e084a92cf4c7acd179aa',
  'pengztracted-abstract': '0xa6c46c07f7f1966d772e29049175ebba26262513',
  'abstractio': '0x4b432060903184c5710f2ef0cf23adc84e7ffb18',
  'buumeeofficial': '0x02cf8fe86c9bbc4fc3e95567fc82398687e73367',
  'ultraman-archive78': '0xa4588c6be249df0cb2dd5dd1e827f41790ca94d7',
  'plooshy-apartments-abstract': '0x4431431a12b9af869cd78250590ee5c81d53e84b',
  'dreamiliomaker-abstract': '0x30072084ff8724098cbb65e07f7639ed31af5f66',
  'abstract-hotdogs-abstract': '0x265f307c1bdbb6f5d4b174d47f363ef5837be98b',
  'gigaverse-giglings': '0xd320831c876190c7ef79376ffcc889756f038e04',
};

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Reading current NFT_Whitelist...');

  // Read current data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A:D',
  });

  const rows = response.data.values || [];
  console.log(`Found ${rows.length} rows (including header)`);

  // Update contract addresses based on slug
  const updatedRows = rows.map((row, i) => {
    if (i === 0) return row; // Skip header

    const slug = row[0]?.trim();
    const currentContract = row[1]?.trim() || '';
    const name = row[2] || '';
    const enabled = row[3] || 'TRUE';

    // If we have a contract address for this slug and it's not already set, add it
    const newContract = NFT_CONTRACTS[slug] || currentContract;

    if (newContract && !currentContract) {
      console.log(`  ${slug}: Adding contract ${newContract}`);
    }

    return [slug, newContract, name, enabled];
  });

  // Write back the updated data
  await sheets.spreadsheets.values.update({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: updatedRows },
  });

  console.log('\nDone! Contract addresses updated in Google Sheet.');
}

main().catch(console.error);
