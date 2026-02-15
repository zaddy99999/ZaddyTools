import { NextResponse } from 'next/server';
import { getMemecoinsTierMaker } from '@/lib/sheets/tierMaker';

export async function GET() {
  try {
    // Get memecoins from TierMaker List (Projects) where category is Memecoins
    const memecoins = await getMemecoinsTierMaker();

    // Transform to tier maker format - uses Twitter avatar like projects
    const items = memecoins.map((coin) => ({
      handle: coin.handle,
      name: coin.name,
      category: coin.category || 'Memecoins',
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching memecoins:', error);
    return NextResponse.json([]);
  }
}
