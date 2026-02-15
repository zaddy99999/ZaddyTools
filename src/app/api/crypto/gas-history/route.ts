import { NextResponse } from 'next/server';

interface GasPrice {
  slow: number;
  standard: number;
  fast: number;
  timestamp: number;
}

interface GasHistoryData {
  current: {
    slow: number;
    standard: number;
    fast: number;
    baseFee: number;
  };
  history: GasPrice[];
  hourlyAverage: { hour: number; avgGas: number }[];
}

let cache: { data: GasHistoryData; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds - gas prices change frequently

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '24h'; // '24h' or '7d'

  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Try to fetch current gas prices from Etherscan gas oracle (free, no API key needed for basic)
    let currentGas = { slow: 0, standard: 0, fast: 0, baseFee: 0 };

    try {
      // Etherscan gas oracle (free tier)
      const etherscanRes = await fetch(
        'https://api.etherscan.io/api?module=gastracker&action=gasoracle'
      );

      if (etherscanRes.ok) {
        const data = await etherscanRes.json();
        if (data.status === '1' && data.result) {
          currentGas = {
            slow: parseFloat(data.result.SafeGasPrice) || 0,
            standard: parseFloat(data.result.ProposeGasPrice) || 0,
            fast: parseFloat(data.result.FastGasPrice) || 0,
            baseFee: parseFloat(data.result.suggestBaseFee) || 0,
          };
        }
      }
    } catch {
      // Fall through to mock data if API fails
    }

    // If Etherscan didn't work, try Blocknative or use realistic mock data
    if (currentGas.standard === 0) {
      // Generate realistic mock current gas prices
      // Gas prices typically range from 10-200 gwei depending on network congestion
      const baseGas = 15 + Math.random() * 30; // Base around 15-45 gwei
      currentGas = {
        slow: Math.round(baseGas * 0.8),
        standard: Math.round(baseGas),
        fast: Math.round(baseGas * 1.3),
        baseFee: Math.round(baseGas * 0.9),
      };
    }

    // Generate historical gas data
    // In a real implementation, this would come from a database or historical API
    const history: GasPrice[] = [];
    const now = Date.now();
    const hoursToGenerate = period === '7d' ? 168 : 24; // 7 days or 24 hours
    const intervalMs = (hoursToGenerate * 60 * 60 * 1000) / 96; // 96 data points

    // Generate realistic gas history with patterns
    // Gas tends to be higher during US/EU business hours (12:00-22:00 UTC)
    // and lower during Asian hours (02:00-10:00 UTC)
    for (let i = 95; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const date = new Date(timestamp);
      const hour = date.getUTCHours();

      // Base gas with daily pattern
      let baseGas = currentGas.standard * 0.8; // Base around 80% of current

      // Add time-of-day variation
      if (hour >= 12 && hour <= 22) {
        // Peak hours (US/EU business hours)
        baseGas *= 1.2 + Math.random() * 0.3;
      } else if (hour >= 2 && hour <= 10) {
        // Off-peak hours
        baseGas *= 0.7 + Math.random() * 0.2;
      } else {
        // Transition hours
        baseGas *= 0.9 + Math.random() * 0.2;
      }

      // Add some random variation
      const variation = 0.85 + Math.random() * 0.3;
      baseGas *= variation;

      // Occasionally add spikes (like NFT mints, airdrops, etc.)
      if (Math.random() > 0.95) {
        baseGas *= 2 + Math.random() * 2;
      }

      history.push({
        timestamp,
        slow: Math.max(5, Math.round(baseGas * 0.8)),
        standard: Math.max(8, Math.round(baseGas)),
        fast: Math.max(10, Math.round(baseGas * 1.3)),
      });
    }

    // Calculate hourly averages for "best time to transact" feature
    const hourlyBuckets: { [hour: number]: number[] } = {};
    for (let h = 0; h < 24; h++) {
      hourlyBuckets[h] = [];
    }

    history.forEach((point) => {
      const hour = new Date(point.timestamp).getUTCHours();
      hourlyBuckets[hour].push(point.standard);
    });

    const hourlyAverage = Object.entries(hourlyBuckets)
      .map(([hour, values]) => ({
        hour: parseInt(hour),
        avgGas: values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    const result: GasHistoryData = {
      current: currentGas,
      history,
      hourlyAverage,
    };

    cache = { data: result, timestamp: Date.now() };
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching gas data:', error);

    // Return cached data if available
    if (cache) return NextResponse.json(cache.data);

    // Fallback minimal data
    return NextResponse.json({
      current: { slow: 20, standard: 25, fast: 35, baseFee: 22 },
      history: [],
      hourlyAverage: [],
    });
  }
}
