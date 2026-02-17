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
    const { title, description, instruction } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Missing title or description' }, { status: 400 });
    }

    const systemPrompt = `You are a technical writer helping edit developer notes for a crypto/web3 tools website called ZaddyTools.
Your job is to improve the clarity, conciseness, and professionalism of the notes while keeping them accessible and friendly.
Keep descriptions brief (1-2 sentences max). Use active voice. Be specific about what changed.
Respond with ONLY a JSON object with "title" and "description" fields - no other text.`;

    const userPrompt = instruction
      ? `Edit this developer note according to these instructions: "${instruction}"\n\nTitle: ${title}\nDescription: ${description}`
      : `Improve this developer note to be clearer and more professional:\n\nTitle: ${title}\nDescription: ${description}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          title: parsed.title || title,
          description: parsed.description || description,
        });
      }
    } catch {
      // If JSON parsing fails, return original
      console.error('Failed to parse AI response:', responseText);
    }

    return NextResponse.json({ title, description });
  } catch (error) {
    console.error('Error with AI edit:', error);
    return NextResponse.json({ error: 'Failed to process AI edit' }, { status: 500 });
  }
}
