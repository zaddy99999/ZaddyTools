import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedPeople } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const people = await getRecommendedPeople();
    return NextResponse.json(people);
  } catch (error) {
    console.error('Error fetching recommended people:', error);
    return NextResponse.json({ error: 'Failed to fetch recommended people' }, { status: 500 });
  }
}
