// Run with: npx tsx scripts/import-abstract-news.ts
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

async function addAbstractNewsItem(item: {
  content: string;
  source: string;
  sourceUrl?: string;
  date: string;
  category?: string;
}): Promise<boolean> {
  try {
    const sheets = getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          item.content,
          item.source,
          item.sourceUrl || '',
          item.date,
          item.category || 'News',
          '', // summary - leave blank for AI to generate
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error('Error adding news item:', error);
    return false;
  }
}

interface NewsItem {
  content: string;
  source: string;
  sourceUrl: string;
  date: string;
  category: string;
}

// Parsed news items from Untamed Reports
const newsItems: NewsItem[] = [
  // Report: "Big Hoss" - Feb 8, 2025 (estimated)
  {
    content: "New AI agent on Abstract: @BigHossbot, created by team member @masoncags. The agent created docs that let any other agent easily access Abstract's infrastructure.",
    source: '@AbstractChain',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-08T12:00:00Z',
    category: 'Official',
  },
  {
    content: '@BigHossbot has an official token - $BIGHOSS - with current market cap of $250K',
    source: '@BigHossbot',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-08T12:00:00Z',
    category: 'Token',
  },
  {
    content: '@hamieverse announced a collab with @TollanUniverse for IP integration',
    source: '@hamieverse',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-08T12:00:00Z',
    category: 'News',
  },
  {
    content: '@RuyuiStudios hit 1,000 players in their Roots of Embervault game in the first week',
    source: '@RuyuiStudios',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-08T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@onchainheroes reported 1,800+ players and $13,000+ prize pool in Maze of Gains on Day 1',
    source: '@onchainheroes',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-08T12:00:00Z',
    category: 'Gaming',
  },

  // Report: "Polar Pair-Up" - Feb 9, 2025 (estimated)
  {
    content: "New flash badge available - check out @AbstractChain's one year anniversary site. Celebrating 800K users, 159M transactions, and $5B onchain volume!",
    source: '@AbstractChain',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-09T12:00:00Z',
    category: 'Official',
  },
  {
    content: "@pudgypenguins launched a game called Polar Pair-Up on Abstract - it's a fun matching-style game",
    source: '@pudgypenguins',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-09T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@onchainheroes completed Week 1 of Maze with 2,469 players and a $25,070 payout',
    source: '@onchainheroes',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-09T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: "@frankythefrog announced a Valentine's Day tournament",
    source: '@frankythefrog',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-09T12:00:00Z',
    category: 'Gaming',
  },

  // Report: "Rent a Sock" - Feb 10, 2025 (estimated)
  {
    content: '@BigHossbot launched an app that lets you rent an Abstract Socks NFT for a few bucks to claim its badge',
    source: '@BigHossbot',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-10T12:00:00Z',
    category: 'NFT',
  },
  {
    content: '@gacha_game_ launched One Piece packs featuring manga rares and premium chase cards',
    source: '@gacha_game_',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-10T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@frankythefrog teamed up with @LT3NFT for a one week tournament',
    source: '@frankythefrog',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-10T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@dyli_io reported a user vaulted over $100k worth of collectibles',
    source: '@dyli_io',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-10T12:00:00Z',
    category: 'NFT',
  },
  {
    content: '@WEB3Playboys launched the first annual Cupid Rugged Me event with daily spins',
    source: '@WEB3Playboys',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-10T12:00:00Z',
    category: 'Gaming',
  },

  // Report: "Agents on Parade" - Feb 11, 2025
  {
    content: 'Abstract announced support for ERC-8001 which gives users the ability to discover agents, rely on verifiable reputation, and participate in a scalable agent economy',
    source: '@AbstractChain',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Official',
  },
  {
    content: '@playgigaverse launched a skill so AI bots like @openclaw can play the game',
    source: '@playgigaverse',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@bearish_af integrated Blinko as a playable game for AI agents',
    source: '@bearish_af',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@onchainheroes reworked their Jackpot Pool mechanics - removed balance multiplier for smaller individual wins but a larger growing pool, and seeded an extra $2,000',
    source: '@onchainheroes',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@MoodyMights teased "Moody Archives: The Moment of BELIEF" - the first AI-powered interactive experience on Abstract',
    source: '@MoodyMights',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@xeetdotai is paying out $50K USDC to the Top 250 Xeeters from the suspended Xyberinc tournament, distributing in the first week of March. A new tournament using their Creator Capital Markets model may follow',
    source: '@xeetdotai',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Token',
  },
  {
    content: '@wolfdotgame updated their Caves leaderboard to use Raw Score - pure performance without multipliers. Top 20 weekly players earn an unannounced Caves skin',
    source: '@wolfdotgame',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@frankythefrog announced all Franky NFT holders will receive a Nibble airdrop. Non-holders have to compete for allocation',
    source: '@frankythefrog',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'Token',
  },
  {
    content: '@hamieverse NFT reveal is scheduled for Feb 12 with a $2,000 creator contest for best reveal reaction content',
    source: '@hamieverse',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'NFT',
  },
  {
    content: '@WEB3Playboys warned they have not launched a token and have no plans to. There is a scam token circulating',
    source: '@WEB3Playboys',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-11T12:00:00Z',
    category: 'News',
  },

  // Report: "❤️" Valentine's Day - Feb 14, 2025
  {
    content: 'The @pudgypenguins Pengu Card waitlist crossed 100,000 signups',
    source: '@pudgypenguins',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'News',
  },
  {
    content: 'Mobile game @PlayPudgyParty teased a new female penguin character arriving today - is it Polly?',
    source: '@PlayPudgyParty',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: "@frankythefrog launched Franky's Hub - a quest platform for completing quests, leveling up, and earning rewards",
    source: '@frankythefrog',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@onchainheroes Maze of Gains Week 2 stats: 13,133 players, 76,396 keys burned, 54,846 runs, and over $105,000 in weekly prizes. Early reward claims are now open ahead of schedule. Treasure rewards now scale with depth, and energy drop rates cap at Floor 10',
    source: '@onchainheroes',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@hamieverse strategy game goes live February 14th for Genesis holders - faction-based warfare between Liberators and Aetherion',
    source: '@hamieverse',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@TollanUniverse launched a Lunar New Year event with a 1.5 ETH prize pool featuring dragon-catching mechanics and Lunar NFT skins. In-game food drops include Dumplings for XP boost, Noodles for HP boost, and Fortune Cookies for random permanent stat buffs',
    source: '@TollanUniverse',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
  {
    content: '@dyli_io confirmed that Pudgy Penguins mystery boxes revealing in March can be live ripped and tokenized by their team for easier trading',
    source: '@dyli_io',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'NFT',
  },
  {
    content: '@wolfdotgame teased upcoming Valley utility for skins - cosmetics will have actual in-game functionality',
    source: '@wolfdotgame',
    sourceUrl: 'https://twitter.com/thewolvesxyz',
    date: '2025-02-14T12:00:00Z',
    category: 'Gaming',
  },
];

async function importNews() {
  console.log(`Importing ${newsItems.length} news items...`);

  let successCount = 0;
  let failCount = 0;

  for (const item of newsItems) {
    try {
      const success = await addAbstractNewsItem(item);
      if (success) {
        successCount++;
        console.log(`✓ Added: ${item.content.slice(0, 50)}...`);
      } else {
        failCount++;
        console.log(`✗ Failed: ${item.content.slice(0, 50)}...`);
      }
    } catch (error) {
      failCount++;
      console.error(`✗ Error: ${error}`);
    }
  }

  console.log(`\nImport complete: ${successCount} succeeded, ${failCount} failed`);
}

importNews().catch(console.error);
