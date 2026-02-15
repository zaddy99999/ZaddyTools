import type { CoinMarketData, NewsItem } from './types';

// Map of common names/keywords to coin symbols
const TICKER_KEYWORDS: Record<string, string[]> = {
  bitcoin: ['BTC'],
  btc: ['BTC'],
  ethereum: ['ETH'],
  eth: ['ETH'],
  solana: ['SOL'],
  sol: ['SOL'],
  cardano: ['ADA'],
  ada: ['ADA'],
  ripple: ['XRP'],
  xrp: ['XRP'],
  dogecoin: ['DOGE'],
  doge: ['DOGE'],
  polkadot: ['DOT'],
  dot: ['DOT'],
  polygon: ['MATIC', 'POL'],
  matic: ['MATIC', 'POL'],
  chainlink: ['LINK'],
  link: ['LINK'],
  avalanche: ['AVAX'],
  avax: ['AVAX'],
  uniswap: ['UNI'],
  uni: ['UNI'],
  litecoin: ['LTC'],
  ltc: ['LTC'],
  cosmos: ['ATOM'],
  atom: ['ATOM'],
  near: ['NEAR'],
  aptos: ['APT'],
  apt: ['APT'],
  arbitrum: ['ARB'],
  arb: ['ARB'],
  optimism: ['OP'],
  sui: ['SUI'],
  sei: ['SEI'],
  injective: ['INJ'],
  inj: ['INJ'],
  celestia: ['TIA'],
  tia: ['TIA'],
  jupiter: ['JUP'],
  jup: ['JUP'],
  aave: ['AAVE'],
  maker: ['MKR'],
  mkr: ['MKR'],
  curve: ['CRV'],
  crv: ['CRV'],
  lido: ['LDO'],
  ldo: ['LDO'],
  render: ['RNDR', 'RENDER'],
  rndr: ['RNDR', 'RENDER'],
  filecoin: ['FIL'],
  fil: ['FIL'],
  hedera: ['HBAR'],
  hbar: ['HBAR'],
  algorand: ['ALGO'],
  algo: ['ALGO'],
  vechain: ['VET'],
  vet: ['VET'],
  fantom: ['FTM'],
  ftm: ['FTM'],
  toncoin: ['TON'],
  ton: ['TON'],
  shiba: ['SHIB'],
  shib: ['SHIB'],
  pepe: ['PEPE'],
  bonk: ['BONK'],
  floki: ['FLOKI'],
  worldcoin: ['WLD'],
  wld: ['WLD'],
  blur: ['BLUR'],
  pendle: ['PENDLE'],
  immutable: ['IMX'],
  imx: ['IMX'],
  ronin: ['RON'],
  ron: ['RON'],
  flow: ['FLOW'],
  tezos: ['XTZ'],
  xtz: ['XTZ'],
  eos: ['EOS'],
  neo: ['NEO'],
  icp: ['ICP'],
  internet: ['ICP'],
  thorchain: ['RUNE'],
  rune: ['RUNE'],
  osmosis: ['OSMO'],
  osmo: ['OSMO'],
  pancakeswap: ['CAKE'],
  cake: ['CAKE'],
  gmx: ['GMX'],
  dydx: ['DYDX'],
  sushiswap: ['SUSHI'],
  sushi: ['SUSHI'],
  '1inch': ['1INCH'],
  ens: ['ENS'],
  woo: ['WOO'],
  celo: ['CELO'],
  bittensor: ['TAO'],
  tao: ['TAO'],
  stacks: ['STX'],
  stx: ['STX'],
  pyth: ['PYTH'],
  ondo: ['ONDO'],
  starknet: ['STRK'],
  strk: ['STRK'],
  manta: ['MANTA'],
  zksync: ['ZK'],
  zk: ['ZK'],
  abstract: ['ABS'],
  abs: ['ABS'],
  binance: ['BNB'],
  bnb: ['BNB'],
  tether: ['USDT'],
  usdt: ['USDT'],
  usdc: ['USDC'],
  circle: ['USDC'],
  dai: ['DAI'],
};

