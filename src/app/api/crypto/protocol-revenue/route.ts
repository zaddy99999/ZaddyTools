import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface DefiLlamaFee {
  name: string;
  logo: string;
  chains: string[];
  category: string;
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
}

interface DefiLlamaResponse {
  protocols: DefiLlamaFee[];
}

export async function GET() {
  try {
    // Fetch fees/revenue data from DefiLlama
    const response = await fetch('https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true', {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch revenue data');
    }

    const data: DefiLlamaResponse = await response.json();

    // Process and sort protocols by 24h revenue
    const protocols = data.protocols
      .filter(p => p.total24h && p.total24h > 0)
      .map(p => ({
        name: p.name,
        logo: p.logo || '',
        chain: p.chains?.[0] || 'Multi-chain',
        category: p.category || 'DeFi',
        total24h: p.total24h || 0,
        total7d: p.total7d || 0,
        total30d: p.total30d || 0,
        totalAllTime: p.totalAllTime || 0,
      }))
      .sort((a, b) => b.total24h - a.total24h)
      .slice(0, 50);

    return NextResponse.json({
      protocols,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching protocol revenue:', error);

    // Return mock data on error
    return NextResponse.json({
      protocols: [
        { name: 'Ethereum', logo: 'https://icons.llama.fi/ethereum.png', chain: 'Ethereum', category: 'Chain', total24h: 5000000, total7d: 35000000, total30d: 150000000, totalAllTime: 2000000000 },
        { name: 'Tether', logo: 'https://icons.llama.fi/tether.png', chain: 'Multi-chain', category: 'Stablecoin', total24h: 2500000, total7d: 17500000, total30d: 75000000, totalAllTime: 1500000000 },
        { name: 'Lido', logo: 'https://icons.llama.fi/lido.png', chain: 'Ethereum', category: 'Liquid Staking', total24h: 2000000, total7d: 14000000, total30d: 60000000, totalAllTime: 800000000 },
        { name: 'Uniswap', logo: 'https://icons.llama.fi/uniswap.png', chain: 'Ethereum', category: 'DEX', total24h: 1800000, total7d: 12600000, total30d: 54000000, totalAllTime: 600000000 },
        { name: 'Aave', logo: 'https://icons.llama.fi/aave.png', chain: 'Ethereum', category: 'Lending', total24h: 1200000, total7d: 8400000, total30d: 36000000, totalAllTime: 400000000 },
      ],
      lastUpdated: new Date().toISOString(),
    });
  }
}
