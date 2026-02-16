import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

async function ensureFanArtTab() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('Missing spreadsheet ID');

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  if (!existingTabs.has('FanArt')) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: 'FanArt' } },
        }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'FanArt!A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'id', 'game_id', 'title', 'artist', 'twitter', 'image_url',
          'character', 'status', 'submitted_at'
        ]],
      },
    });
  }

  return sheets;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const status = searchParams.get('status') || 'approved';

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    await ensureFanArtTab();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'FanArt!A:I',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ artworks: [] });
    }

    const artworks = rows.slice(1)
      .filter((row) => {
        const rowGameId = row[1] || '';
        const rowStatus = row[7] || 'pending';
        const matchesGame = !gameId || rowGameId === gameId;
        const matchesStatus = rowStatus === status;
        return matchesGame && matchesStatus;
      })
      .map((row) => ({
        id: row[0] || '',
        title: row[2] || '',
        artist: row[3] || '',
        artistUrl: row[4] ? `https://twitter.com/${row[4].replace('@', '')}` : undefined,
        imageUrl: row[5] || '',
        character: row[6] || undefined,
        featured: false,
      }));

    return NextResponse.json({ artworks });
  } catch (error) {
    console.error('Error fetching fan art:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fan art', artworks: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { gameId, title, artist, twitter, imageUrl, character } = body;

    if (!title || !artist || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, artist, imageUrl' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    await ensureFanArtTab();

    const id = `fa-${Date.now()}`;
    const submittedAt = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'FanArt!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          id,
          gameId || 'hamieverse',
          title,
          artist,
          twitter || '',
          imageUrl,
          character || '',
          'pending',
          submittedAt,
        ]],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fan art submitted for review',
      id,
    });
  } catch (error) {
    console.error('Error submitting fan art:', error);
    return NextResponse.json(
      { error: 'Failed to submit fan art' },
      { status: 500 }
    );
  }
}
