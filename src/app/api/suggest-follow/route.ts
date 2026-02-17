import { NextRequest, NextResponse } from 'next/server';
import { submitSuggestion } from '@/lib/sheets/suggestions';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { handle, type } = body;

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Clean the handle (remove @ if present)
    const cleanHandle = handle.trim().replace(/^@/, '');

    if (!cleanHandle) {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
    }

    // Map the type to a proper toolType for filtering
    const toolTypeMap: Record<string, string> = {
      'person': 'recommended-follows',
      'project': 'recommended-follows',
      'tierlist': 'tier-maker',
      'build-your-team': 'build-your-team',
    };
    const toolType = toolTypeMap[type] || 'recommended-follows';

    await submitSuggestion({
      projectName: cleanHandle,
      category: 'web3',
      notes: `Suggested for ${type || 'recommended follows'}`,
      toolType,
      source: toolType, // e.g., 'recommended-follows', 'tier-maker', 'build-your-team'
    });

    return NextResponse.json({ success: true, handle: cleanHandle });
  } catch (error) {
    console.error('Error submitting follow suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}