// Words to ignore when matching (common news words)
const IGNORE_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but',
  'and', 'or', 'if', 'because', 'as', 'until', 'while', 'although',
  'though', 'even', 'also', 'market', 'crypto', 'cryptocurrency', 'price',
  'prices', 'trading', 'traders', 'trade', 'trades', 'news', 'update',
  'updates', 'report', 'reports', 'says', 'said', 'new', 'now', 'today',
  'week', 'month', 'year', 'amid', 'rally', 'rallies', 'drop', 'drops',
  'rise', 'rises', 'fall', 'falls', 'surge', 'surges', 'plunge', 'plunges',
  'gain', 'gains', 'loss', 'losses', 'hit', 'hits', 'reach', 'reaches',
  'break', 'breaks', 'breaking', 'high', 'low', 'all-time', 'record',
  'million', 'billion', 'trillion', 'dollars', 'usd', 'sec', 'etf', 'spot',
]);

export interface MatchedTicker {
  symbol: string;
  coin: CoinMarketData;
  matchSource: 'currency_tag' | 'title' | 'keyword';
}

/**
 * Match a news item to relevant cryptocurrency tickers
 */
export function matchNewsToTickers(
  newsItem: NewsItem,
  coins: CoinMarketData[]
): MatchedTicker[] {
  const matched: MatchedTicker[] = [];
  const addedSymbols = new Set<string>();

  // Create a lookup map for coins by symbol (case-insensitive)
  const coinsBySymbol = new Map<string, CoinMarketData>();
  coins.forEach(coin => {
    if (coin.symbol) {
      coinsBySymbol.set(coin.symbol.toUpperCase(), coin);
    }
  });

  // 1. First check currency tags from the news API (most reliable)
  if (newsItem.currencies && newsItem.currencies.length > 0) {
    for (const currency of newsItem.currencies) {
      const symbol = currency.code.toUpperCase();
      const coin = coinsBySymbol.get(symbol);
      if (coin && !addedSymbols.has(symbol)) {
        matched.push({
          symbol,
          coin,
          matchSource: 'currency_tag',
        });
        addedSymbols.add(symbol);
      }
    }
  }

  // 2. Check title for direct symbol mentions (e.g., "BTC", "ETH")
  const titleWords = newsItem.title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && w.length <= 6);

  for (const word of titleWords) {
    if (IGNORE_WORDS.has(word.toLowerCase())) continue;

    const coin = coinsBySymbol.get(word);
    if (coin && !addedSymbols.has(word)) {
      matched.push({
        symbol: word,
        coin,
        matchSource: 'title',
      });
      addedSymbols.add(word);
    }
  }

  // 3. Check title for keyword matches (e.g., "Bitcoin" -> BTC)
  const titleLower = newsItem.title.toLowerCase();
  for (const [keyword, symbols] of Object.entries(TICKER_KEYWORDS)) {
    // Check if keyword appears as a whole word
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(titleLower)) {
      for (const symbol of symbols) {
        const coin = coinsBySymbol.get(symbol);
        if (coin && !addedSymbols.has(symbol)) {
          matched.push({
            symbol,
            coin,
            matchSource: 'keyword',
          });
          addedSymbols.add(symbol);
        }
      }
    }
  }

  // Limit to top 3 matches, prioritizing by match source
  return matched.slice(0, 3);
}

/**
 * Get sparkline data for a coin, downsampled for mini display
 */
export function getSparklineData(coin: CoinMarketData, points: number = 15): number[] {
  const sparkline = coin.sparkline_in_7d?.price;
  if (!sparkline || sparkline.length === 0) return [];

  // Downsample the sparkline data
  const step = Math.max(1, Math.floor(sparkline.length / points));
  const sampled: number[] = [];

  for (let i = 0; i < sparkline.length; i += step) {
    sampled.push(sparkline[i]);
  }

  // Always include the last point
  if (sampled[sampled.length - 1] !== sparkline[sparkline.length - 1]) {
    sampled.push(sparkline[sparkline.length - 1]);
  }

  return sampled;
}
