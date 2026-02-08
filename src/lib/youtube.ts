import * as cheerio from 'cheerio';

export interface YouTubeData {
  subscribers: number | null;
  totalViews: number | null;
  videoCount: number | null;
}

function parseCount(text: string): number | null {
  if (!text) return null;

  // Clean the text
  const cleaned = text.replace(/,/g, '').trim().toLowerCase();

  // Handle formats like "1.5M", "234K", "1.2B"
  const match = cleaned.match(/^([\d.]+)\s*([kmb])?/);
  if (!match) {
    // Try to parse as plain number
    const num = parseInt(cleaned.replace(/\D/g, ''), 10);
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(match[1]);
  const suffix = match[2];

  if (isNaN(num)) return null;

  switch (suffix) {
    case 'k':
      return Math.round(num * 1_000);
    case 'm':
      return Math.round(num * 1_000_000);
    case 'b':
      return Math.round(num * 1_000_000_000);
    default:
      return Math.round(num);
  }
}

export async function scrapeYouTubeChannel(url: string): Promise<YouTubeData> {
  const result: YouTubeData = {
    subscribers: null,
    totalViews: null,
    videoCount: null,
  };

  if (!url) return result;

  try {
    // Normalize URL to about page
    let aboutUrl = url.trim();
    if (aboutUrl.endsWith('/')) {
      aboutUrl = aboutUrl.slice(0, -1);
    }
    if (!aboutUrl.endsWith('/about')) {
      aboutUrl = aboutUrl + '/about';
    }

    const response = await fetch(aboutUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`YouTube fetch failed for ${url}: ${response.status}`);
      return result;
    }

    const html = await response.text();

    // YouTube loads data via JavaScript, but some data is in the initial HTML
    // Look for the ytInitialData JSON object - find the start and parse until we find the matching end
    const startMarker = 'var ytInitialData = ';
    const startIndex = html.indexOf(startMarker);
    let dataMatch: RegExpMatchArray | null = null;

    if (startIndex !== -1) {
      // Find the JSON object by counting braces
      const jsonStart = startIndex + startMarker.length;
      let braceCount = 0;
      let jsonEnd = jsonStart;
      let inString = false;
      let escaped = false;

      for (let i = jsonStart; i < html.length; i++) {
        const char = html[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }

      if (jsonEnd > jsonStart) {
        const jsonStr = html.slice(jsonStart, jsonEnd);
        dataMatch = [jsonStr, jsonStr] as unknown as RegExpMatchArray;
      }
    }
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);

        // Navigate the data structure to find subscriber count
        const header = data?.header?.c4TabbedHeaderRenderer;
        if (header) {
          // Subscriber count
          const subText = header.subscriberCountText?.simpleText ||
                          header.subscriberCountText?.runs?.[0]?.text || '';
          result.subscribers = parseCount(subText.replace(/subscribers?/i, ''));
        }

        // Look for about page data (views and video count)
        const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        for (const tab of tabs) {
          const tabRenderer = tab.tabRenderer;
          if (tabRenderer?.title === 'About') {
            const content = tabRenderer.content?.sectionListRenderer?.contents?.[0]
              ?.itemSectionRenderer?.contents?.[0]?.channelAboutFullMetadataRenderer;

            if (content) {
              // Total views
              const viewsText = content.viewCountText?.simpleText || '';
              result.totalViews = parseCount(viewsText.replace(/views?/i, ''));

              // Video count (might be in different location)
              const videoCountText = content.videoCountText?.simpleText || '';
              result.videoCount = parseCount(videoCountText.replace(/videos?/i, ''));
            }
          }
        }

        // Alternative: look for videosCountText in header
        if (!result.videoCount && header?.videosCountText) {
          const videoText = header.videosCountText.runs?.[0]?.text ||
                           header.videosCountText.simpleText || '';
          result.videoCount = parseCount(videoText);
        }

      } catch (parseError) {
        console.error(`Failed to parse YouTube data for ${url}:`, parseError);
      }
    }

    // Fallback: try to find subscriber count in meta tags or other HTML
    if (result.subscribers === null) {
      const $ = cheerio.load(html);

      // Try meta tags
      const metaContent = $('meta[name="twitter:title"]').attr('content') || '';
      const subMatch = metaContent.match(/([\d.]+[KMB]?)\s*subscribers?/i);
      if (subMatch) {
        result.subscribers = parseCount(subMatch[1]);
      }
    }

    return result;
  } catch (error) {
    console.error(`Error scraping YouTube ${url}:`, error);
    return result;
  }
}

export async function scrapeMultipleYouTubeChannels(
  urls: Array<{ channelUrl: string; youtubeUrl: string | null }>,
  delayMs: number = 2000
): Promise<Map<string, YouTubeData>> {
  const results = new Map<string, YouTubeData>();

  for (const { channelUrl, youtubeUrl } of urls) {
    if (youtubeUrl) {
      const data = await scrapeYouTubeChannel(youtubeUrl);
      results.set(channelUrl, data);

      // Delay between requests to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return results;
}
