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

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const TAB_NAME = 'Questions';

const questions = [
  // Easy questions
  ['hamieverse', "What is Hamie's species?", 'Hamster', 'Mouse', 'Rat', 'Guinea Pig', 'A', 'Characters', 'easy'],
  ['hamieverse', 'What is the name of the city where Hamie works?', 'Aetherion', 'Virella', 'Neon Spire', 'Undercode', 'A', 'World', 'easy'],
  ['hamieverse', "What was Hamie's worker ID number?", '#146B', '#257A', '#101B', '#479C', 'A', 'Characters', 'easy'],
  ['hamieverse', 'Where did Hamie live before coming to the city?', 'The Beyond with his grandmother', 'Neon Spire', 'Section 9', 'The Undercode', 'A', 'Lore', 'easy'],
  ['hamieverse', 'What is the name of the digital identity Hamie creates?', 'Simba', 'Echo', 'Doppel', 'Red Eye', 'A', 'Characters', 'easy'],

  // Medium questions
  ['hamieverse', 'Who runs the Respeculators shadow coalition?', 'Sam and Lira', 'Hamie and Silas', 'IronPaw and Ace', 'Kael and Orrien', 'A', 'Factions', 'medium'],
  ['hamieverse', 'What did Hamie receive from the homeless man under the overpass?', 'A cracked pendant with a USB drive', 'A bag of coins', 'A secret map', 'A weapon', 'A', 'Lore', 'medium'],
  ['hamieverse', 'What protocol did worker #257A invoke to save Hamie?', 'Protocol Four-Seven-Grey', 'Protocol Nine-Alpha', 'Protocol Red Eye', 'Protocol Doppel', 'A', 'Lore', 'medium'],
  ['hamieverse', 'What is the Undercode?', 'A shadow digital ecosystem', 'A physical underground city', 'A type of currency', 'A surveillance system', 'A', 'World', 'medium'],
  ['hamieverse', 'How much AC did Hamie gain from the Aethercreed operation?', '13,000,000 AC', '1,000,000 AC', '100,000 AC', '500,000 AC', 'A', 'Lore', 'medium'],

  // Hard questions
  ['hamieverse', "What does the Red Eye in Hamie's ceiling represent?", 'Surveillance system', 'A portal', 'A power source', 'A timer', 'A', 'World', 'hard'],
  ['hamieverse', "What is the name of the homeless man's dog?", 'Simba', 'Lucky', 'Max', 'Shadow', 'A', 'Characters', 'hard'],
  ['hamieverse', 'What did Alistair Veynar view as weakness?', 'Emotion', 'Physical strength', 'Intelligence', 'Loyalty', 'A', 'Lore', 'hard'],
  ['hamieverse', "What is Silas's relationship to the Veynar family?", 'He is part of the Veynar legacy', 'He is an enemy', 'He is unrelated', 'He is a servant', 'A', 'Characters', 'hard'],
  ['hamieverse', "What symbol represents fleeting freedom in Silas's story?", 'A butterfly', 'A bird', 'A flower', 'A star', 'A', 'Motifs', 'hard'],
];

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

    // Check if tab exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TAB_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TAB_NAME } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TAB_NAME}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'category', 'difficulty']],
        },
      });
    }

    // Clear existing questions (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A2:I100`,
    });

    // Add all questions
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: questions,
      },
    });

    return NextResponse.json({ success: true, count: questions.length });
  } catch (error) {
    console.error('Error populating quiz:', error);
    return NextResponse.json({ error: 'Failed to populate quiz' }, { status: 500 });
  }
}
