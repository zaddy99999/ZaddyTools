import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { templateUrl, characterUrl, customPrompt } = await request.json();

    if (!templateUrl || !characterUrl) {
      return NextResponse.json({ error: 'Both template and character images required' }, { status: 400 });
    }

    // Step 1: Use GPT-4 Vision to understand both images and create a detailed prompt
    const visionResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are creating a DALL-E prompt to swap a character into a meme template.

IMAGE 1: The CHARACTER (PFP) - This character must appear EXACTLY as shown, with ZERO modifications
IMAGE 2: The MEME TEMPLATE - Copy ONLY the scene/pose/background, COMPLETELY REMOVE the original subject

CRITICAL RULES:
1. The character from Image 1 must be reproduced EXACTLY - same colors, same art style, same features, same everything. NO changes allowed.
2. The original person/character in the meme template (Image 2) must be COMPLETELY REMOVED and replaced with the character from Image 1.
3. Only copy the SCENE, POSE, and BACKGROUND from the meme template - NOT the original subject.

ANALYSIS REQUIRED:

CHARACTER (Image 1) - Describe with EXTREME precision:
- Exact art style (cartoon, pixel art, anime, 3D render, etc.)
- Exact colors (be specific: "bright green", "navy blue", etc.)
- Every visual feature (clothing, accessories, facial features, body type)
- The character's overall vibe/aesthetic

MEME TEMPLATE (Image 2) - Describe:
- The pose/action the subject is doing (this is what the character will do)
- The background/environment
- The composition and framing
- What makes this meme recognizable (but IGNORE the original subject's appearance)

Write a DALL-E prompt that places the UNCHANGED character from Image 1 into the scene from Image 2, adopting the pose but keeping their exact appearance.

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Return ONLY the DALL-E prompt. Be obsessively detailed about the character's exact appearance.`,
            },
            {
              type: 'image_url',
              image_url: { url: characterUrl },
            },
            {
              type: 'image_url',
              image_url: { url: templateUrl },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const dallePrompt = visionResponse.choices[0]?.message?.content;

    if (!dallePrompt) {
      return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

    // Step 2: Generate the image with DALL-E
    const imageResponse = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const generatedUrl = imageResponse.data?.[0]?.url;

    if (!generatedUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: generatedUrl,
      prompt: dallePrompt
    });

  } catch (error: any) {
    console.error('Meme generation error:', error);
    return NextResponse.json({
      error: error.message || 'Generation failed'
    }, { status: 500 });
  }
}
