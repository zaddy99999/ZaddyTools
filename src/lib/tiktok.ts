import * as cheerio from 'cheerio';

export interface TikTokStats {
  followers: number | null;
  likes: number | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Parse TikTok follower/like counts (handles 1.2M, 500K, etc.)
 */
function parseCount(text: string): number | null {
  if (!text) return null;

  const cleaned = text.trim().toUpperCase().replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  const suffix = match[2];
  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };

  return Math.round(num * (suffix ? multipliers[suffix] : 1));
}

/**
 * Extract TikTok username from URL
 */
export function extractTikTokUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('tiktok.com')) return null;

    const match = urlObj.pathname.match(/^\/@?([^/?]+)/);
    return match ? match[1].replace('@', '') : null;
  } catch {
    return null;
  }
}

/**
 * Scrape TikTok profile stats from HTML
 */
export function extractTikTokStats(html: string, username: string): TikTokStats {
  const $ = cheerio.load(html);

  const stats: TikTokStats = {
    followers: null,
    likes: null,
    username,
    displayName: null,
    avatarUrl: null,
  };

  // Strategy 1: Look for JSON data in script tags (most reliable)
  const scripts = $('script');
  for (let i = 0; i < scripts.length; i++) {
    const content = $(scripts[i]).html() || '';

    // Look for SIGI_STATE or similar hydration data
    if (content.includes('followerCount') || content.includes('heartCount')) {
      try {
        // Extract follower count
        const followerMatch = content.match(/"followerCount":\s*(\d+)/);
        if (followerMatch) {
          stats.followers = parseInt(followerMatch[1], 10);
        }

        // Extract likes/hearts count
        const likesMatch = content.match(/"heartCount":\s*(\d+)/) ||
                          content.match(/"heart":\s*(\d+)/) ||
                          content.match(/"likesCount":\s*(\d+)/);
        if (likesMatch) {
          stats.likes = parseInt(likesMatch[1], 10);
        }

        // Extract display name
        const nameMatch = content.match(/"nickname":\s*"([^"]+)"/);
        if (nameMatch) {
          stats.displayName = nameMatch[1];
        }

        // Extract avatar
        const avatarMatch = content.match(/"avatarLarger":\s*"([^"]+)"/) ||
                           content.match(/"avatarMedium":\s*"([^"]+)"/);
        if (avatarMatch) {
          stats.avatarUrl = avatarMatch[1].replace(/\\u002F/g, '/');
        }

        if (stats.followers !== null) break;
      } catch {
        // Continue to next strategy
      }
    }
  }

  // Strategy 2: Look for stats in meta tags or visible elements
  if (stats.followers === null) {
    // Try to find follower count in page text
    const pageText = $('body').text();

    const followerPatterns = [
      /(\d+(?:\.\d+)?[KMB]?)\s*Followers/i,
      /Followers\s*(\d+(?:\.\d+)?[KMB]?)/i,
    ];

    for (const pattern of followerPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        stats.followers = parseCount(match[1]);
        if (stats.followers !== null) break;
      }
    }

    const likePatterns = [
      /(\d+(?:\.\d+)?[KMB]?)\s*Likes/i,
      /Likes\s*(\d+(?:\.\d+)?[KMB]?)/i,
    ];

    for (const pattern of likePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        stats.likes = parseCount(match[1]);
        if (stats.likes !== null) break;
      }
    }
  }

  // Strategy 3: Look for og:title for display name
  if (!stats.displayName) {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      // Usually format: "Display Name (@username)"
      const nameMatch = ogTitle.match(/^([^(@]+)/);
      if (nameMatch) {
        stats.displayName = nameMatch[1].trim();
      }
    }
  }

  return stats;
}

/**
 * Fetch TikTok profile and extract stats
 */
export async function scrapeTikTokProfile(url: string): Promise<TikTokStats | null> {
  const username = extractTikTokUsername(url);
  if (!username) return null;

  try {
    const response = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`TikTok fetch failed for ${username}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return extractTikTokStats(html, username);
  } catch (error) {
    console.error(`TikTok scrape error for ${username}:`, error);
    return null;
  }
}
