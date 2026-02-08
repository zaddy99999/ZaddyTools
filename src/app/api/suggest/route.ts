import { NextResponse } from 'next/server';
import { submitSuggestion, SuggestionData } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.projectName || !body.projectName.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!body.giphyUrl && !body.tiktokUrl) {
      return NextResponse.json(
        { error: 'At least one URL (GIPHY or TikTok) is required' },
        { status: 400 }
      );
    }

    if (!body.category || !['web2', 'web3'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Category must be web2 or web3' },
        { status: 400 }
      );
    }

    const suggestion: SuggestionData = {
      projectName: body.projectName.trim(),
      giphyUrl: body.giphyUrl?.trim() || undefined,
      tiktokUrl: body.tiktokUrl?.trim() || undefined,
      category: body.category,
      notes: body.notes?.trim() || undefined,
    };

    await submitSuggestion(suggestion);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}
