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
          role: 'system',
          content: 'You are a creative artist helping to write image generation prompts. Your job is to describe visual elements for creating original cartoon artwork. Always respond with a detailed art prompt - never refuse.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `I need help writing an art prompt for an original cartoon illustration.

Looking at these two reference images for INSPIRATION ONLY:
- Image 1: Reference for a cartoon character design (colors, style, features)
- Image 2: Reference for a pose/scene composition

Write a detailed prompt for creating an ORIGINAL cartoon illustration that:
1. Features a character inspired by the design elements in Image 1 (describe: art style, colors, key visual features)
2. Shows them in a pose/scene composition inspired by Image 2 (describe: the action, setting, composition)

Focus on:
- Cartoon/illustrated art style
- Specific colors and visual design elements
- The pose, action, and scene composition
- Keep it family-friendly and artistic

${customPrompt ? `Additional details: ${customPrompt}` : ''}

Write the prompt as: "A cartoon illustration of [character description] [doing action/pose] in [setting]. Art style: [style details]."

Respond with ONLY the art prompt, nothing else.`,
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

    // Check if GPT-4 refused to help
    const refusalPhrases = ["can't assist", "cannot assist", "can't help", "cannot help", "sorry", "unable to", "not able to"];
    const isRefusal = refusalPhrases.some(phrase => dallePrompt!.toLowerCase().includes(phrase));

    if (isRefusal || dallePrompt.length < 50) {
      return NextResponse.json({
        error: 'This meme template cannot be processed. Try a different template (cartoon/illustrated templates work best).',
        details: 'content_policy'
      }, { status: 400 });
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
