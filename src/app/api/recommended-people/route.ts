import { NextResponse } from 'next/server';
import { getRecommendedPeople } from '@/lib/sheets';

export async function GET() {
  try {
    const people = await getRecommendedPeople();
    return NextResponse.json(people);
  } catch (error) {
    console.error('Error fetching recommended people:', error);
    return NextResponse.json({ error: 'Failed to fetch recommended people' }, { status: 500 });
  }
}
