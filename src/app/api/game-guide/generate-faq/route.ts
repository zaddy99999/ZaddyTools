import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGameGuideDocsWithContent } from '@/lib/sheets';
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
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // Get docs with fetched content
    const docs = await getGameGuideDocsWithContent(gameId);

    if (docs.length === 0) {
      return NextResponse.json({ error: 'No documentation found for this game' }, { status: 404 });
    }

    // Combine all doc content
    const combinedContent = docs.map(d => `## ${d.title}\n\n${d.content}`).join('\n\n---\n\n');
    const gameName = docs[0].gameName || gameId;

    console.log(`Generating FAQs for ${gameName} with ${combinedContent.length} chars of content`);

    // Check for AI service configuration
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Use Groq to generate FAQs
    const systemPrompt = `You are an expert at analyzing game documentation and creating helpful FAQ entries.
Given documentation about a Web3 game, generate 10-15 FAQ entries that would help new players.

Each FAQ should have:
1. Keywords: 2-5 lowercase words that users might search for (comma-separated)
2. Answer: A helpful, concise answer (2-4 sentences)

Focus on:
- Basic gameplay mechanics
- NFT collections and their utility
- Token information
- How to get started
- Earning/staking mechanics
- Unique features of the game

Output ONLY valid JSON in this exact format:
[
  {"keywords": "keyword1, keyword2", "answer": "The answer here."},
  {"keywords": "keyword3, keyword4", "answer": "Another answer here."}
]`;

    const userPrompt = `Generate FAQ entries for ${gameName} based on this documentation:

${combinedContent.substring(0, 12000)}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const completion = await groqResponse.json();
    const aiContent = completion.choices?.[0]?.message?.content || '[]';

    // Parse the JSON response
    let faqs: { keywords: string; answer: string }[];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      faqs = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Write FAQs to sheet
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // First, remove existing FAQs for this game
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'GameGuideFAQ!A:C',
    });

    const existingRows = existingResponse.data.values || [];
    const rowsToKeep = [existingRows[0] || ['game_id', 'keywords', 'answer']]; // Keep header

    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i][0] !== gameId) {
        rowsToKeep.push(existingRows[i]);
      }
    }

    // Add new FAQs
    const newRows = faqs.map(faq => [gameId, faq.keywords, faq.answer]);
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
      gameName,
      faqCount: faqs.length,
      faqs,
    });

  } catch (error) {
    console.error('Generate FAQ error:', error);
    return NextResponse.json({ error: 'Failed to generate FAQs' }, { status: 500 });
  }
}

// GET endpoint to check docs for a game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId parameter' }, { status: 400 });
    }

    const docs = await getGameGuideDocsWithContent(gameId);

    return NextResponse.json({
      gameId,
      docCount: docs.length,
      docs: docs.map(d => ({
        title: d.title,
        gameName: d.gameName,
        contentLength: d.content.length,
        sourceUrls: d.sourceUrls,
        preview: d.content.substring(0, 500) + (d.content.length > 500 ? '...' : ''),
      })),
    });

  } catch (error) {
    console.error('Get docs error:', error);
    return NextResponse.json({ error: 'Failed to get docs' }, { status: 500 });
  }
}
