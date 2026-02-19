import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeErrorMessage } from '@/lib/errorResponse';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
let cachedData: { characters: any[]; relationships: any[]; factions: any[]; timestamp: number } | null = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getCharactersFromSheet() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('Missing spreadsheet ID');

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HamieCharacters!A:L',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || '',
      displayName: row[1] || '',
      species: row[2] || undefined,
      roles: row[3] ? row[3].split(',').map((r: string) => r.trim()) : [],
      traits: row[4] ? row[4].split(',').map((t: string) => t.trim()) : [],
      faction: row[5] || undefined,
      origin: row[6] || undefined,
      status: row[7] || undefined,
      summary: row[8] || undefined,
      quotes: row[9] ? row[9].split('|').map((q: string) => q.trim()) : [],
      gifFile: row[10] || undefined,
      color: row[11] || '#888888',
    }));
  } catch (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
}

async function getRelationshipsFromSheet() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('Missing spreadsheet ID');

  try {
    // Check if tab exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has('HamieRelationships')) {
      return [];
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HamieRelationships!A:D',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      a: row[0] || '',
      b: row[1] || '',
      type: row[2] || '',
      valence: row[3] || '',
    }));
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return [];
  }
}

async function getFactionsFromSheet() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('Missing spreadsheet ID');

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has('HamieFactions')) {
      return [];
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HamieFactions!A:F',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || '',
      name: row[1] || '',
      type: row[2] || '',
      goals: row[3] ? row[3].split(',').map((g: string) => g.trim()) : [],
      notes: row[4] || undefined,
      color: row[5] || '#888888',
    }));
  } catch (error) {
    console.error('Error fetching factions:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 30 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache
    if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000 / 60) + ' minutes',
      });
    }

    const [characters, relationships, factions] = await Promise.all([
      getCharactersFromSheet(),
      getRelationshipsFromSheet(),
      getFactionsFromSheet(),
    ]);

    cachedData = {
      characters,
      relationships,
      factions,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      characters,
      relationships,
      factions,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in hamieverse-characters API:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Failed to fetch character data') },
      { status: 500 }
    );
  }
}

// POST to populate initial data
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    // Default character data to populate
    const characters = [
      ['hamie', 'Hamie', 'Hamster', 'factory_worker,protagonist,undercode_newcomer', 'observant,anxious_under_surveillance,morally_driven,protective', 'Undercode', 'Virella (Beyond)', 'alive', 'Hamie, designated #146B, is a factory worker trapped in the City. After discovering contraband tech, he becomes Simba in the Undercode.', 'The City never sleeps, and neither do its cameras.|Sometimes the only way out is through.', 'hamie.gif', '#F7931A'],
      ['sam', 'Sam', '', 'respeculator_leader,strategist,negotiator', 'charismatic,calculating,narrative_steerer,power_seeking', 'Respeculators', '', 'alive', 'Sam is the charismatic leader of the Respeculators, a shadow coalition using rebellion as a mask for power.', 'Influence is the point, not trust.|Burn enough to light the path, not enough to destroy the fuel.', 'sam.gif', '#627EEA'],
      ['lira', 'Lira', 'Panther', 'respeculator_partner,skeptical_enforcer', 'volatile,intuitive,suspicious', 'Respeculators', '', 'alive', 'Lira is Sam\'s partner in the Respeculators, serving as the skeptical enforcer to his charismatic operator.', 'Trust is a currency. Spend it wisely.', 'lira.gif', '#9945FF'],
      ['silas', 'Silas', '', 'prologue_witness,veynar_heir', 'silent,tense,wants_to_help_but_cannot', 'Aetherion Elite', '', 'alive', 'Silas observes abuse from behind a doorframe; a seed of future divergence from the Veynar family.', '', 'silas.gif', '#DC2626'],
      ['ace', 'Ace', '', 'undercode_operative,echo_specialist', 'quick-witted,resourceful,risk-taking,loyal_to_crew', 'Undercode', '', 'alive', 'A skilled operator in the Undercode who specializes in echo raids and viral coordination.', 'An echo raid isn\'t just noise—it\'s a symphony of chaos.', 'ace.gif', '#F59E0B'],
      ['hikari', 'Hikari', '', 'tech_specialist,code_breaker', 'brilliant,introverted,meticulous,pattern_seeker', 'Undercode', '', 'alive', 'A reclusive genius who can crack legacy codes and develop countermeasures against Aetherion surveillance.', 'Every system has a seam. You just have to find it.', 'hikari.gif', '#8B5CF6'],
      ['kael', 'Kael', '', 'enforcer_turned_rebel,muscle', 'strong,conflicted,protective,haunted_by_past', 'Undercode', '', 'alive', 'Former IronPaw who defected after witnessing the system\'s cruelty firsthand.', 'I wore the visor. I know what they\'re capable of.', 'kael.gif', '#EF4444'],
      ['orrien', 'Orrien', '', 'information_broker,shadow_networker', 'mysterious,well-connected,calculating,speaks_in_riddles', 'Independent', '', 'alive', 'Moves between factions gathering and trading secrets; true loyalties remain unclear.', 'Information flows like water. I\'m just the riverbed.', 'orrien.gif', '#14B8A6'],
      ['grandma', 'Grandma', '', 'memory_keeper,emotional_anchor', 'warm,concerned,memory_keeper', 'The Beyond', 'Virella', 'alive', 'Hamie\'s grandmother who lives in the Virella care facility. Represents love and memory persisting across distance.', '', '', '#F472B6'],
      ['luna', 'Luna', 'Ferret', 'undercode_associate,party_companion', 'smooth,insistent,streetwise', 'Undercode', '', 'alive', 'A lithe ferret with eyes like spun glass who warns Simba about running on empty.', 'You\'re running on empty, Simba. Even stars burn out.', '', '#06B6D4'],
      ['257a', '#257A', '', 'senior_worker,quiet_intervenor', 'world_weary,sharp,not_unkind,strategic', 'The City', '', 'alive', 'A senior worker who invokes Protocol Four-Seven-Grey to save Hamie, embodying survived resistance.', 'Fall out of the Wheel, and you\'ll be ground under it.', '', '#6B7280'],
      ['mitch', 'Mitch', '', 'neighbor,informal_explainer', 'nosy,street_smart', 'The City', '', 'alive', 'Explains the bridge chip concept; unusually uses a real name in a world of numbers.', '', '', '#10B981'],
    ];

    // Check if data already exists
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HamieCharacters!A2:A',
    });

    if (existing.data.values && existing.data.values.length > 0) {
      return NextResponse.json({
        message: 'Characters already populated',
        count: existing.data.values.length,
      });
    }

    // Populate characters
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'HamieCharacters!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: characters,
      },
    });

    // Clear cache
    cachedData = null;

    return NextResponse.json({
      success: true,
      message: 'Populated character data',
      count: characters.length,
    });
  } catch (error) {
    console.error('Error populating characters:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Failed to populate character data') },
      { status: 500 }
    );
  }
}
