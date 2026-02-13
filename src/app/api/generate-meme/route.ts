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
              text: `Create an illustration prompt for a fun cartoon meme.

IMAGE 1: A cartoon/mascot character - describe their visual design
IMAGE 2: A meme scene/template - describe the pose and setting

Your task: Write a prompt to illustrate the cartoon character from Image 1 in the scene/pose from Image 2.

IMPORTANT FOR SAFETY:
- Describe Image 1 as an "original cartoon mascot" or "illustrated character" (NOT a real person)
- Keep descriptions family-friendly and artistic
- Focus on colors, shapes, and cartoon features
- Avoid any language about "replacing" or "removing" people

Describe the cartoon character:
- Art style (cartoon, illustrated, mascot-style)
- Main colors and design elements
- Distinctive cartoon features

Describe the scene/pose to recreate:
- The action or pose
- The background setting
- The mood/vibe

Write a clean, safe prompt for generating "an original cartoon illustration of [character description] in [scene/pose]".

${customPrompt ? `Additional context: ${customPrompt}` : ''}

Return ONLY the final prompt. Keep it artistic and family-friendly.`,
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

    let dallePrompt = visionResponse.choices[0]?.message?.content;
    console.log('Generated DALL-E prompt:', dallePrompt);

    if (!dallePrompt) {
      return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

    // Safety: Prepend context to help DALL-E understand this is artistic/cartoon
    dallePrompt = `Digital art illustration, cartoon style: ${dallePrompt}. Style: colorful cartoon illustration, family-friendly, meme art.`;

    // Step 2: Generate the image with DALL-E
    const imageResponse = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
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
    const errorMessage = error?.error?.message || error?.message || 'Generation failed';
    const statusCode = error?.status || 500;
    return NextResponse.json({
      error: errorMessage,
      details: error?.error?.code || 'unknown'
    }, { status: statusCode });
  }
}
