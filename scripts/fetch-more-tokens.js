#!/usr/bin/env node

// Existing tokens to skip
const EXISTING = new Set([
  'CHECK', 'ABX', 'ABSTER', 'YGG', 'GTBTC', 'BIG', 'BURR', 'POLLY', 'CHAD', 'GOD',
  'KONA', 'PANDA', 'TYAG', 'CHIMP', 'CHILL', 'MOCHI', 'GIGLIO',
  'WETH', 'USDC', 'USDC.E', 'USDT', 'ETH', 'DAI', 'WBTC', 'PENGU',
]);

async function fetchTokens() {
  const tokenMap = new Map();

  const endpoints = [
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=1&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=2&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=3&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=4&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=5&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=1',
    'https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=2',
    'https://api.geckoterminal.com/api/v2/networks/abstract/new_pools?page=1',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();

        for (const pool of (data.data || [])) {
          const attrs = pool.attributes || {};
          const poolName = attrs.name || '';
          const tokenSymbol = poolName.split(' / ')[0]?.trim() || '';

          if (!tokenSymbol) continue;
          if (EXISTING.has(tokenSymbol.toUpperCase())) continue;

          const baseTokenRef = pool.relationships?.base_token?.data?.id || '';
          const tokenAddress = baseTokenRef.replace('abstract_', '');

          const marketCap = parseFloat(attrs.fdv_usd || '0');
          const volume = parseFloat(attrs.volume_usd?.h24 || '0');

          if (tokenAddress && !tokenMap.has(tokenSymbol.toUpperCase())) {
            tokenMap.set(tokenSymbol.toUpperCase(), {
              symbol: tokenSymbol,
              address: tokenAddress,
              marketCap,
              volume,
            });
          }
        }
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }

  return tokenMap;
}

async function main() {
  console.log('Fetching more Abstract tokens from GeckoTerminal...\n');

  const tokens = await fetchTokens();

  // Sort by market cap
  const sorted = Array.from(tokens.values())
    .filter(t => t.marketCap > 1000 || t.volume > 100)
    .sort((a, b) => b.marketCap - a.marketCap);

  console.log('Symbol\tContract\tMarket Cap');
  console.log('-'.repeat(80));

  for (const t of sorted.slice(0, 25)) {
    const mcap = t.marketCap > 1000000
      ? `$${(t.marketCap / 1000000).toFixed(2)}M`
      : t.marketCap > 1000
        ? `$${(t.marketCap / 1000).toFixed(1)}K`
        : `$${t.marketCap.toFixed(0)}`;
    console.log(`${t.symbol}\t${t.address}\t${mcap}`);
  }

  console.log('-'.repeat(80));
  console.log(`\nFound ${sorted.length} new tokens.`);

  // Output as JSON
  console.log('\n// Add to update script:');
  console.log('const NEW_TOKEN_CONTRACTS = {');
  for (const t of sorted.slice(0, 25)) {
    console.log(`  '${t.symbol.toUpperCase()}': '${t.address}',`);
  }
  console.log('};');
}

main().catch(console.error);
