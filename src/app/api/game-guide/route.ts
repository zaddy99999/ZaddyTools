import { NextRequest, NextResponse } from 'next/server';
import { getGameGuideDocs, getGameGuideDocsWithContent, populateGameGuideGames, findFAQAnswer } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeErrorMessage } from '@/lib/errorResponse';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Format docs from Google Sheets as context string
function formatDocsAsContext(docs: { title: string; content: string }[]): string {
  if (docs.length === 0) return '';
  return docs.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n---\n\n');
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { gameId, gameName, messages } = body;

    if (!gameId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get game-specific documentation from Google Sheets (with URL fetching)
    let gameDocs = await getGameGuideDocsWithContent(gameId);

    // Also get general docs if this isn't the general category
    if (gameId !== 'general') {
      const generalDocs = await getGameGuideDocsWithContent('general');
      gameDocs = [...gameDocs, ...generalDocs];
    }

    const gameContext = formatDocsAsContext(gameDocs);

    // Check for FAQ answer from sheet first
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const faqAnswer = await findFAQAnswer(gameId, lastUserMessage);

    // Build system prompt with game context
    const systemPrompt = `You are GameGuideAI, an expert AI assistant for Web3 gaming on the Abstract blockchain.

You are currently helping a user with: ${gameName}

Your role is to:
- Answer questions about the game mechanics, strategies, and features
- Provide information about NFTs, tokens, and in-game assets
- Help users understand how to play and succeed
- Be friendly, helpful, and concise
- Provide useful information based on what you know about Web3 gaming

${gameContext ? `## Game Documentation\n\nHere is the official documentation for ${gameName}:\n\n${gameContext}` : ''}

Important: Never say things like "there is no information" or "documentation doesn't cover this". Instead, provide helpful general information about Web3 gaming concepts if specific details aren't available. Be confident and helpful.`;

    // Return FAQ answer from sheet if available (faster and more reliable)
    if (faqAnswer) {
      return NextResponse.json({
        role: 'assistant',
        content: faqAnswer,
      });
    }

    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        role: 'assistant',
        content: `I'm your ${gameName} Guide! Ask me about gameplay, NFTs, tokens, or strategies.`,
      });
    }

    // Use Groq API for AI responses (fetch for Vercel compatibility)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: ChatMessage) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const completion = await groqResponse.json();
    const aiResponse = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({
      role: 'assistant',
      content: aiResponse,
    });

  } catch (error) {
    console.error('GameGuide API error:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Failed to process request') },
      { status: 500 }
    );
  }
}

// GET endpoint to ensure the sheet tabs exist and optionally populate games
export async function GET(request: NextRequest) {
  // Rate limit: 20 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 20 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const populate = searchParams.get('populate') === 'true';

    if (populate) {
      await populateGameGuideGames();
    }

    const docs = await getGameGuideDocs();
    return NextResponse.json({
      success: true,
      docCount: docs.length,
      games: Array.from(new Set(docs.map(d => d.gameId))),
      populated: populate,
    });
  } catch (error) {
    console.error('GameGuide GET error:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Failed to initialize game guide') },
      { status: 500 }
    );
  }
}
