#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '../public/coins');

// Top coins to download (CoinGecko IDs)
const COINS = [
  'bitcoin',
  'ethereum',
  'tether',
  'ripple',
  'binancecoin',
  'solana',
  'usd-coin',
  'dogecoin',
  'cardano',
  'tron',
  'avalanche-2',
  'shiba-inu',
  'chainlink',
  'wrapped-bitcoin',
  'polkadot',
  'bitcoin-cash',
  'near',
  'uniswap',
  'litecoin',
  'sui',
  'pepe',
  'internet-computer',
  'aptos',
  'stellar',
  'ethereum-classic',
  'hedera-hashgraph',
  'render-token',
  'cronos',
  'filecoin',
  'cosmos',
  'mantle',
  'arbitrum',
  'optimism',
  'injective-protocol',
  'immutable-x',
  'vechain',
  'the-graph',
  'fantom',
  'theta-token',
  'maker',
  'aave',
  'algorand',
  'matic-network',
  'bittensor',
  'celestia',
  'sei-network',
  'starknet',
  'flow',
  'sandbox',
  'decentraland',
];

async function downloadImage(coinId) {
  return new Promise(async (resolve) => {
    try {
      // Fetch coin data from CoinGecko
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`);

      if (!res.ok) {
        console.log(`Failed to fetch ${coinId}: ${res.status}`);
        resolve(false);
        return;
      }

      const data = await res.json();
      const imageUrl = data.image?.large || data.image?.small;

      if (!imageUrl) {
        console.log(`No image for ${coinId}`);
        resolve(false);
        return;
      }

      // Download the image
      const outputPath = path.join(OUTPUT_DIR, `${coinId}.png`);

      // Skip if already exists
      if (fs.existsSync(outputPath)) {
        console.log(`Skipping ${coinId} (already exists)`);
        resolve(true);
        return;
      }

      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        console.log(`Failed to download image for ${coinId}`);
        resolve(false);
        return;
      }

      const buffer = await imageRes.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Downloaded ${coinId}`);
      resolve(true);
    } catch (err) {
      console.log(`Error for ${coinId}: ${err.message}`);
      resolve(false);
    }
  });
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Downloading ${COINS.length} coin images to ${OUTPUT_DIR}`);

  let success = 0;
  let failed = 0;

  // Process one at a time with delay to respect rate limits
  for (let i = 0; i < COINS.length; i++) {
    const result = await downloadImage(COINS[i]);
    result ? success++ : failed++;

    // Wait 2 seconds between requests to respect rate limits
    if (i + 1 < COINS.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\nDone! Downloaded: ${success}, Failed: ${failed}`);
}

main();
