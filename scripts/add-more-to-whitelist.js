const { google } = require('googleapis');
const fs = require('fs');

const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const MAIN_SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

// 20 new NFT collections to add
const NEW_NFTS = [
  { slug: 'meow-co0', contract: '0x40c8ce0e401641fb9fbb2c289a0df6c8c9c3db8b', name: 'Meow & Co' },
  { slug: 'dyli-abstract', contract: '0x458422e93bf89a109afc4fac00aacf2f18fcf541', name: 'DYLI' },
  { slug: 'tollan-universe-genesis-avatars', contract: '0x3a85ba3b4fdcfbcf45340371408df9fd8c140ec1', name: 'Tollan Universe Genesis' },
  { slug: 'veabx', contract: '0x27b04370d8087e714a9f557c1eff7901cea6bb63', name: 'veABX' },
  { slug: 'och-gacha-weapon', contract: '0x686bfe70f061507065f3e939c12ac9ee5a564dcf', name: 'OCH WEAPON' },
  { slug: 'canna-sapiens', contract: '0x8d1efb8ab4f74607fb9df73c065df627fe0f3b6d', name: 'Canna Sapiens' },
  { slug: 'punkism-5', contract: '0x267db21df5e870f0506ec95d0b094195d85963b8', name: 'Punkism' },
  { slug: 'bigcoin-miners', contract: '0x4e70f7c12dffba550db549cda8f78085e733f5b6', name: 'Bigcoin Miners' },
  { slug: 'web3-playboys-traits', contract: '0x1e49b0d225c45b22f66bd660841d98e153c7abd5', name: 'Web3 Playboys Traits' },
  { slug: 'maero-universe', contract: '0x6d7db6a536224212f5f196f9908f61dfa8e6775b', name: 'Maero Universe' },
  { slug: 'pixelcorns-abs', contract: '0xe10f14bb1bc67e8c89cec3f3d51d1f5c19a2bd00', name: 'Pixelcorns' },
  { slug: 'chronoforge-pets-2', contract: '0xce2ad424e71491998b7f579d4baa27bb1afc338f', name: 'ChronoForge Pets' },
  { slug: 'monster-capsules', contract: '0x38272b362bca267dc8e9120087c93cefb86a69ac', name: 'Monster Capsules' },
  { slug: 'chronoforge-totem-abstract', contract: '0x76c3388946529620cce29498fe7164b39aa69719', name: 'Chronoforge Totem' },
  { slug: 'astroverseofficial', contract: '0xc077ec761d6b65374f4237b548752a519751cc51', name: 'AstroVerse' },
  { slug: 'digitalinsects', contract: '0x9814eb83c32ae87728e19513298c6d2efa14de7a', name: 'Digital Insects' },
  { slug: 'digitalegg', contract: '0x384af80dfda17d5aaa9db237414ded760a9627a5', name: 'Digital Eggs' },
  { slug: 'pixelady-maker-cata-abstract', contract: '0xea56abd80cc721e6ed38cc287a0770c65fb47394', name: 'Pixelady Maker CATA' },
  { slug: 'neura-androids', contract: '0x8f2620daa79ea542c8be3d533fc44abf5964854d', name: 'Neura Androids' },
  { slug: 'abstractors-abstract', contract: '0x66de4d3ad9a490e4f090d60bff1b82723150abb3', name: 'Abstractors' },
];

