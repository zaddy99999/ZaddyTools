import { NextResponse } from 'next/server';
import { getPeopleTierMakerItems, addPeopleTierMakerItems } from '@/lib/sheets';

export async function GET() {
  try {
    const items = await getPeopleTierMakerItems();

    // Deduplicate by handle (keep first occurrence)
    const seenHandles = new Set<string>();
    const deduped = items.filter(item => {
      const handleLower = item.handle.toLowerCase();
      if (seenHandles.has(handleLower)) {
        return false;
      }
      seenHandles.add(handleLower);
      return true;
    });

    return NextResponse.json(deduped);
  } catch (error) {
    console.error('Error fetching people tier maker items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { items } = body;
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }
    await addPeopleTierMakerItems(items);
    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Error adding people tier maker items:', error);
    return NextResponse.json({ error: 'Failed to add items' }, { status: 500 });
  }
}
