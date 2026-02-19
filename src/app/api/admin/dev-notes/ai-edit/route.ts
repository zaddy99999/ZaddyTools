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
    const { notes, instruction, chatHistory } = body;

    // Handle array of notes
    if (notes && Array.isArray(notes) && notes.length > 0) {
      const systemPrompt = `You are a JSON editor. You ONLY output valid JSON arrays. No explanations, no markdown, no extra text.

STRICT RULES - FOLLOW EXACTLY:
1. When user provides exact text (after "should be:", "change to:", "set to:", quotes, etc.) - USE THEIR EXACT WORDS. Do NOT paraphrase, rewrite, improve, or change their text in any way.
2. If user says "description should be X" - set description to exactly X, keep original title unchanged
3. If user says "title should be X" - set title to exactly X, keep original description unchanged
4. If user says "make it shorter/longer/clearer" - you may edit, but stay close to original meaning
5. NEVER add information the user didn't provide
6. NEVER remove information unless user asks
7. NEVER change capitalization, punctuation, or wording of user-provided text
8. If unsure, keep the original value

Output ONLY: [{"title": "...", "description": "..."}]
No other text before or after the JSON.`;

      const notesText = notes.map((n: { title: string; description: string }, i: number) =>
        `Note ${i + 1}:\nTitle: ${n.title}\nDescription: ${n.description}`
      ).join('\n\n');

      const userPrompt = instruction
        ? `Instruction: ${instruction}\n\nNotes to edit:\n${notesText}\n\nApply the instruction. Keep original values for fields not mentioned.`
        : `Improve these notes:\n${notesText}`;

      // Simple messages - no chat history to avoid confusion
      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Parse JSON array response
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            return NextResponse.json({
              edited: parsed.map((p: { title?: string; description?: string }, i: number) => ({
                title: p.title || notes[i]?.title || '',
                description: p.description || notes[i]?.description || '',
              })),
            });
          }
        }
      } catch {
        console.error('Failed to parse AI array response:', responseText);
      }

      // Fallback: return original notes
      return NextResponse.json({
        edited: notes.map((n: { title: string; description: string }) => ({
          title: n.title,
          description: n.description,
        })),
      });
    }

    // Legacy single note handling
    const { title, description } = body;
    if (!title || !description) {
      return NextResponse.json({ error: 'Missing notes array or title/description' }, { status: 400 });
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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error with AI edit:', errorMsg, error);
    return NextResponse.json({ error: `AI edit failed: ${errorMsg}` }, { status: 500 });
  }
}
