export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_14d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number | null;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface GlobalData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies?: number;
  markets?: number;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp?: string;
}

export interface NewsSource {
  id: string;
  title: string;
  color: string;
  priority: number;
}

export type NewsSentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: {
    title: string;
    id?: string;
    color?: string;
  };
  published_at: string;
  currencies?: Array<{ code: string; title: string }>;
  category?: string;
  breaking?: boolean;
  sentiment?: NewsSentiment;
  sentimentConfidence?: number;
}

// News source definitions with colors and priorities
export const NEWS_SOURCES: Record<string, NewsSource> = {
  coindesk: { id: 'coindesk', title: 'CoinDesk', color: '#0052FF', priority: 1 },
  theblock: { id: 'theblock', title: 'The Block', color: '#00C853', priority: 1 },
  decrypt: { id: 'decrypt', title: 'Decrypt', color: '#FF6B35', priority: 1 },
  cointelegraph: { id: 'cointelegraph', title: 'Cointelegraph', color: '#FF9F1C', priority: 1 },
  bitcoinmagazine: { id: 'bitcoinmagazine', title: 'Bitcoin Magazine', color: '#F7931A', priority: 2 },
  thedefiant: { id: 'thedefiant', title: 'The Defiant', color: '#8B5CF6', priority: 2 },
  bankless: { id: 'bankless', title: 'Bankless', color: '#DC2626', priority: 2 },
  cryptoslate: { id: 'cryptoslate', title: 'CryptoSlate', color: '#3B82F6', priority: 2 },
  newsbtc: { id: 'newsbtc', title: 'NewsBTC', color: '#14B8A6', priority: 3 },
  bitcoinist: { id: 'bitcoinist', title: 'Bitcoinist', color: '#EC4899', priority: 3 },
  cryptocompare: { id: 'cryptocompare', title: 'CryptoCompare', color: '#6366F1', priority: 2 },
  abstract: { id: 'abstract', title: 'Abstract', color: '#2EDB84', priority: 1 },
  googlenews: { id: 'googlenews', title: 'Google News', color: '#4285F4', priority: 3 },
};

export interface DeFiProtocol {
  id: string;
  name: string;
  symbol: string;
  tvl: number;
  change_1d?: number;
  change_7d?: number;
  logo?: string;
  category?: string;
}

export interface ChainData {
  id: string;
  name: string;
  tvl: number;
  symbol?: string;
  chainId?: number;
}

export interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
    verified: boolean;
  };
  created_at: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  url: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
  }[];
}

export interface TwitterAccount {
  id: string;
  username: string;
  name: string;
  verified: boolean;
  profile_image_url: string;
}
