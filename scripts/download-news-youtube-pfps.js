const https = require('https');
const fs = require('fs');
const path = require('path');

// YouTube channels from the news page
const youtubeChannels = [
  { name: 'Coin Bureau', handle: 'CoinBureau' },
  { name: 'Whiteboard Crypto', handle: 'WhiteboardCrypto' },
  { name: 'Finematics', handle: 'Finematics' },
  { name: 'Bankless', handle: 'Bankless' },
  { name: 'The Defiant', handle: 'TheDefiant' },
  { name: 'Unchained Crypto', handle: 'Unchained' },
  { name: 'Benjamin Cowen', handle: 'intocryptoverse' },
  { name: 'DataDash', handle: 'DataDash' },
  { name: 'BitBoy Crypto', handle: 'BitBoyCrypto' },
  { name: 'Altcoin Daily', handle: 'AltcoinDaily' },
];

const pfpDir = path.join(__dirname, '..', 'public', 'youtube-pfp');

// Ensure directory exists
if (!fs.existsSync(pfpDir)) {
  fs.mkdirSync(pfpDir, { recursive: true });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(pfpDir, filename);
    const file = fs.createWriteStream(filepath);

    const request = https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        downloadImage(redirectUrl, filename).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    });

    request.on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });

    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  console.log('Downloading YouTube profile pictures for news page...\n');

  for (const channel of youtubeChannels) {
    const filename = channel.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.jpg';
    const avatarUrl = `https://unavatar.io/youtube/${channel.handle}`;

    console.log(`Downloading: ${channel.name} (@${channel.handle})`);

    try {
      await downloadImage(avatarUrl, filename);
      console.log(`  ✓ Saved: ${filename}`);
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
    }
  }

  console.log('\nDone!');
}

main();
