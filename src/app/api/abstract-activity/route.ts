import { NextRequest, NextResponse } from 'next/server';
import { apiCache, cacheTTL } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rateLimit';

const L2BEAT_API = 'https://l2beat.com/api/scaling/activity/abstract';

interface ActivityData {
  dailyTxs: number;
  weeklyTxs: number;
  monthlyTxs: number;
  txChange24h: number;
  txChange7d: number;
  avgDailyTxs: number;
  peakDailyTxs: number;
  peakDate: string;
  lastUpdated: string;
}

const cacheKey = 'abstract:activity';

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute (L2Beat rate limits)
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 30 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(L2BEAT_API, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`L2Beat API error: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data?.chart?.data || [];

    if (data.length === 0) {
      throw new Error('No activity data available');
    }

    // Data format: [timestamp, count, uopsCount]
    // Get recent data (last 30 days)
    const recentData = data.slice(-30);
    const todayData = recentData[recentData.length - 1];
    const yesterdayData = recentData[recentData.length - 2];
    const weekAgoData = recentData[recentData.length - 8];

    // Calculate metrics
    const dailyTxs = todayData?.[1] || 0;
    const yesterdayTxs = yesterdayData?.[1] || dailyTxs;
    const weekAgoTxs = weekAgoData?.[1] || dailyTxs;

    // Weekly sum (last 7 days)
    const weeklyTxs = recentData.slice(-7).reduce((sum: number, d: number[]) => sum + (d[1] || 0), 0);

    // Monthly sum (last 30 days)
    const monthlyTxs = recentData.reduce((sum: number, d: number[]) => sum + (d[1] || 0), 0);

    // Average daily
    const avgDailyTxs = Math.round(monthlyTxs / recentData.length);

    // Peak day
    let peakDailyTxs = 0;
    let peakTimestamp = 0;
    for (const d of recentData) {
      if (d[1] > peakDailyTxs) {
        peakDailyTxs = d[1];
        peakTimestamp = d[0];
      }
    }

    // Calculate percentage changes
    const txChange24h = yesterdayTxs > 0 ? ((dailyTxs - yesterdayTxs) / yesterdayTxs) * 100 : 0;
    const txChange7d = weekAgoTxs > 0 ? ((dailyTxs - weekAgoTxs) / weekAgoTxs) * 100 : 0;

    const result: ActivityData = {
      dailyTxs,
      weeklyTxs,
      monthlyTxs,
      txChange24h,
      txChange7d,
      avgDailyTxs,
      peakDailyTxs,
      peakDate: new Date(peakTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      lastUpdated: new Date().toISOString(),
    };

    apiCache.set(cacheKey, result, cacheTTL.MEDIUM);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Abstract activity:', error);
    const stale = apiCache.get(cacheKey);
    if (stale) {
      return NextResponse.json(stale);
    }
    return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
  }
}
