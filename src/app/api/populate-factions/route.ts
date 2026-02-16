import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { validateSession, safeCompare } from '@/lib/admin-session';

function isAuthorized(request: Request): boolean {
  // First, check for session token (new secure method)
  const sessionToken = request.headers.get('x-admin-session');
  if (sessionToken && validateSession(sessionToken)) {
    return true;
  }

  // Fallback: check for direct admin key (for backward compatibility)
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.error('ADMIN_KEY environment variable is not configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-key');
  if (!authHeader) {
    return false;
  }

  return safeCompare(authHeader, adminKey);
}

const characterFactions: Record<string, { faction: string; factionType: string }> = {
  hamie: { faction: 'Undercode', factionType: 'operative' },
  sam: { faction: 'Respeculators', factionType: 'leader' },
  lira: { faction: 'Respeculators', factionType: 'partner' },
  silas: { faction: 'Aetherion Elite', factionType: 'heir' },
  grandma: { faction: 'The Beyond', factionType: 'civilian' },
  mitch: { faction: 'The City', factionType: 'civilian' },
  '257a': { faction: 'The City', factionType: 'worker' },
  '479c': { faction: 'The City', factionType: 'worker' },
  ace: { faction: 'Undercode', factionType: 'operative' },
  hikari: { faction: 'Undercode', factionType: 'tech_specialist' },
  kael: { faction: 'Undercode', factionType: 'defector' },
  orrien: { faction: 'Independent', factionType: 'broker' },
  luna: { faction: 'Undercode', factionType: 'associate' },
  alistair_veynar: { faction: 'Aetherion Elite', factionType: 'patriarch' },
  veynar_mother: { faction: 'Aetherion Elite', factionType: 'family' },
  homeless_man_under_overpass: { faction: 'Unknown', factionType: 'catalyst' },
  dog_simba: { faction: 'Independent', factionType: 'companion' },
  simba_digital_identity: { faction: 'Undercode', factionType: 'alias' },
};

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

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    // Check if Characters tab exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has('Characters')) {
      // Create the Characters tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: 'Characters' } },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Characters!A1:D1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['character_id', 'display_name', 'faction', 'faction_type']],
        },
      });
    }

    // Get existing data to update faction columns
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Characters!A:D',
    });

    const rows = existingData.data.values || [];
    const hasData = rows.length > 1;

    if (!hasData) {
      // Populate with all characters
      const characterRows = Object.entries(characterFactions).map(([id, data]) => [
        id,
        id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data.faction,
        data.factionType,
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Characters!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: characterRows,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Created Characters tab and populated faction data',
        count: characterRows.length
      });
    } else {
      // Update existing rows with faction data
      let updatedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const charId = row[0]?.toLowerCase().trim();

        if (charId && characterFactions[charId]) {
          const factionData = characterFactions[charId];
          // Update columns C and D (faction and faction_type)
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Characters!C${i + 1}:D${i + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[factionData.faction, factionData.factionType]],
            },
          });
          updatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Updated faction data for existing characters',
        updated: updatedCount
      });
    }
  } catch (error) {
    console.error('Error populating factions:', error);
    return NextResponse.json({
      error: 'Failed to populate factions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    factions: characterFactions,
    usage: 'POST to this endpoint to populate faction data in Google Sheets'
  });
}
