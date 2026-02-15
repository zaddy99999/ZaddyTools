import { NextRequest, NextResponse } from 'next/server';
import { submitSuggestion } from '@/lib/sheets/suggestions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, type } = body;

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Clean the handle (remove @ if present)
    const cleanHandle = handle.trim().replace(/^@/, '');

    if (!cleanHandle) {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
    }

    await submitSuggestion({
      projectName: cleanHandle,
      category: 'web3',
      notes: `Suggested ${type || 'follow'} for recommended follows`,
      toolType: 'recommended-follows',
    });

    return NextResponse.json({ success: true, handle: cleanHandle });
  } catch (error) {
    console.error('Error submitting follow suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}
