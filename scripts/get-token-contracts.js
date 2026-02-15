#!/usr/bin/env node

/**
 * Fetches token contract addresses from GeckoTerminal for Abstract chain
 */

const KNOWN_TOKENS = [
  'CHECK', 'ABX', 'ABSTER', 'YGG', 'GTBTC', 'BIG', 'BURR', 'POLLY', 'CHAD', 'GOD',
  'KONA', 'PANDA', 'TYAG', 'CHIMP', 'CHILL', 'MOCHI', 'GIGLIO',
];

async function fetchTokens() {
  const tokenMap = new Map();

  const endpoints = [
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=1&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=2&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/pools?page=3&sort=h24_volume_usd_desc',
    'https://api.geckoterminal.com/api/v2/networks/abstract/trending_pools?page=1',
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
          const skipTokens = ['WETH', 'USDC', 'USDC.e', 'USDT', 'ETH', 'DAI', 'WBTC'];
          if (skipTokens.includes(tokenSymbol)) continue;

          // Extract token address
          const baseTokenRef = pool.relationships?.base_token?.data?.id || '';
          const tokenAddress = baseTokenRef.replace('abstract_', '');

          if (tokenAddress && !tokenMap.has(tokenSymbol.toUpperCase())) {
            tokenMap.set(tokenSymbol.toUpperCase(), {
              symbol: tokenSymbol,
              address: tokenAddress,
            });
          }
        }
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error.message);
    }
  }

  return tokenMap;
}

async function main() {
  console.log('Fetching token contract addresses from GeckoTerminal...\n');
  console.log('Format: Symbol | Contract\n');
  console.log('-'.repeat(80));

  const tokens = await fetchTokens();

  // Print all found tokens
  for (const [symbol, data] of tokens) {
    console.log(`${data.symbol}\t${data.address}`);
  }

  console.log('-'.repeat(80));
  console.log(`\nFound ${tokens.size} tokens with contract addresses.`);

  // Show which known tokens were found
  console.log('\nKnown tokens status:');
  for (const known of KNOWN_TOKENS) {
    const found = tokens.get(known.toUpperCase());
    if (found) {
      console.log(`  ✓ ${known}: ${found.address}`);
    } else {
      console.log(`  ✗ ${known}: NOT FOUND`);
    }
  }
}

main().catch(console.error);
