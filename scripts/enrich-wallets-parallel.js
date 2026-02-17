#!/usr/bin/env node

/**
 * Run multiple wallet enrichment processes in parallel
 * Usage: node enrich-wallets-parallel.js <tier> [numWorkers]
 * Example: node enrich-wallets-parallel.js gold 10
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TIER = process.argv[2] || 'gold';
const NUM_WORKERS = parseInt(process.argv[3]) || 10;
const BATCH_SIZE = 50; // Each worker processes 50 wallets at a time

async function main() {
  const inputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const totalWallets = wallets.length;
  console.log(`Total ${TIER} wallets: ${totalWallets}`);
  console.log(`Starting ${NUM_WORKERS} parallel workers\n`);

  // Calculate chunk size for each worker
  const chunkSize = Math.ceil(totalWallets / NUM_WORKERS);

  const workers = [];
  const outputFiles = [];

  for (let i = 0; i < NUM_WORKERS; i++) {
    const startIndex = i * chunkSize;
    const endIndex = Math.min((i + 1) * chunkSize, totalWallets);

    if (startIndex >= totalWallets) break;

    const workerWallets = wallets.slice(startIndex, endIndex);
    const workerFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-worker-${i}.json`);
    const outputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-worker-${i}-enriched.json`);

    // Write worker input file
    fs.writeFileSync(workerFile, JSON.stringify(workerWallets, null, 2));
    outputFiles.push(outputFile);

    console.log(`Worker ${i}: wallets ${startIndex + 1}-${endIndex} (${workerWallets.length} wallets)`);
  }

  // Create a simple worker script
  const workerScript = `
const fs = require('fs');
const path = require('path');

const PORTAL_API = 'https://backend.portal.abs.xyz/api';
const EXPLORER_API = 'https://block-explorer-api.mainnet.abs.xyz/api';
const WORKER_ID = process.argv[2];
const TIER = process.argv[3];
const DELAY = 150;

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
        await new Promise(r => setTimeout(r, (i + 1) * 5000));
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      if (i === retries - 1) return null;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

async function getPortalUserData(userId) {
  const data = await fetchWithRetry(PORTAL_API + '/user/' + userId);
  if (!data?.user) return null;
  return { pfp: data.user.overrideProfilePictureUrl || '' };
}

async function getTransactionCount(walletAddress) {
  // Use RPC to get nonce (outgoing tx count) - much faster than explorer API
  try {
    const response = await fetch('https://api.mainnet.abs.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionCount',
        params: [walletAddress, 'latest'],
      }),
    });
    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16);
    }
  } catch (e) {
    // Ignore errors
  }
  return 0;
}

async function main() {
  const inputFile = path.join(__dirname, '..', 'data', 'wallets-' + TIER + '-worker-' + WORKER_ID + '.json');
  const outputFile = path.join(__dirname, '..', 'data', 'wallets-' + TIER + '-worker-' + WORKER_ID + '-enriched.json');

  const wallets = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const results = [];

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const [portalData, txCount] = await Promise.all([
      getPortalUserData(wallet.id),
      getTransactionCount(wallet.wallet),
    ]);

    results.push({
      ...wallet,
      pfp: portalData?.pfp || '',
      txs: txCount || 0,
    });

    if ((i + 1) % 10 === 0 || i === wallets.length - 1) {
      console.log('Worker ' + WORKER_ID + ': ' + (i + 1) + '/' + wallets.length + ' (' + Math.round((i + 1) / wallets.length * 100) + '%)');
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    }

    await new Promise(r => setTimeout(r, DELAY));
  }

  console.log('Worker ' + WORKER_ID + ' complete!');
}

main().catch(console.error);
`;

  const workerScriptFile = path.join(__dirname, 'enrich-worker-temp.js');
  fs.writeFileSync(workerScriptFile, workerScript);

  console.log('\nStarting workers...\n');

  // Launch all workers
  const promises = [];
  for (let i = 0; i < NUM_WORKERS && i * Math.ceil(totalWallets / NUM_WORKERS) < totalWallets; i++) {
    const promise = new Promise((resolve, reject) => {
      const child = spawn('node', [workerScriptFile, String(i), TIER], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data) => {
        process.stdout.write(`[W${i}] ${data}`);
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(`[W${i} ERR] ${data}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(i);
        } else {
          reject(new Error(`Worker ${i} exited with code ${code}`));
        }
      });
    });
    promises.push(promise);
  }

  try {
    await Promise.all(promises);
    console.log('\nAll workers complete!');

    // Merge all output files
    console.log('\nMerging results...');
    const allWallets = [];

    for (let i = 0; i < NUM_WORKERS; i++) {
      const outputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-worker-${i}-enriched.json`);
      if (fs.existsSync(outputFile)) {
        const data = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        allWallets.push(...data);

        // Clean up worker files
        fs.unlinkSync(outputFile);
        fs.unlinkSync(path.join(__dirname, '..', 'data', `wallets-${TIER}-worker-${i}.json`));
      }
    }

    // Clean up temp script
    fs.unlinkSync(workerScriptFile);

    // Save merged output
    const finalOutputFile = path.join(__dirname, '..', 'data', `wallets-${TIER}-enriched.json`);
    fs.writeFileSync(finalOutputFile, JSON.stringify(allWallets, null, 2));

    console.log(`Merged ${allWallets.length} wallets to ${finalOutputFile}`);

    // Print stats
    const withPfp = allWallets.filter(w => w.pfp && w.pfp.length > 0).length;
    const withTxs = allWallets.filter(w => w.txs && w.txs > 0).length;
    const totalTxs = allWallets.reduce((sum, w) => sum + (w.txs || 0), 0);

    console.log(`\nStats:`);
    console.log(`  Wallets with PFP: ${withPfp}/${allWallets.length} (${Math.round(withPfp / allWallets.length * 100)}%)`);
    console.log(`  Wallets with Txs: ${withTxs}/${allWallets.length} (${Math.round(withTxs / allWallets.length * 100)}%)`);
    console.log(`  Total transactions: ${totalTxs.toLocaleString()}`);

  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
