import * as cheerio from 'cheerio';

/**
 * Parse a human-readable number string into a number.
 * Handles formats like: "12.3K", "4M", "1.5B", "1,234", "1234"
 */
export function parseViewCount(text: string): number | null {
  if (!text) return null;

  // Clean the string
  const cleaned = text.trim().toUpperCase().replace(/,/g, '');

  // Match number with optional single decimal point and suffix
  // Only allow format: digits, optionally followed by one decimal point and more digits
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  const suffix = match[2];
  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };

  const multiplier = suffix ? multipliers[suffix] : 1;
  return Math.round(num * multiplier);
}

/**
 * Extract view count from page HTML using multiple strategies
 */
export function extractViewCount(html: string): number | null {
  const $ = cheerio.load(html);

  // Strategy 1: Look for JSON-LD structured data
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const jsonContent = $(jsonLdScripts[i]).html();
      if (jsonContent) {
        const data = JSON.parse(jsonContent);
        // Look for interactionStatistic or view counts
        if (data.interactionStatistic) {
          const stats = Array.isArray(data.interactionStatistic)
            ? data.interactionStatistic
            : [data.interactionStatistic];
          for (const stat of stats) {
            if (
              stat['@type'] === 'InteractionCounter' &&
              stat.interactionType?.includes('Watch')
            ) {
              const count = parseInt(stat.userInteractionCount, 10);
              if (!isNaN(count)) return count;
            }
          }
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 2: Look for Next.js/React hydration state
  const scriptTags = $('script');
  for (let i = 0; i < scriptTags.length; i++) {
    const content = $(scriptTags[i]).html() || '';
    // Look for __NEXT_DATA__ or similar
    if (content.includes('__NEXT_DATA__')) {
      try {
        const match = content.match(/__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*$/);
        if (match) {
          const data = JSON.parse(match[1]);
          const views = findViewsInObject(data);
          if (views !== null) return views;
        }
      } catch {
        // Continue to next strategy
      }
    }

    // Look for embedded JSON with view counts
    const viewMatch = content.match(/"(?:total_?)?views?":\s*(\d+)/i);
    if (viewMatch) {
      const count = parseInt(viewMatch[1], 10);
      if (!isNaN(count) && count > 0) return count;
    }
  }

  // Strategy 3: DOM text patterns - look for view count displays
  const viewPatterns = [
    /(\d+(?:[.,]\d+)?[KMB]?)\s*(?:total\s*)?views/i,
    /views[:\s]+(\d+(?:[.,]\d+)?[KMB]?)/i,
    /(\d+(?:[.,]\d+)?[KMB]?)\s*GIF\s*views/i,
  ];

  const bodyText = $('body').text();
  for (const pattern of viewPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const parsed = parseViewCount(match[1]);
      if (parsed !== null && parsed > 0) return parsed;
    }
  }

  // Strategy 4: Look for specific elements that might contain view counts
  const viewSelectors = [
    '[data-testid*="view"]',
    '[class*="view-count"]',
    '[class*="views"]',
    '.stats',
    '.channel-stats',
  ];

  for (const selector of viewSelectors) {
    const elements = $(selector);
    for (let i = 0; i < elements.length; i++) {
      const text = $(elements[i]).text();
      for (const pattern of viewPatterns) {
        const match = text.match(pattern);
        if (match) {
          const parsed = parseViewCount(match[1]);
          if (parsed !== null && parsed > 0) return parsed;
        }
      }
      // Also try parsing the raw text as a number
      const parsed = parseViewCount(text.replace(/[^\d.,KMB]/gi, ''));
      if (parsed !== null && parsed > 0) return parsed;
    }
  }

  return null;
}

/**
 * Recursively search an object for view count properties
 */
function findViewsInObject(obj: unknown, depth = 0): number | null {
  if (depth > 10) return null; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') return null;

  const record = obj as Record<string, unknown>;

  // Check for view-related keys
  const viewKeys = ['views', 'totalViews', 'total_views', 'viewCount', 'view_count'];
  for (const key of viewKeys) {
    if (key in record) {
      const val = record[key];
      if (typeof val === 'number' && val > 0) return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
  }

  // Recursively search nested objects
  for (const value of Object.values(record)) {
    const result = findViewsInObject(value, depth + 1);
    if (result !== null) return result;
  }

  return null;
}

/**
 * Clean up channel name by removing common GIPHY suffixes
 */
function cleanChannelName(name: string): string {
  return name
    .replace(/\s*GIFs\s+on\s+GIPHY.*$/i, '')  // Remove "GIFs on GIPHY - Be Animated" etc
    .replace(/\s*[-|]\s*GIPHY.*$/i, '')  // Remove "- GIPHY" or "| GIPHY" suffixes
    .replace(/\s*on\s+GIPHY\s*$/i, '')  // Remove "on GIPHY" suffix
    .replace(/\s*[-|]\s*Be\s+Animated\s*$/i, '')  // Remove "- Be Animated" suffix
    .trim();
}

/**
 * Extract channel name from page HTML
 */
export function extractChannelName(html: string, fallbackSlug: string): string {
  const $ = cheerio.load(html);

  // Strategy 1: Look for meta tags
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) {
    const cleaned = cleanChannelName(ogTitle);
    return cleaned || fallbackSlug;
  }

  // Strategy 2: Look for title tag
  const title = $('title').text();
  if (title) {
    const cleaned = cleanChannelName(title);
    return cleaned || fallbackSlug;
  }

  // Strategy 3: Look for h1 or channel name elements
  const h1 = $('h1').first().text().trim();
  if (h1) return h1;

  const channelName = $('[class*="channel-name"], [data-testid*="channel-name"]')
    .first()
    .text()
    .trim();
  if (channelName) return channelName;

  return fallbackSlug;
}

/**
 * Extract slug from GIPHY channel URL
 */
export function extractSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Usually the last part is the channel slug
    return pathParts[pathParts.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Extract GIF count from page HTML
 */
export function extractGifCount(html: string): number | null {
  const $ = cheerio.load(html);

  // Strategy 1: Look for gif_count or similar in JSON
  const scriptTags = $('script');
  for (let i = 0; i < scriptTags.length; i++) {
    const content = $(scriptTags[i]).html() || '';

    // Look for gif_count in JSON
    const gifCountMatch = content.match(/"gif_count":\s*(\d+)/i);
    if (gifCountMatch) {
      const count = parseInt(gifCountMatch[1], 10);
      if (!isNaN(count) && count >= 0) return count;
    }

    // Look for channel.gifs or similar patterns
    const gifsMatch = content.match(/"gifs":\s*(\d+)/i);
    if (gifsMatch) {
      const count = parseInt(gifsMatch[1], 10);
      if (!isNaN(count) && count >= 0) return count;
    }
  }

  // Strategy 2: Look in escaped JSON (like avatar_url pattern)
  const escapedMatch = html.match(/gif_count\\":(\d+)/);
  if (escapedMatch) {
    const count = parseInt(escapedMatch[1], 10);
    if (!isNaN(count) && count >= 0) return count;
  }

  // Strategy 3: DOM text patterns
  const gifPatterns = [
    /(\d+(?:,\d+)?)\s*GIFs?(?:\s|$)/i,
    /GIFs?[:\s]+(\d+(?:,\d+)?)/i,
  ];

  const bodyText = $('body').text();
  for (const pattern of gifPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const count = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(count) && count >= 0) return count;
    }
  }

  return null;
}

/**
 * Extract channel logo/avatar from page HTML
 */
export function extractChannelLogo(html: string): string | null {
  const $ = cheerio.load(html);

  // Strategy 1 (BEST): Look for avatar_url in escaped JSON (e.g., avatar_url\":\"https://...)
  const escapedMatch = html.match(/avatar_url\\":\\"(https:\/\/media\.giphy\.com\/[^"\\]+)/);
  if (escapedMatch && escapedMatch[1]) {
    return escapedMatch[1];
  }

  // Strategy 2: Look for avatar_url in regular JSON
  const avatarUrlMatch = html.match(/"avatar_url":\s*"(https:\/\/media\.giphy\.com\/[^"]+)"/);
  if (avatarUrlMatch && avatarUrlMatch[1]) {
    return avatarUrlMatch[1];
  }

  // Strategy 3: Look for "avatar" field (without _url suffix) in escaped JSON
  const escapedAvatarMatch = html.match(/avatar\\":\\"(https:\/\/media\.giphy\.com\/[^"\\]+)/);
  if (escapedAvatarMatch && escapedAvatarMatch[1]) {
    return escapedAvatarMatch[1];
  }

  // Strategy 3: Look for square profile images (208x208 or similar)
  // Avoid banners which have different aspect ratios
  const imgTags = $('img');
  for (let i = 0; i < imgTags.length; i++) {
    const img = $(imgTags[i]);
    const src = img.attr('src');
    const width = img.attr('width');
    const height = img.attr('height');

    // Look for square images from avatars/channel_assets
    if (src && (src.includes('/avatars/') || src.includes('/channel_assets/'))) {
      if (width && height && width === height) {
        return src;
      }
    }
  }

  // Strategy 4: Look for preloaded avatar images, but filter out banners
  const preloadLinks = $('link[rel="preload"][as="image"]');
  for (let i = 0; i < preloadLinks.length; i++) {
    const href = $(preloadLinks[i]).attr('href');
    if (href && (href.includes('/avatars/') || href.includes('/channel_assets/'))) {
      // Skip if it looks like a banner (wide images often have specific patterns)
      if (!href.includes('banner')) {
        return href;
      }
    }
  }

  return null;
}
