const { execSync } = require('child_process');
const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
const path = require('path');

const APPS_DIR = './public/apps';
try { mkdirSync(APPS_DIR, { recursive: true }); } catch(e) {}

console.log('Fetching apps...');
execSync('curl -s "https://backend.portal.abs.xyz/api/app?limit=100" > /tmp/abstract-apps.json');
const result = readFileSync('/tmp/abstract-apps.json', 'utf8');
const data = JSON.parse(result);
const apps = data.items || [];
console.log('Found', apps.length, 'apps');

const mapping = {};
let downloaded = 0;

for (const app of apps) {
  const name = app.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const iconPath = path.join(APPS_DIR, name + '.png');

  const twitter = app.socials?.twitter || app.socials?.x;
  const handle = twitter ? twitter.split('/').pop().replace('@', '') : null;

  mapping[name] = { name: app.name, icon: '/apps/' + name + '.png', twitter: handle };

  if (existsSync(iconPath)) {
    console.log('[SKIP]', app.name);
    continue;
  }

  if (app.icon) {
    try {
      execSync('curl -sL "' + app.icon + '" -o "' + iconPath + '"', { timeout: 15000 });
      console.log('[OK]', app.name);
      downloaded++;
    } catch(e) {
      console.log('[FAIL]', app.name);
    }
  }
}

writeFileSync(path.join(APPS_DIR, 'mapping.json'), JSON.stringify(mapping, null, 2));
console.log('Downloaded', downloaded, 'icons');
console.log('Done!');
