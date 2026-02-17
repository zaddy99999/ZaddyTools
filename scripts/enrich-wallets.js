#!/usr/bin/env node

/**
 * Enrich wallet data with pfp and transaction counts
 * Usage: node enrich-wallets.js <tier> [batchSize] [startIndex]
 * Example: node enrich-wallets.js gold 50 0
 *
 * This script fetches:
 * - Profile picture from Abstract Portal API
 * - Transaction count from Abstract block explorer
 */

const fs = require('fs');
const path = require('path');

const TIER = process.argv[2] || 'gold';
const BATCH_SIZE = parseInt(process.argv[3]) || 50;
const START_INDEX = parseInt(process.argv[4]) || 0;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches
const DELAY_BETWEEN_REQUESTS = 100; // 100ms between individual requests

const PORTAL_API = 'https://backend.portal.abs.xyz/api';
const EXPLORER_API = 'https://block-explorer-api.mainnet.abs.xyz/api';

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...options.headers,
        },
      });
      if (response.status === 429) {
        // Rate limited - wait and retry
        console.log(`Rate limited, waiting ${(i + 1) * 5}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 5000));
        continue;
      }
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) return null;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

async function getPortalUserData(userId) {
  const data = await fetchWithRetry(`${PORTAL_API}/user/${userId}`);
  if (!data?.user) return null;
  return {
    pfp: data.user.avatar || '',
    name: data.user.name || '',
  };
}

async function getTransactionCount(walletAddress) {
  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address: walletAddress,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: '1',
    sort: 'asc',
  });

  // First, try to get the total count
  const countParams = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address: walletAddress,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: '10000',
    sort: 'asc',
  });

  const data = await fetchWithRetry(`${EXPLORER_API}?${countParams}`);
  if (data?.status === '1' && Array.isArray(data.result)) {
    return data.result.length;
  }
  return 0;
}

async function enrichWallet(wallet) {
  const [portalData, txCount] = await Promise.all([
    getPortalUserData(wallet.id),
    getTransactionCount(wallet.wallet),
  ]);

  return {
    ...wallet,
    pfp: portalData?.pfp || wallet.pfp || '',
    txs: txCount || wallet.txs || 0,
  };
}

async function enrichBatch(wallets, startIdx) {
  const results = [];
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    process.stdout.write(`\r  Processing ${startIdx + i + 1}/${startIdx + wallets.length}: ${wallet.name.slice(0, 20).padEnd(20)}...`);

    const enriched = await enrichWallet(wallet);
    results.push(enriched);

    // Small delay between individual requests
    if (i < wallets.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }
  }
  return results;
}

async function main() {
  const inputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}.json`);
  const outputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-enriched.json`);
  const progressFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-progress.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  console.log(`Loaded ${wallets.length} ${TIER} wallets`);
  console.log(`Starting from index ${START_INDEX}, batch size ${BATCH_SIZE}`);

  // Load existing progress if any
  let enrichedWallets = [];
  if (fs.existsSync(outputFile) && START_INDEX > 0) {
    enrichedWallets = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    console.log(`Loaded ${enrichedWallets.length} already enriched wallets`);
  }

  // Process in batches
  const totalBatches = Math.ceil((wallets.length - START_INDEX) / BATCH_SIZE);
  let processed = 0;

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batchStart = START_INDEX + (batchNum * BATCH_SIZE);
    const batchEnd = Math.min(batchStart + BATCH_SIZE, wallets.length);
    const batch = wallets.slice(batchStart, batchEnd);

    console.log(`\nBatch ${batchNum + 1}/${totalBatches} (wallets ${batchStart + 1}-${batchEnd})`);

    const enrichedBatch = await enrichBatch(batch, batchStart);

    // Add to results
    for (let i = 0; i < enrichedBatch.length; i++) {
      const idx = batchStart + i;
      if (idx < enrichedWallets.length) {
        enrichedWallets[idx] = enrichedBatch[i];
      } else {
        enrichedWallets.push(enrichedBatch[i]);
      }
    }

    processed += batch.length;

    // Save progress after each batch
    fs.writeFileSync(outputFile, JSON.stringify(enrichedWallets, null, 2));
    fs.writeFileSync(progressFile, JSON.stringify({ lastIndex: batchEnd, total: wallets.length, timestamp: new Date().toISOString() }));

    console.log(`\n  Saved progress: ${enrichedWallets.length} wallets enriched`);

    // Calculate some stats
    const withPfp = enrichedBatch.filter(w => w.pfp && w.pfp.length > 0).length;
    const withTxs = enrichedBatch.filter(w => w.txs && w.txs > 0).length;
    const avgTxs = enrichedBatch.reduce((sum, w) => sum + (w.txs || 0), 0) / enrichedBatch.length;
    console.log(`  Batch stats: ${withPfp}/${batch.length} have pfp, ${withTxs}/${batch.length} have txs, avg txs: ${Math.round(avgTxs)}`);

    // Delay between batches
    if (batchNum < totalBatches - 1) {
      console.log(`  Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\nDone! Enriched ${enrichedWallets.length} wallets.`);
  console.log(`Output saved to: ${outputFile}`);

  // Print tier distribution
  const tierCounts = {};
  let totalTxs = 0;
  for (const wallet of enrichedWallets) {
    const subTier = ((wallet.tierV2 - 1) % 3) + 1;
    const tierName = `${TIER.charAt(0).toUpperCase() + TIER.slice(1)} ${subTier}`;
    tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
    totalTxs += wallet.txs || 0;
  }
  console.log('\nSub-tier Distribution:');
  for (const [tier, count] of Object.entries(tierCounts).sort()) {
    console.log(`  ${tier}: ${count}`);
  }
  console.log(`\nTotal transactions across all wallets: ${totalTxs.toLocaleString()}`);
}

main().catch(console.error);