// 20 new tokens to add (sorted by market cap, excluding stablecoins/low value)
const NEW_TOKENS = [
  { symbol: 'HERO', contract: '0x33ee11ce309854a45b65368c078616abcb5c6e3d', name: 'Hero' },
  { symbol: 'FROTH', contract: '0x5e1f9a9bd16deb2a44c9723a72d99f759a30d907', name: 'Froth' },
  { symbol: 'GOONER', contract: '0xdc70311f4b19774828aa4a57520a7153af5e58a5', name: 'Gooner' },
  { symbol: 'GUILD', contract: '0xcea652accfd9dab53fa1242294f4910708cc0cc2', name: 'Guild' },
  { symbol: 'gBLUE', contract: '0xc25714e79b694eee7e8e8d21dae332a797d28ac0', name: 'gBlue' },
  { symbol: 'RETSBA', contract: '0x52629ddbf28aa01aa22b994ec9c80273e4eb5b0a', name: 'Retsba' },
  { symbol: 'NOOT', contract: '0x85ca16fd0e81659e0b8be337294149e722528731', name: 'Noot' },
  { symbol: 'BIGHOSS', contract: '0x58241595e4d9d0a1d98a9dbd8d99dc757ed135ff', name: 'Big Hoss' },
  { symbol: 'CYCLOPS', contract: '0x1cd6edb761ed1d68c3cc3c5b9b3e9460887fd139', name: 'Cyclops' },
  { symbol: 'GUGO', contract: '0xea08d82824e871a163fdeb7d7c6000521f1be4dd', name: 'Gugo' },
  { symbol: 'ERK', contract: '0x95d7c69694e66aa5010346f8bd23462f6d9a5ae5', name: 'Erk' },
  { symbol: 'SPUD', contract: '0x44cca204fd7a6b357ed88c2c5fefa667ee7be305', name: 'Spud' },
  { symbol: 'MLP', contract: '0x98bad5e69167a329bc274b37f127ede8196fe37e', name: 'MLP' },
  { symbol: 'PlanB', contract: '0x9301d2debe3c501a4bef6ba5b273b7bd346fa57e', name: 'Plan B' },
  { symbol: 'PEARL', contract: '0x792cf0a64a46dbb48ca414dff20dcd341812579e', name: 'Pearl' },
  { symbol: 'MIRAI', contract: '0xbcda9ae6a148bc4fb411979ffa883c9d1df08f43', name: 'Mirai' },
  { symbol: 'PST', contract: '0x5a4f6f08a3e414924d972f2df8973809ecde6cc6', name: 'PST' },
  { symbol: 'BROCK', contract: '0x9fcfbb837fe77eb4ca6beb35da88134b65416db4', name: 'Brock' },
  { symbol: 'PENX', contract: '0xc54dc84a06da6f55357e04c9dbf1ddc78a1dd473', name: 'PenX' },
  { symbol: 'BORNE', contract: '0xcfd7cfeacc783a0d48ce076922b9d87aab2c4c1b', name: 'Borne' },
];

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ===== Add NFTs =====
  console.log('Reading current NFT_Whitelist...');
  const nftResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'NFT_Whitelist!A:D',
  });

  const nftRows = nftResponse.data.values || [];
  const existingNftSlugs = new Set(nftRows.map(r => r[0]?.toLowerCase()));

  // Find first empty row (skip rows with data)
  let nftInsertRow = nftRows.length + 1;
  for (let i = 1; i < nftRows.length; i++) {
    if (!nftRows[i][0]?.trim()) {
      nftInsertRow = i + 1;
      break;
    }
  }

  // Prepare new NFT rows
  const newNftRows = NEW_NFTS
    .filter(n => !existingNftSlugs.has(n.slug.toLowerCase()))
    .map(n => [n.slug, n.contract, n.name, 'TRUE']);

  if (newNftRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `NFT_Whitelist!A${nftInsertRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newNftRows },
    });
    console.log(`Added ${newNftRows.length} new NFT collections`);
  } else {
    console.log('No new NFT collections to add (all already exist)');
  }

  // ===== Add Tokens =====
  console.log('\nReading current Token_Whitelist...');
  const tokenResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: MAIN_SPREADSHEET_ID,
    range: 'Token_Whitelist!A:D',
  });

  const tokenRows = tokenResponse.data.values || [];
  const existingTokenSymbols = new Set(tokenRows.map(r => r[0]?.toUpperCase()));

  // Find first empty row
  let tokenInsertRow = tokenRows.length + 1;
  for (let i = 1; i < tokenRows.length; i++) {
    if (!tokenRows[i][0]?.trim()) {
      tokenInsertRow = i + 1;
      break;
    }
  }

  // Prepare new token rows
  const newTokenRows = NEW_TOKENS
    .filter(t => !existingTokenSymbols.has(t.symbol.toUpperCase()))
    .map(t => [t.symbol, t.contract, t.name, 'TRUE']);

  if (newTokenRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `Token_Whitelist!A${tokenInsertRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newTokenRows },
    });
    console.log(`Added ${newTokenRows.length} new tokens`);
  } else {
    console.log('No new tokens to add (all already exist)');
  }

  console.log('\nDone!');
}

main().catch(console.error);
