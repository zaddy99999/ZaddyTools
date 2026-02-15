#!/usr/bin/env node

/**
 * Fetches NFT collection contract addresses from OpenSea
 * Use this to get the contract addresses to add to your Google Sheet whitelist
 */

const OPENSEA_API = 'https://api.opensea.io/api/v2';
const OPENSEA_API_KEY = 'e0aa4682cbfc4eeb8fcb2fb0f5c80f5c';

async function fetchCollectionDetails(slug) {
  try {
    const response = await fetch(`${OPENSEA_API}/collections/${slug}`, {
      headers: {
        Accept: 'application/json',
        'X-API-KEY': OPENSEA_API_KEY,
      },
    });

    if (!response.ok) {
      console.log(`  Error fetching ${slug}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Get contract address from the contracts array
    const contracts = data.contracts || [];
    const abstractContract = contracts.find(c => c.chain === 'abstract') || contracts[0];

    return {
      slug: data.collection,
      name: data.name,
      contract: abstractContract?.address || 'NOT FOUND',
      chain: abstractContract?.chain || 'unknown',
    };
  } catch (error) {
    console.log(`  Error fetching ${slug}: ${error.message}`);
    return null;
  }
}

async function main() {
  // These are the NFT slugs from your whitelist
  const slugs = [
    'gigaverse-roms-abstract',
    'genesishero-abstract',
    'finalbosu',
    'bearish',
    'fugzfamily',
    'ruyui',
    'wolf-game',
    'och-ringbearer',
    'web3-playboys',
    'hamieverse-genesis',
    'glowbuds',
    'checkmate-pass-abstract',
    'pengztracted-abstract',
    'abstractio',
    'buumeeofficial',
    'ultraman-archive78',
    'plooshy-apartments-abstract',
    'dreamiliomaker-abstract',
    'abstract-hotdogs-abstract',
    'gigaverse-giglings',
  ];

  console.log('Fetching NFT contract addresses from OpenSea...\n');
  console.log('Format: Slug | Contract | Name\n');
  console.log('Copy these to your Google Sheet (NFT_Whitelist tab, column B):\n');
  console.log('-'.repeat(80));

  for (const slug of slugs) {
    const details = await fetchCollectionDetails(slug);
    if (details) {
      console.log(`${details.slug}\t${details.contract}\t${details.name}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('-'.repeat(80));
  console.log('\nDone! Copy the contract addresses (column 2) to your Google Sheet.');
}

main().catch(console.error);
