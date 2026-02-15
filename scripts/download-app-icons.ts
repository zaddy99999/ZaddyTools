import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AbstractApp {
  id: string;
  name: string;
  icon: string;
  socials: Record<string, string>;
}

const APPS_DIR = join(__dirname, '../public/apps');

function normalizeAppName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    execSync(`curl -sL "${url}" -o "${filepath}"`, { timeout: 10000 });
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('Fetching apps from Abstract Portal API...');
  const curlResult = execSync('curl -s "https://backend.portal.abs.xyz/api/app?limit=200"').toString();
  const data = JSON.parse(curlResult);
  const apps: AbstractApp[] = data.items || [];

  console.log(`Found ${apps.length} apps`);

  // Also create a mapping file
  const appMapping: Record<string, { name: string; icon: string; twitter?: string }> = {};

  for (const app of apps) {
    const normalizedName = normalizeAppName(app.name);
    const iconPath = join(APPS_DIR, `${normalizedName}.png`);

    // Get Twitter handle from socials
    const twitterUrl = app.socials?.twitter || app.socials?.x;
    const twitterHandle = twitterUrl ? twitterUrl.split('/').pop()?.replace('@', '') : null;

    appMapping[normalizedName] = {
      name: app.name,
      icon: `/apps/${normalizedName}.png`,
      twitter: twitterHandle || undefined,
    };

    if (existsSync(iconPath)) {
      console.log(`[SKIP] ${app.name} - already exists`);
      continue;
    }

    let downloaded = false;

    // Try official icon first
    if (app.icon) {
      console.log(`[DL] ${app.name} from icon URL...`);
      downloaded = await downloadImage(app.icon, iconPath);
    }

    // Fall back to Twitter PFP
    if (!downloaded && twitterHandle) {
      console.log(`[DL] ${app.name} from Twitter @${twitterHandle}...`);
      downloaded = await downloadImage(`https://unavatar.io/twitter/${twitterHandle}`, iconPath);
    }

    if (downloaded) {
      console.log(`[OK] ${app.name}`);
    } else {
      console.log(`[FAIL] ${app.name} - no icon available`);
    }
  }

  // Write mapping file
  const mappingPath = join(APPS_DIR, 'mapping.json');
  writeFileSync(mappingPath, JSON.stringify(appMapping, null, 2));
  console.log(`\nWrote mapping to ${mappingPath}`);
  console.log('Done!');
}

main().catch(console.error);
