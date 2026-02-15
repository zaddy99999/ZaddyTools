import { NextResponse } from 'next/server';

// Trending crypto topics/keywords - updated periodically
const TRENDING_TOPICS = [
  { word: 'AI Agents', count: 2450, sentiment: 'positive' as const },
  { word: 'RWA', count: 1890, sentiment: 'positive' as const },
  { word: 'DePIN', count: 1650, sentiment: 'positive' as const },
  { word: 'Restaking', count: 1420, sentiment: 'positive' as const },
  { word: 'Layer 2', count: 1380, sentiment: 'neutral' as const },
  { word: 'Memecoin', count: 1250, sentiment: 'neutral' as const },
  { word: 'ETF Flows', count: 1180, sentiment: 'positive' as const },
  { word: 'Airdrop', count: 1050, sentiment: 'positive' as const },
  { word: 'Points', count: 980, sentiment: 'neutral' as const },
  { word: 'Modular', count: 920, sentiment: 'positive' as const },
  { word: 'Intent', count: 850, sentiment: 'neutral' as const },
  { word: 'Account Abstraction', count: 780, sentiment: 'positive' as const },
  { word: 'DA Layer', count: 720, sentiment: 'neutral' as const },
  { word: 'Parallel EVM', count: 680, sentiment: 'positive' as const },
  { word: 'ZK Proofs', count: 650, sentiment: 'positive' as const },
  { word: 'Liquid Staking', count: 620, sentiment: 'positive' as const },
  { word: 'DEX Aggregator', count: 580, sentiment: 'neutral' as const },
  { word: 'Cross-chain', count: 540, sentiment: 'neutral' as const },
  { word: 'Governance', count: 490, sentiment: 'neutral' as const },
  { word: 'Yield', count: 460, sentiment: 'positive' as const },
];

export async function GET() {
  // Add some randomization to make it feel more dynamic
  const shuffled = [...TRENDING_TOPICS].map(topic => ({
    ...topic,
    count: topic.count + Math.floor(Math.random() * 200 - 100),
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    topics: shuffled.slice(0, 20),
    lastUpdated: new Date().toISOString(),
  });
}
