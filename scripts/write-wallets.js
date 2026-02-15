const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const obsidianWallets = [
  { id: "39713", wallet: "0x161f91374506a85ed9063e90c4c217d8697d6471", name: "Ely", tier: 6, tierV2: 16, badges: 37, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/39713.png", txs: 5025 },
  { id: "43427", wallet: "0x90d644bafa0dad528d89ebca2b2d2d51379a428c", name: "Rebornmf", tier: 6, tierV2: 16, badges: 40, streaming: true, pfp: "https://i2c.seadn.io/abstract/0xac15a7a085e57ac7b4e9b3c40ac447cd515fd917/8922b984bd46b9341cc632faca5e5f/618922b984bd46b9341cc632faca5e5f.webp", txs: 12742 },
  { id: "70781", wallet: "0x7fd643b7da56b3acb6a5a4e83a8818b14f195a50", name: "marlomarlo", tier: 6, tierV2: 16, badges: 37, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/70781.png", txs: 44269 },
  { id: "74269", wallet: "0x0dc12bad7e3d91da8d18860ca9ab76904560962d", name: "MindfulMarketsOG", tier: 6, tierV2: 16, badges: 39, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/74269.png", txs: 13119 },
  { id: "80547", wallet: "0xc9f27e68912aae40bb60c17b5634b3e74bbb16ab", name: "Minebuu", tier: 6, tierV2: 16, badges: 42, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/80547.png", txs: 44488 },
  { id: "82173", wallet: "0xc3ae9ac69d672368539413235938277ce19fc270", name: "Bollin", tier: 6, tierV2: 16, badges: 41, streaming: true, pfp: "https://i2c.seadn.io/abstract/0x458422e93bf89a109afc4fac00aacf2f18fcf541/d77d5ad3429d0d7862eda1ba163523/16d77d5ad3429d0d7862eda1ba163523.gif", txs: 69736 },
  { id: "82323", wallet: "0x69c4cc0147fbc23965896fb18a1ccea92230ed1b", name: "afropengu", tier: 6, tierV2: 16, badges: 25, streaming: false, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/82323.png", txs: 39189 },
  { id: "102627", wallet: "0xd82311e0ddcff7cad1be090763d4f6d7ba1c290a", name: "0xd82311e0ddcff7cad1be090763d4f6d7ba1c290a", tier: 6, tierV2: 16, badges: 27, streaming: true, pfp: "", txs: 4100 },
  { id: "138741", wallet: "0x7a84af82a3d5c913fc42f333d709fe706160e258", name: "FroggyCyborg", tier: 6, tierV2: 16, badges: 39, streaming: true, pfp: "https://cdn.simplehash.com/assets/13d79c333f3ab06b1c530d82c4f378ec6013390cce8c43dce1d133d311daefcb.png", txs: 56845 },
  { id: "223503", wallet: "0x122572e5a9ac036292a113c65f1d8c62d4f95f2e", name: "Amyqueen", tier: 6, tierV2: 16, badges: 26, streaming: false, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/223503.png", txs: 7045 },
  { id: "263118", wallet: "0xba5257e72de3901db065e340f96bea9479b45b5e", name: "sayyes", tier: 6, tierV2: 16, badges: 40, streaming: true, pfp: "https://i2c.seadn.io/abstract/0x30072084ff8724098cbb65e07f7639ed31af5f66/13e078b17dd2fcf971eed7b44af50d/7a13e078b17dd2fcf971eed7b44af50d.webp", txs: 80793 },
];

const diamondWallets = [
  { id: "31", wallet: "0x917a67de1a4e29d8820e1aeafd1e7e53f19f2df7", name: "coffee", tier: 5, tierV2: 15, badges: 39, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/31.png", txs: 9808 },
  { id: "58", wallet: "0xfc61f1b7701f6765ff548b3bca403cdaa723d260", name: "curtis", tier: 5, tierV2: 13, badges: 31, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/58.png", txs: 3636 },
  { id: "86", wallet: "0x94692aeb630122b221b2950c2fef4f4f4a5fdf78", name: "RubiksGus", tier: 5, tierV2: 15, badges: 42, streaming: true, pfp: "https://cdn.simplehash.com/assets/a8eb67b31ef13010bcfbc698c4244501f14ee1580bdc71ca4a9158b90a39cdbc.png", txs: 6074 },
  { id: "292", wallet: "0xaa9f002000c4f34727e1f0407f363e4ee0be4c27", name: "cardman", tier: 5, tierV2: 13, badges: 23, streaming: false, pfp: "https://cdn.simplehash.com/assets/b79a14387ba7e7c151d8df7bffb364fd9275f08df15eca9f5b78e7b3d18ad0cd.gif", txs: 4281 },
  { id: "2453", wallet: "0x6c55280706ddc3477b80fe6e2f1e5be479a74182", name: "Breezeonhodl", tier: 5, tierV2: 13, badges: 38, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/2453.png", txs: 10412 },
  { id: "3878", wallet: "0x531a75ed2a7dea237ded2fc2c14ee878fc723eaa", name: "thepeengwin", tier: 5, tierV2: 13, badges: 40, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/3878.jpg", txs: 20754 },
  { id: "4094", wallet: "0x2a8c750c49674ab43d078ded37087ff47851b468", name: "Woo", tier: 5, tierV2: 14, badges: 43, streaming: true, pfp: "https://cdn.simplehash.com/assets/f0a86cde454589a25aa6dbb578d840f2cc1b2bfa4b9d8e39459a6b74cfef2d2c.webp", txs: 16941 },
  { id: "4112", wallet: "0x9714a649f3ff075dca25386e98e384daf3abb323", name: "jellothefox", tier: 5, tierV2: 13, badges: 36, streaming: false, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/4112.png", txs: 18345 },
  { id: "4425", wallet: "0xa8cf07d10b478f15e2e0c00eb49b56ffcebcaca5", name: "coolgolfer1", tier: 5, tierV2: 13, badges: 40, streaming: true, pfp: "https://abstract-assets.abs.xyz/avatars/profile_override/4425.png", txs: 8148 },
  { id: "4912", wallet: "0xa97a257e04a0da6b5146bf8a22796ec73049570f", name: "1mpal", tier: 5, tierV2: 13, badges: 41, streaming: true, pfp: "https://i2c.seadn.io/abstract/0x99bb83ae9bb0c0a6be865cacf67760947f91cb70/1b0ad268bc83a9afb1e488937a19d5/581b0ad268bc83a9afb1e488937a19d5.avif", txs: 23394 },
];

async function main() {
  console.log('Starting...');

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  console.log('Auth ready, spreadsheet:', spreadsheetId);

  // Build rows
  const header = ['tier_name', 'id', 'wallet', 'name', 'tier', 'tierV2', 'badges', 'streaming', 'pfp', 'txs', 'portal_link'];

  const rows = [header];

  for (const w of obsidianWallets) {
    rows.push(['Obsidian', w.id, w.wallet, w.name, w.tier, w.tierV2, w.badges, w.streaming ? 'yes' : 'no', w.pfp || '', w.txs || '', `https://portal.abs.xyz/profile/${w.wallet}`]);
  }

  for (const w of diamondWallets) {
    rows.push(['Diamond', w.id, w.wallet, w.name, w.tier, w.tierV2, w.badges, w.streaming ? 'yes' : 'no', w.pfp || '', w.txs || '', `https://portal.abs.xyz/profile/${w.wallet}`]);
  }

  console.log(`Writing ${rows.length} rows...`);

  // Write to sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'TopWallets!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log('DONE! Check TopWallets tab in Google Sheets');
}

main().catch(console.error);
