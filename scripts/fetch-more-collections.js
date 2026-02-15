#!/usr/bin/env node

const OPENSEA_API = 'https://api.opensea.io/api/v2';
const OPENSEA_API_KEY = 'e0aa4682cbfc4eeb8fcb2fb0f5c80f5c';

// Existing slugs to skip
const EXISTING = new Set([
  'gigaverse-roms-abstract', 'genesishero-abstract', 'finalbosu', 'bearish',
  'fugzfamily', 'ruyui', 'wolf-game', 'och-ringbearer', 'web3-playboys',
  'hamieverse-genesis', 'glowbuds', 'checkmate-pass-abstract', 'pengztracted-abstract',
  'abstractio', 'buumeeofficial', 'ultraman-archive78', 'plooshy-apartments-abstract',
  'dreamiliomaker-abstract', 'abstract-hotdogs-abstract', 'gigaverse-giglings',
]);

async function fetchCollections() {
  const collections = [];

  // Fetch collections sorted by different metrics
  const endpoints = [
    `${OPENSEA_API}/collections?chain=abstract&order_by=seven_day_volume&limit=50`,
    `${OPENSEA_API}/collections?chain=abstract&order_by=one_day_volume&limit=50`,
    `${OPENSEA_API}/collections?chain=abstract&order_by=created_date&limit=50`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-API-KEY': OPENSEA_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        for (const c of (data.collections || [])) {
          if (!EXISTING.has(c.collection) && !collections.find(x => x.slug === c.collection)) {
            collections.push({
              slug: c.collection,
              name: c.name,
              contracts: c.contracts || [],
            });
          }
        }
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error('Error:', e.message);
    }
  }

  return collections;
}

async function getCollectionDetails(slug) {
  try {
    const response = await fetch(`${OPENSEA_API}/collections/${slug}`, {
      headers: {
        Accept: 'application/json',
        'X-API-KEY': OPENSEA_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const contracts = data.contracts || [];
      const abstractContract = contracts.find(c => c.chain === 'abstract') || contracts[0];
      return {
        slug: data.collection,
        name: data.name,
        contract: abstractContract?.address || '',
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function main() {
  console.log('Fetching Abstract NFT collections from OpenSea...\n');

  const collections = await fetchCollections();
  console.log(`Found ${collections.length} new collections\n`);

  console.log('Fetching contract details...\n');
  console.log('Slug\tContract\tName');
  console.log('-'.repeat(100));

  const results = [];
  for (const c of collections.slice(0, 25)) {
    const details = await getCollectionDetails(c.slug);
    if (details && details.contract) {
      console.log(`${details.slug}\t${details.contract}\t${details.name}`);
      results.push(details);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('-'.repeat(100));
  console.log(`\nFound ${results.length} collections with contracts.`);

  // Output as JSON for easy use
  console.log('\n// Add to update script:');
  console.log('const NEW_NFT_CONTRACTS = {');
  for (const r of results) {
    console.log(`  '${r.slug}': '${r.contract}',`);
  }
  console.log('};');
}

main().catch(console.error);
