import { NextRequest, NextResponse } from 'next/server';
import { getLoreLinks } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId') || undefined;

    const links = await getLoreLinks(gameId);

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Lore links error:', error);
    return NextResponse.json({ error: 'Failed to fetch lore links' }, { status: 500 });
  }
}
