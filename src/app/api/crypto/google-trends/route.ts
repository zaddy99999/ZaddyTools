import { NextResponse } from 'next/server';
import { apiCache, cacheTTL } from '@/lib/cache';

interface TrendPoint {
  date: string;
  bitcoin: number;
  ethereum: number;
  crypto: number;
}

interface GoogleTrendsResponse {
  trends: TrendPoint[];
  currentInterest: {
    bitcoin: number;
    ethereum: number;
    crypto: number;
  };
  peakInterest: {
    bitcoin: { value: number; date: string };
    ethereum: { value: number; date: string };
  };
  lastUpdated: string;
}

const cacheKey = 'crypto:google-trends';

async function fetchGoogleTrends(): Promise<GoogleTrendsResponse> {
  // Generate realistic Google Trends data
  // In production, you'd use pytrends or SerpAPI
  const today = new Date();
  const trends: TrendPoint[] = [];

  // Simulate 90 days of trend data with realistic patterns
  // Bitcoin interest correlates with price action
  const basePatterns = {
    bitcoin: [42, 45, 48, 52, 55, 51, 48, 45, 43, 46, 49, 53, 58, 62, 65, 61, 57, 54, 51, 48,
              46, 44, 47, 51, 55, 59, 63, 67, 72, 68, 64, 60, 56, 53, 50, 48, 46, 49, 53, 57,
              61, 65, 69, 73, 78, 82, 79, 75, 71, 67, 64, 61, 58, 55, 52, 50, 48, 51, 54, 58,
              62, 66, 70, 74, 71, 68, 65, 62, 59, 56, 54, 52, 55, 58, 62, 66, 70, 68, 65, 62,
              59, 57, 55, 58, 61, 65, 69, 66, 63, 60],
    ethereum: [28, 30, 32, 35, 38, 36, 34, 32, 30, 33, 36, 39, 42, 45, 48, 46, 44, 42, 40, 38,
               36, 34, 37, 40, 43, 46, 49, 52, 55, 53, 51, 49, 47, 45, 43, 41, 39, 42, 45, 48,
               51, 54, 57, 60, 63, 66, 64, 62, 60, 58, 56, 54, 52, 50, 48, 46, 44, 47, 50, 53,
               56, 59, 62, 65, 63, 61, 59, 57, 55, 53, 51, 49, 52, 55, 58, 61, 64, 62, 60, 58,
               56, 54, 52, 55, 58, 61, 64, 62, 60, 58],
    crypto: [35, 37, 39, 42, 45, 43, 41, 39, 37, 40, 43, 46, 49, 52, 55, 53, 51, 49, 47, 45,
             43, 41, 44, 47, 50, 53, 56, 59, 62, 60, 58, 56, 54, 52, 50, 48, 46, 49, 52, 55,
             58, 61, 64, 67, 70, 73, 71, 69, 67, 65, 63, 61, 59, 57, 55, 53, 51, 54, 57, 60,
             63, 66, 69, 72, 70, 68, 66, 64, 62, 60, 58, 56, 59, 62, 65, 68, 71, 69, 67, 65,
             63, 61, 59, 62, 65, 68, 71, 69, 67, 65],
  };

  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const idx = 89 - i;

    // Add some randomness
    const noise = () => Math.floor(Math.random() * 5) - 2;

    trends.push({
      date: date.toISOString().split('T')[0],
      bitcoin: Math.max(0, Math.min(100, basePatterns.bitcoin[idx] + noise())),
      ethereum: Math.max(0, Math.min(100, basePatterns.ethereum[idx] + noise())),
      crypto: Math.max(0, Math.min(100, basePatterns.crypto[idx] + noise())),
    });
  }

  // Find peaks
  let btcPeak = { value: 0, date: '' };
  let ethPeak = { value: 0, date: '' };

  trends.forEach(t => {
    if (t.bitcoin > btcPeak.value) {
      btcPeak = { value: t.bitcoin, date: t.date };
    }
    if (t.ethereum > ethPeak.value) {
      ethPeak = { value: t.ethereum, date: t.date };
    }
  });

  const latest = trends[trends.length - 1];

  return {
    trends,
    currentInterest: {
      bitcoin: latest.bitcoin,
      ethereum: latest.ethereum,
      crypto: latest.crypto,
    },
    peakInterest: {
      bitcoin: btcPeak,
      ethereum: ethPeak,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const data = await fetchGoogleTrends();
    apiCache.set(cacheKey, data, cacheTTL.LONG);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    const stale = apiCache.get(cacheKey);
    if (stale) {
      return NextResponse.json(stale);
    }
    return NextResponse.json({ error: 'Failed to fetch Google Trends' }, { status: 500 });
  }
}
