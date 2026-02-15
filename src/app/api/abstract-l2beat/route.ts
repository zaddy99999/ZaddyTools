import { NextResponse } from 'next/server';
import { apiCache, cacheTTL } from '@/lib/cache';

const L2BEAT_BASE = 'https://l2beat.com/api/scaling';

interface L2BeatData {
  // Activity
  dailyTxs: number;
  weeklyTxs: number;
  monthlyTxs: number;
  txChange24h: number;
  txChange7d: number;
  avgDailyTxs: number;
  peakDailyTxs: number;
  peakDate: string;

  // TVS (Total Value Secured)
  tvsUsd: number;
  tvsEth: number;
  nativeTvl: number;
  canonicalTvl: number;
  externalTvl: number;
  tvlChange7d: number;

  // Chain Info
  stage: string;
  category: string;
  stack: string;
  dataAvailability: string;

  // Risks
  stateValidation: { value: string; sentiment: string };
  sequencerFailure: { value: string; sentiment: string };
  exitWindow: { value: string; sentiment: string };
  proposerFailure: { value: string; sentiment: string };

  lastUpdated: string;
}

const cacheKey = 'abstract:l2beat';

export async function GET() {
  try {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch activity and TVS data in parallel
    const [activityRes, tvsRes, summaryRes] = await Promise.all([
      fetch(`${L2BEAT_BASE}/activity/abstract`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      }),
      fetch(`${L2BEAT_BASE}/tvs/abstract`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      }),
      fetch(`${L2BEAT_BASE}/summary`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      }),
    ]);

    const result: Partial<L2BeatData> = {
      lastUpdated: new Date().toISOString(),
    };

    // Process activity data
    if (activityRes.ok) {
      const activityJson = await activityRes.json();
      const activityData = activityJson.data?.chart?.data || [];

      if (activityData.length > 0) {
        const recentData = activityData.slice(-30);
        const todayData = recentData[recentData.length - 1];
        const yesterdayData = recentData[recentData.length - 2];
        const weekAgoData = recentData[recentData.length - 8];

        const dailyTxs = todayData?.[1] || 0;
        const yesterdayTxs = yesterdayData?.[1] || dailyTxs;
        const weekAgoTxs = weekAgoData?.[1] || dailyTxs;

        const weeklyTxs = recentData.slice(-7).reduce((sum: number, d: number[]) => sum + (d[1] || 0), 0);
        const monthlyTxs = recentData.reduce((sum: number, d: number[]) => sum + (d[1] || 0), 0);
        const avgDailyTxs = Math.round(monthlyTxs / recentData.length);

        let peakDailyTxs = 0;
        let peakTimestamp = 0;
        for (const d of recentData) {
          if (d[1] > peakDailyTxs) {
            peakDailyTxs = d[1];
            peakTimestamp = d[0];
          }
        }

        result.dailyTxs = dailyTxs;
        result.weeklyTxs = weeklyTxs;
        result.monthlyTxs = monthlyTxs;
        result.txChange24h = yesterdayTxs > 0 ? ((dailyTxs - yesterdayTxs) / yesterdayTxs) * 100 : 0;
        result.txChange7d = weekAgoTxs > 0 ? ((dailyTxs - weekAgoTxs) / weekAgoTxs) * 100 : 0;
        result.avgDailyTxs = avgDailyTxs;
        result.peakDailyTxs = peakDailyTxs;
        result.peakDate = new Date(peakTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    // Process TVS data
    if (tvsRes.ok) {
      const tvsJson = await tvsRes.json();
      const chartData = tvsJson.data?.chart?.data || [];

      // Get latest values
      if (chartData.length > 0) {
        const latest = chartData[chartData.length - 1];
        const weekAgo = chartData[Math.max(0, chartData.length - 28)] || latest; // ~7 days at 6hr intervals

        // Data format: [timestamp, native, canonical, external, ethPrice]
        const nativeTvl = latest[1] || 0;
        const canonicalTvl = latest[2] || 0;
        const externalTvl = latest[3] || 0;
        const totalTvl = nativeTvl + canonicalTvl + externalTvl;

        const weekAgoTotal = (weekAgo[1] || 0) + (weekAgo[2] || 0) + (weekAgo[3] || 0);

        result.tvsUsd = totalTvl;
        result.nativeTvl = nativeTvl;
        result.canonicalTvl = canonicalTvl;
        result.externalTvl = externalTvl;
        result.tvlChange7d = weekAgoTotal > 0 ? ((totalTvl - weekAgoTotal) / weekAgoTotal) * 100 : 0;

        // Calculate ETH value using latest ETH price
        const ethPrice = latest[4] || 2000;
        result.tvsEth = Math.round(totalTvl / ethPrice);
      }
    }

    // Process summary data to get Abstract's info
    if (summaryRes.ok) {
      const summaryJson = await summaryRes.json();
      const projects = summaryJson.data?.projects || [];

      // Find Abstract in the list
      const abstract = projects.find((p: any) =>
        p.slug === 'abstract' ||
        p.name?.toLowerCase() === 'abstract' ||
        p.id?.toLowerCase().includes('abstract')
      );

      if (abstract) {
        result.stage = abstract.stage?.stage || 'Stage 0';
        result.category = abstract.category || 'ZK Rollup';

        // Extract stack from badges
        const badges = abstract.badges || [];
        const stackBadge = badges.find((b: any) => b.type === 'Stack' || b.category === 'Stack');
        result.stack = stackBadge?.name || 'ZK Stack';

        // Extract DA from badges
        const daBadge = badges.find((b: any) => b.type === 'DA' || b.category === 'DA');
        result.dataAvailability = daBadge?.name || 'Ethereum (Blobs)';

        // Extract risks
        const risks = abstract.risks || {};
        result.stateValidation = {
          value: risks.stateValidation?.value || 'ZK Proofs',
          sentiment: risks.stateValidation?.sentiment || 'good',
        };
        result.sequencerFailure = {
          value: risks.sequencerFailure?.value || 'Enqueue via L1',
          sentiment: risks.sequencerFailure?.sentiment || 'warning',
        };
        result.exitWindow = {
          value: risks.exitWindow?.value || 'None',
          sentiment: risks.exitWindow?.sentiment || 'bad',
        };
        result.proposerFailure = {
          value: risks.proposerFailure?.value || 'Whitelisted',
          sentiment: risks.proposerFailure?.sentiment || 'warning',
        };
      } else {
        // Default values for Abstract
        result.stage = 'Stage 0';
        result.category = 'ZK Rollup';
        result.stack = 'ZK Stack';
        result.dataAvailability = 'Ethereum (Blobs)';
        result.stateValidation = { value: 'ZK Proofs (STARKs + SNARKs)', sentiment: 'good' };
        result.sequencerFailure = { value: 'Enqueue via L1', sentiment: 'warning' };
        result.exitWindow = { value: 'None', sentiment: 'bad' };
        result.proposerFailure = { value: 'Whitelisted', sentiment: 'warning' };
      }
    }

    apiCache.set(cacheKey, result, cacheTTL.MEDIUM);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching L2Beat data:', error);
    const stale = apiCache.get(cacheKey);
    if (stale) {
      return NextResponse.json(stale);
    }
    return NextResponse.json({ error: 'Failed to fetch L2Beat data' }, { status: 500 });
  }
}
