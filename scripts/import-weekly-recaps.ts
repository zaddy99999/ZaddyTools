// Run with: npx tsx scripts/import-weekly-recaps.ts
import { readFileSync } from 'fs';
import { google } from 'googleapis';

// Load env from .env.local
const envFile = readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
const TAB_NAME = 'abstract news';

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Weekly recap items - curated from Untamed Reports
const weeklyRecaps = [
  // Week of Feb 8-14, 2025 - Valentine's Week Recap
  {
    content: `🎮 GAMING HIGHLIGHTS: Onchain Heroes Maze of Gains hit massive milestones - Week 1 saw 2,469 players with $25K payouts, Week 2 exploded to 13,133 players with $105K+ in prizes. Treasure rewards now scale with depth. Pudgy Penguins launched "Polar Pair-Up" matching game. Hamieverse strategy game went live for Genesis holders with faction warfare. Wolf.game added Valley utility for skins with actual in-game functionality.`,
    source: '@thewolvesxyz',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T18:00:00Z',
    category: 'Gaming',
  },
  {
    content: `🤖 AI & AGENTS: Abstract announced ERC-8001 support enabling agent discovery, verifiable reputation, and scalable agent economy. BigHossbot AI agent launched by team member @masoncags with docs for other agents to access Abstract infrastructure. $BIGHOSS token hit $250K market cap. Playgigaverse added skills for AI bots like Openclaw to play games. Bearish_af integrated Blinko for AI agents. MoodyMights teased "Moody Archives: The Moment of BELIEF" - first AI-powered interactive experience.`,
    source: '@AbstractChain',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T17:00:00Z',
    category: 'Official',
  },
  {
    content: `🎨 NFT & COLLECTIBLES: Abstract celebrated 1 year with 800K users, 159M transactions, $5B onchain volume - new flash badge available. BigHossbot launched Abstract Socks NFT rental for badge claiming. Dyli.io user vaulted $100K+ collectibles. Pudgy Penguins mystery boxes reveal in March with live ripping and tokenization support. Hamieverse NFT reveal Feb 12 with $2K creator contest.`,
    source: '@thewolvesxyz',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T16:00:00Z',
    category: 'NFT',
  },
  {
    content: `💰 TOKENS & REWARDS: Pengu Card waitlist crossed 100K signups. Frankythefrog announced Nibble airdrop for all NFT holders. Xeetdotai paying $50K USDC to Top 250 Xeeters from Xyberinc tournament. Frankythefrog launched Franky's Hub quest platform for leveling and rewards. TollanUniverse Lunar New Year event with 1.5 ETH prize pool.`,
    source: '@thewolvesxyz',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T15:00:00Z',
    category: 'Token',
  },
  {
    content: `⚠️ COMMUNITY ALERTS: WEB3Playboys warned about scam token - they have NOT launched a token and have no plans to. Gacha_game_ launched One Piece packs with manga rares and premium chase cards. RuyuiStudios hit 1,000 players in Roots of Embervault first week. Hamieverse x TollanUniverse IP integration collab announced.`,
    source: '@thewolvesxyz',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T14:00:00Z',
    category: 'News',
  },
];

async function clearAndImportRecaps() {
  const sheets = getSheets();

  // First, clear existing data (keep header row)
  console.log('Clearing existing data...');
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A2:F1000`,
    });
    console.log('✓ Cleared existing data');
  } catch (error) {
    console.log('Note: Could not clear (sheet may be empty or not exist)');
  }

  // Add header row if needed
  console.log('Setting up header row...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Content', 'Source', 'SourceURL', 'Date', 'Category', 'Summary']],
      },
    });
    console.log('✓ Header row set');
  } catch (error) {
    console.error('Error setting header:', error);
  }

  // Import weekly recaps
  console.log(`\nImporting ${weeklyRecaps.length} weekly recap items...`);

  for (const item of weeklyRecaps) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${TAB_NAME}'!A:F`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            item.content,
            item.source,
            item.sourceUrl,
            item.date,
            item.category,
            '', // Let AI generate summary
          ]],
        },
      });
      console.log(`✓ Added: ${item.category} recap`);
    } catch (error) {
      console.error(`✗ Failed: ${item.category}`, error);
    }
  }

  console.log('\n✓ Weekly recaps imported successfully!');
}

clearAndImportRecaps().catch(console.error);
