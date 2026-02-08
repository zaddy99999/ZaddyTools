import { ScrapedChannel, ChannelConfig } from './types';
import { extractViewCount, extractChannelName, extractSlugFromUrl, extractChannelLogo, extractGifCount } from './parser';
import { scrapeTikTokProfile } from './tiktok';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = 1
): Promise<{ html: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return { html, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (attempt < retries) {
        // Wait before retry
        await sleep(2000);
        continue;
      }
      return { html: null, error: errorMessage };
    }
  }

  return { html: null, error: 'Max retries exceeded' };
}

export async function scrapeChannel(config: ChannelConfig): Promise<ScrapedChannel> {
  const slug = extractSlugFromUrl(config.url);

  const { html, error } = await fetchWithRetry(config.url);

  // Also scrape TikTok if URL provided
  let tiktokFollowers: number | null = null;
  let tiktokLikes: number | null = null;

  if (config.tiktokUrl) {
    try {
      const tiktokStats = await scrapeTikTokProfile(config.tiktokUrl);
      if (tiktokStats) {
        tiktokFollowers = tiktokStats.followers;
        tiktokLikes = tiktokStats.likes;
      }
    } catch (e) {
      console.error(`TikTok scrape failed for ${config.tiktokUrl}:`, e);
    }
  }

  if (error || !html) {
    return {
      channelName: slug,
      channelUrl: config.url,
      rank: config.rank,
      category: config.category,
      isAbstract: config.isAbstract || false,
      logoUrl: null,
      totalViews: 0,
      gifCount: null,
      parseFailed: true,
      errorMessage: error || 'Empty response',
      tiktokUrl: config.tiktokUrl,
      tiktokFollowers,
      tiktokLikes,
    };
  }

  const channelName = extractChannelName(html, slug);
  const totalViews = extractViewCount(html);
  const gifCount = extractGifCount(html);
  const logoUrl = extractChannelLogo(html);

  if (totalViews === null) {
    return {
      channelName,
      channelUrl: config.url,
      rank: config.rank,
      category: config.category,
      isAbstract: config.isAbstract || false,
      logoUrl,
      totalViews: 0,
      gifCount,
      parseFailed: true,
      errorMessage: 'Could not parse view count from page',
      tiktokUrl: config.tiktokUrl,
      tiktokFollowers,
      tiktokLikes,
    };
  }

  return {
    channelName,
    channelUrl: config.url,
    rank: config.rank,
    category: config.category,
    isAbstract: config.isAbstract || false,
    logoUrl,
    totalViews,
    gifCount,
    parseFailed: false,
    errorMessage: null,
    tiktokUrl: config.tiktokUrl,
    tiktokFollowers,
    tiktokLikes,
  };
}

export async function scrapeAllChannels(
  channels: ChannelConfig[],
  paceMs = 1200
): Promise<ScrapedChannel[]> {
  const results: ScrapedChannel[] = [];

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    console.log(`Scraping channel ${i + 1}/${channels.length}: ${channel.url}`);

    const result = await scrapeChannel(channel);
    results.push(result);

    // Add pacing between requests (except for the last one)
    if (i < channels.length - 1) {
      await sleep(paceMs);
    }
  }

  return results;
}
