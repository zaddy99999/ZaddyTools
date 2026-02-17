import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedPeople, getSuggestions } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Get main recommended people list
    const people = await getRecommendedPeople();

    // Get approved suggestions for recommended-follows to add at the bottom
    const suggestions = await getSuggestions('approved');
    const approvedFollows = suggestions
      .filter(s => s.source === 'recommended-follows' || s.toolType === 'recommended-follows')
      .map(s => ({
        handle: s.handle || s.projectName.replace(/^@/, ''),
        name: s.projectName,
        category: 'Community Suggested',
        priority: false,
      }));

    // Filter out any that are already in the main list
    const existingHandles = new Set(people.map(p => p.handle.toLowerCase()));
    const newFollows = approvedFollows.filter(f => !existingHandles.has(f.handle.toLowerCase()));

    // Append approved suggestions at the bottom
    return NextResponse.json([...people, ...newFollows]);
  } catch (error) {
    console.error('Error fetching recommended people:', error);
    return NextResponse.json({ error: 'Failed to fetch recommended people' }, { status: 500 });
  }
}
