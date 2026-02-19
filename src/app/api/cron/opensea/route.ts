import { NextRequest, NextResponse } from 'next/server';
import { validateCronSecret } from '@/lib/config';
import { saveOpenSeaSnapshots, cleanupOldOpenSeaHistory, OpenSeaSnapshot } from '@/lib/sheets/openseaHistory';

const OPENSEA_API = 'https://api.opensea.io/api/v2';

export const maxDuration = 60;

interface OpenSeaCollection {
  collection: string;
  name: string;
  contracts: Array<{ chain: string }>;
}

interface CollectionStats {
  total: {
    volume: number;
    floor_price: number;
    floor_price_symbol: string;
    num_owners: number;
    market_cap: number;
  };
  intervals: Array<{
    interval: string;
    volume: number;
  }>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCollectionStats(
  collection: OpenSeaCollection,
  apiKey: string
): Promise<OpenSeaSnapshot | null> {
  try {
    const statsResponse = await fetch(
      `${OPENSEA_API}/collections/${collection.collection}/stats`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      }
    );

    if (statsResponse.ok) {
      const stats: CollectionStats = await statsResponse.json();
      const oneDayInterval = stats.intervals?.find(i => i.interval === 'one_day');
      const primaryChain = collection.contracts?.[0]?.chain || 'ethereum';

      return {
        slug: collection.collection,
        name: collection.name,
        floorPrice: stats.total?.floor_price ?? 0,
        floorPriceSymbol: stats.total?.floor_price_symbol || 'ETH',
        volume24h: oneDayInterval?.volume ?? 0,
        owners: stats.total?.num_owners ?? 0,
        marketCap: stats.total?.market_cap ?? 0,
        chain: primaryChain,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  return handleSnapshot(request);
}

export async function POST(request: NextRequest) {
  return handleSnapshot(request);
}

async function handleSnapshot(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '') || null;

  if (!validateCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenSea API key not configured' }, { status: 500 });
  }

  try {
    console.log('Starting OpenSea floor price snapshot...');

    // Fetch top collections by market cap
    const collectionsResponse = await fetch(
      `${OPENSEA_API}/collections?order_by=market_cap&limit=100`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      }
    );

    if (!collectionsResponse.ok) {
      throw new Error(`OpenSea API error: ${collectionsResponse.status}`);
    }

    const collectionsData = await collectionsResponse.json();
    const collections: OpenSeaCollection[] = collectionsData.collections || [];

    // Fetch stats in batches
    const snapshots: OpenSeaSnapshot[] = [];
    const batchSize = 10;

    for (let i = 0; i < collections.length; i += batchSize) {
      const batch = collections.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(collection => fetchCollectionStats(collection, apiKey))
      );

      for (const result of batchResults) {
        if (result && result.floorPrice >= 0.01) {
          snapshots.push(result);
        }
      }

      if (i + batchSize < collections.length) {
        await delay(100);
      }
    }

    console.log(`Fetched ${snapshots.length} valid ETH collection snapshots`);

    // --- Fetch Abstract chain collections ---
    let abstractCount = 0;
    try {
      const abstractResponse = await fetch(
        `${OPENSEA_API}/collections?chain=abstract&order_by=seven_day_volume&limit=30`,
        {
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': apiKey,
          },
        }
      );

      if (abstractResponse.ok) {
        const abstractData = await abstractResponse.json();
        const abstractCollections: OpenSeaCollection[] = abstractData.collections || [];

        // Track existing slugs to deduplicate
        const existingSlugs = new Set(snapshots.map(s => s.slug));

        for (let i = 0; i < abstractCollections.length; i += batchSize) {
          const batch = abstractCollections.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(collection => fetchCollectionStats(collection, apiKey))
          );

          for (const result of batchResults) {
            if (result && result.floorPrice >= 0.001 && !existingSlugs.has(result.slug)) {
              result.chain = 'abstract';
              snapshots.push(result);
              existingSlugs.add(result.slug);
              abstractCount++;
            }
          }

          if (i + batchSize < abstractCollections.length) {
            await delay(100);
          }
        }

        console.log(`Fetched ${abstractCount} valid Abstract collection snapshots`);
      } else {
        console.warn(`Abstract collections fetch failed: ${abstractResponse.status}`);
      }
    } catch (abstractError) {
      console.error('Abstract collections fetch error (non-fatal):', abstractError);
    }

    console.log(`Total snapshots to save: ${snapshots.length} (ETH: ${snapshots.length - abstractCount}, Abstract: ${abstractCount})`);

    // Save to Google Sheets
    await saveOpenSeaSnapshots(snapshots);

    // Cleanup old data (keep 30 days)
    const deletedRows = await cleanupOldOpenSeaHistory();
    if (deletedRows > 0) {
      console.log(`Cleaned up ${deletedRows} old history rows`);
    }

    return NextResponse.json({
      success: true,
      snapshotsStored: snapshots.length,
      abstractSnapshotsStored: abstractCount,
      cleanedUpRows: deletedRows,
    });
  } catch (error) {
    console.error('OpenSea snapshot failed:', error);
    return NextResponse.json(
      { error: 'Failed to snapshot OpenSea data' },
      { status: 500 }
    );
  }
}
