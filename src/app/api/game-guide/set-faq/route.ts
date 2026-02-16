import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ensureGameGuideFAQTab } from '@/lib/sheets';
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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { gameId, faqs } = body;

    if (!gameId || !faqs || !Array.isArray(faqs)) {
      return NextResponse.json({ error: 'Missing gameId or faqs array' }, { status: 400 });
    }

    // Ensure FAQ tab exists
    await ensureGameGuideFAQTab();

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing FAQs
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'GameGuideFAQ!A:C',
    });

    const existingRows = existingResponse.data.values || [];
    const rowsToKeep = [existingRows[0] || ['game_id', 'keywords', 'answer']];

    // Keep FAQs for other games
    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i][0] !== gameId) {
        rowsToKeep.push(existingRows[i]);
      }
    }

    // Add new FAQs
    const newRows = faqs.map((faq: { keywords: string; answer: string }) => [
      gameId,
      faq.keywords,
      faq.answer,
    ]);

    const allRows = [...rowsToKeep, ...newRows];

    // Clear and rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'GameGuideFAQ!A:C',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'GameGuideFAQ!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: allRows,
      },
    });

    return NextResponse.json({
      success: true,
      gameId,
      faqCount: faqs.length,
    });

  } catch (error) {
    console.error('Set FAQ error:', error);
    return NextResponse.json({ error: 'Failed to set FAQs' }, { status: 500 });
  }
}
