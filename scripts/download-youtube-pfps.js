const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Channels with YouTube URLs from the status API
const youtubeChannels = [
  { name: 'BEARISH', handle: 'Bearish_AF' },
  { name: 'Fugz Official', handle: 'FugzOfficial' },
  { name: 'Web3 Playboys', handle: 'web3playboys' },
  { name: 'Playgigaverse', handle: 'playgigaverse' },
  { name: 'Pudgy Penguins', handle: 'pudgypenguinsofficial' },
  { name: 'Sappy Seals', handle: 'thesappyseals' },
  { name: 'Claynosaurz', handle: 'Claynosaurz_Official' },
  { name: 'Chubbiverse', handle: 'chubbiverse' },
  { name: 'doodles', handle: 'welikethedoodles' },
  { name: 'LT3 Creations', handle: 'Squishiverse' },
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
        console.log(`  Redirecting to: ${redirectUrl}`);
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

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  console.log('Downloading YouTube profile pictures...\n');

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
