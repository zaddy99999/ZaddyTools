#!/usr/bin/env node
/**
 * Download all profile pictures for the Build Your Team page
 * Uses Google Sheets API to get handles, then unavatar.io to fetch Twitter PFPs
 * Run: node scripts/download-all-pfps.js
 */

const { google } = require('googleapis');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const PFP_DIR = path.join(__dirname, '../public/pfp');
const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';

// Ensure directory exists
if (!fs.existsSync(PFP_DIR)) {
  fs.mkdirSync(PFP_DIR, { recursive: true });
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials in .env.local');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function getRecommendedPeople() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Fetch from TierMaker List (People) sheet - Column A-E
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'TierMaker List (People)!A:E',
  });

  const rows = response.data.values || [];
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const displayName = row[0]?.trim();
    const twitterUrl = row[1]?.trim();
    const recVal = row[3]?.toString().toUpperCase().trim();
    const recommended = recVal === 'TRUE' || recVal === 'YES' || recVal === '1' || recVal === 'X' || recVal === '✓';

    // Only include recommended people
    if (!recommended) continue;

    if (twitterUrl) {
      let handle = twitterUrl;
      if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
        handle = handle.split('/').pop() || handle;
      }
      handle = handle.replace('@', '').replace(/[?#].*$/, ''); // Remove query params
      if (handle) {
        items.push({ handle, name: displayName });
      }
    }
  }

  return items;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    const request = protocol.get(url, { timeout: 10000 }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error('Timeout'));
    });
  });
}

async function downloadPfp(handle) {
  const lowerHandle = handle.toLowerCase();
  const filename = path.join(PFP_DIR, `${lowerHandle}.jpg`);

  // Skip if already exists
  if (fs.existsSync(filename)) {
    return { handle, status: 'exists' };
  }

  // Try unavatar.io (supports Twitter/X)
  const url = `https://unavatar.io/twitter/${handle}`;

  try {
    await downloadFile(url, filename);

    // Verify it's an actual image (check magic bytes)
    const buffer = fs.readFileSync(filename);
    if (buffer.length < 10) {
      fs.unlinkSync(filename);
      return { handle, status: 'failed', error: 'File too small' };
    }

    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      fs.unlinkSync(filename);
      return { handle, status: 'failed', error: 'Not an image' };
    }

    return { handle, status: 'downloaded' };
  } catch (error) {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    return { handle, status: 'failed', error: error.message };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching people list from Google Sheets...');

  let people;
  try {
    people = await getRecommendedPeople();
  } catch (error) {
    console.error('Error fetching from sheets:', error.message);
    console.log('\nMake sure .env.local has these variables set:');
    console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL');
    console.log('  GOOGLE_PRIVATE_KEY');
    process.exit(1);
  }

  if (people.length === 0) {
    console.log('No recommended people found in the spreadsheet.');
    process.exit(1);
  }

  console.log(`Found ${people.length} recommended people.`);

  // Get existing PFPs
  const existing = new Set(
    fs.readdirSync(PFP_DIR)
      .filter(f => f.endsWith('.jpg'))
      .map(f => f.replace('.jpg', '').toLowerCase())
  );

  console.log(`Already have ${existing.size} PFPs downloaded.`);

  // Find missing
  const missing = people.filter(p => !existing.has(p.handle.toLowerCase()));

  if (missing.length === 0) {
    console.log('\nAll PFPs already downloaded!');
    return;
  }

  console.log(`\nNeed to download ${missing.length} missing PFPs...\n`);

  const results = { downloaded: [], failed: [] };

  for (let i = 0; i < missing.length; i++) {
    const person = missing[i];
    const result = await downloadPfp(person.handle);

    if (result.status === 'downloaded') {
      results.downloaded.push(result);
      console.log(`[${i + 1}/${missing.length}] ✓ ${person.handle}`);
    } else if (result.status === 'failed') {
      results.failed.push(result);
      console.log(`[${i + 1}/${missing.length}] ✗ ${person.handle} - ${result.error}`);
    }

    // Rate limit protection
    await sleep(400);
  }

  console.log('\n=== Summary ===');
  console.log(`Downloaded: ${results.downloaded.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed handles:');
    results.failed.forEach(r => console.log(`  - ${r.handle}: ${r.error}`));
  }

  // Final count
  const finalCount = fs.readdirSync(PFP_DIR).filter(f => f.endsWith('.jpg')).length;
  console.log(`\nTotal PFPs now: ${finalCount}`);
}

main().catch(console.error);
