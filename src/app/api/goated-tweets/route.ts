import { NextResponse } from 'next/server';
import { getGoatedTweets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tweets = await getGoatedTweets();
    return NextResponse.json(tweets);
  } catch (error) {
    console.error('Error fetching goated tweets:', error);
    return NextResponse.json({ error: 'Failed to fetch goated tweets' }, { status: 500 });
  }
}
