import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Whitelisted wallet address for admin access
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

function isAuthorized(request: Request): boolean {
  const walletAddress = request.headers.get('x-wallet-address');
  if (walletAddress && walletAddress.toLowerCase() === WHITELISTED_WALLET) {
    return true;
  }
  return false;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, chatHistory, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const systemPrompt = `You are a helpful AI assistant for ZaddyTools, a crypto/web3 tools website. You help the admin manage developer notes and answer questions.

Current context:
${context || 'Admin dashboard - Developer Notes section'}

Keep responses concise and helpful. You can help with:
- Editing/improving developer notes (use #1, #2 etc to reference specific notes)
- Answering questions about the tools or features
- Suggesting improvements
- General assistance

If the user wants to edit notes, tell them to reference specific notes with # (e.g., "make #1 shorter" or "edit all notes to be more concise").`;

    // Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add chat history for context
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error with chat:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
