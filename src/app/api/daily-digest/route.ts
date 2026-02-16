import { NextResponse } from 'next/server';
import { saveDigest, getDigest, getLatestDigests, DigestData } from '@/lib/sheets';
import { fetchWithTimeout, timeouts } from '@/lib/fetchWithTimeout';
import { checkRateLimit } from '@/lib/rateLimit';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: { title: string };
  published_at: string;
}

// RSS feeds by focus area
const cryptoFeeds = [
  { url: 'https://cointelegraph.com/rss', name: 'Cointelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
  { url: 'https://decrypt.co/feed', name: 'Decrypt' },
  { url: 'https://www.theblock.co/rss.xml', name: 'The Block' },
  { url: 'https://rsshub.app/telegram/channel/leviathan_news', name: 'Leviathan News' },
];

const tradfiFeeds = [
  { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
  { url: 'https://www.ft.com/?format=rss', name: 'Financial Times' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters' },
  { url: 'https://www.wsj.com/xml/rss/3_7085.xml', name: 'Wall Street Journal' },
];

// Refresh intervals
const DAILY_REFRESH_HOURS = 1;
const WEEKLY_REFRESH_HOURS = 6;

function getDigestId(mode: 'daily' | 'weekly', focus: 'crypto' | 'tradfi' = 'crypto'): string {
  const now = new Date();
  if (mode === 'weekly') {
    // Weekly digest ID based on 6-hour blocks (rolling 7 days)
    const block = Math.floor(now.getHours() / WEEKLY_REFRESH_HOURS);
    return `weekly-${focus}-${now.toISOString().split('T')[0]}-${block}`;
  }
  // Daily digest ID based on 1-hour blocks (rolling 24 hours)
  const block = now.getHours();
  return `daily-${focus}-${now.toISOString().split('T')[0]}-${block}`;
}

async function fetchAllNews(mode: 'daily' | 'weekly' = 'daily', focus: 'crypto' | 'tradfi' = 'crypto'): Promise<NewsItem[]> {
  const results: NewsItem[] = [];
  const now = Date.now();
  const cutoffTime = mode === 'weekly'
    ? now - 7 * 24 * 60 * 60 * 1000  // 7 days
    : now - 24 * 60 * 60 * 1000;      // 24 hours

  // Fetch from CryptoCompare (only for crypto focus)
  if (focus === 'crypto') {
    try {
      const ccRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      if (ccRes.ok) {
        const ccData = await ccRes.json();
        (ccData.Data || []).forEach((item: { id: string; title: string; url: string; source: string; published_on: number }) => {
          const publishedAt = item.published_on * 1000;
          if (publishedAt >= cutoffTime) {
            results.push({
              id: `cc-${item.id}`,
              title: item.title,
              url: item.url,
              source: { title: item.source },
              published_at: new Date(publishedAt).toISOString(),
            });
          }
        });
      }
    } catch {}
  }

  // Select feeds based on focus
  const rssFeeds = focus === 'crypto' ? cryptoFeeds : tradfiFeeds;

  // Fetch RSS feeds in parallel
  const rssPromises = rssFeeds.map(async (feed) => {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (data.status !== 'ok') return [];

      return (data.items || [])
        .map((item: { title: string; link: string; pubDate: string }, idx: number) => {
          const publishedAt = new Date(item.pubDate).getTime();
          if (isNaN(publishedAt) || publishedAt < cutoffTime) return null;
          return {
            id: `rss-${feed.name}-${idx}`,
            title: item.title,
            url: item.link,
            source: { title: feed.name },
            published_at: new Date(publishedAt).toISOString(),
          };
        })
        .filter(Boolean) as NewsItem[];
    } catch {
      return [];
    }
  });

  const rssResults = await Promise.all(rssPromises);
  rssResults.forEach(items => results.push(...items));

  // Sort by most recent first
  return results.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

async function generateDigest(
  mode: 'daily' | 'weekly',
  news: NewsItem[],
  focus: 'crypto' | 'tradfi' = 'crypto'
): Promise<DigestData> {
  const now = new Date();
  const digestId = getDigestId(mode, focus);

  // Dedupe headlines
  const seen = new Set<string>();
  const uniqueNews = news.filter(n => {
    const key = n.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const maxNews = mode === 'weekly' ? 40 : 25;
  const topNews = uniqueNews.slice(0, maxNews);
  const headlines = topNews.map((n, i) => `[${i}] ${n.title} (${n.source.title})`).join('\n');

  const timeframe = mode === 'weekly' ? 'this week' : 'the last 24 hours';
  const bulletCount = mode === 'weekly' ? '8-10' : '6-8';

  // Different prompts based on focus
  const cryptoCategories = `CATEGORIES TO USE (only include categories that have relevant news):
- "Markets" - Price moves, trading, ETFs, market trends
- "DeFi" - DEXs, lending, yield, liquidity, protocols
- "Institutional" - Banks, funds, corporate adoption, Wall Street
- "Regulation" - SEC, laws, government, legal cases
- "NFTs & Gaming" - NFTs, metaverse, gaming, collectibles
- "Tech & Dev" - Protocol updates, launches, technical news
- "Drama" - Hacks, scams, controversies, lawsuits, beefs`;

  const tradfiCategories = `CATEGORIES TO USE (only include categories that have relevant news):
- "Markets" - Stock moves, indices, commodities, forex
- "Economy" - Fed, inflation, jobs, GDP, economic data
- "Earnings" - Company results, guidance, analyst reactions
- "M&A" - Mergers, acquisitions, IPOs, SPACs
- "Tech" - Big tech news, AI, semiconductors
- "Policy" - Government policy, trade, geopolitics
- "Drama" - Scandals, controversies, layoffs, lawsuits`;

  const focusLabel = focus === 'crypto' ? 'crypto & market' : 'finance & market';
  const categories = focus === 'crypto' ? cryptoCategories : tradfiCategories;

  const prompt = `You're curating the most interesting/viral ${focusLabel} news from ${timeframe}. Pick the ${bulletCount} BEST stories from these headlines and organize them by category.

HEADLINES:
${headlines}

${categories}

For each bullet:
- Start with an emoji that fits the vibe
- Keep it to 1-2 sentences max
- Include specific numbers/names
- Make it interesting, not boring
- Include the source index number
- Mark the 2-3 most important/viral stories with "featured": true

Respond in this JSON format:
{
  "categories": [
    {
      "name": "Markets",
      "bullets": [
        { "text": "🚀 Bitcoin blasted past $72k as ETF inflows hit record $1.2B", "sourceIndex": 3, "featured": true },
        { "text": "📊 ETH/BTC ratio hits 2-year low as Bitcoin dominance climbs", "sourceIndex": 5, "featured": false }
      ]
    },
    {
      "name": "DeFi",
      "bullets": [
        { "text": "💰 Aave hit $20B TVL for the first time since 2021", "sourceIndex": 8, "featured": false }
      ]
    }
  ]
}`;

  try {
    // Use fetch with timeout instead of SDK for better Vercel compatibility
    const groqResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
      timeout: timeouts.GROQ_API, // 15 second timeout
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const completion = await groqResponse.json();
    const response = completion.choices?.[0]?.message?.content;
    if (!response) throw new Error('No response from Groq');

    const parsed = JSON.parse(response);

    // Calculate date label
    let dateLabel: string;
    if (mode === 'weekly') {
      dateLabel = 'Last 7 Days';
    } else {
      dateLabel = 'Last 24 Hours';
    }

    // Calculate expiry
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + (mode === 'weekly' ? WEEKLY_REFRESH_HOURS : DAILY_REFRESH_HOURS));

    // Handle both old flat format and new categorized format
    let sections: { content: string; url?: string; category?: string; featured?: boolean }[] = [];

    if (parsed.categories && Array.isArray(parsed.categories)) {
      // New categorized format
      for (const cat of parsed.categories) {
        for (const bullet of cat.bullets || []) {
          if (typeof bullet === 'string') {
            sections.push({ content: bullet, category: cat.name });
          } else {
            sections.push({
              content: bullet.text,
              url: topNews[bullet.sourceIndex]?.url,
              category: cat.name,
              featured: bullet.featured === true,
            });
          }
        }
      }
    } else if (parsed.bullets) {
      // Old flat format fallback
      sections = (parsed.bullets || []).map((bullet: { text: string; sourceIndex: number; featured?: boolean } | string) => {
        if (typeof bullet === 'string') {
          return { content: bullet };
        }
        return {
          content: bullet.text,
          url: topNews[bullet.sourceIndex]?.url,
          featured: bullet.featured === true,
        };
      });
    }

    const digest: DigestData = {
      id: digestId,
      mode,
      dateLabel,
      summary: '',
      sections,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Save to Google Sheets
    try {
      await saveDigest(digest);
    } catch (err) {
      console.error('Failed to save digest to sheets:', err);
    }

    return digest;

  } catch (error) {
    console.error('Groq error generating digest:', error);
    // Note: API key validation removed to prevent exposure of key metadata in logs

    // Fallback digest
    return {
      id: digestId,
      mode,
      dateLabel: mode === 'weekly' ? 'This Week' : 'Last 24 Hours',
      summary: `Top stories: ${uniqueNews.slice(0, 3).map(n => n.title).join('. ')}.`,
      sections: [],
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // Retry in 1 hour
    };
  }
}

export async function GET(request: Request) {
  // Rate limit: 5 requests per minute (Groq AI costs)
  const rateLimitResponse = checkRateLimit(request, { windowMs: 60000, maxRequests: 5 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        error: 'AI service not configured'
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') || 'daily') as 'daily' | 'weekly';
    const focus = (searchParams.get('focus') || 'crypto') as 'crypto' | 'tradfi';
    const forceRefresh = searchParams.get('force') === 'true';
    const now = new Date();
    const digestId = getDigestId(mode, focus);

    // Try to get cached digest from Google Sheets (skip if force refresh)
    let digest: DigestData | null = null;
    if (!forceRefresh) {
      try {
        digest = await getDigest(digestId);
      } catch (err) {
        console.error('Error checking cached digest:', err);
      }
    }

    // Check if digest is still valid (not expired)
    if (!forceRefresh && digest && new Date(digest.expiresAt) > now) {
      // Return cached digest
      return NextResponse.json([{
        date: digest.id,
        dateLabel: digest.dateLabel,
        summary: digest.summary,
        summaryUrl: digest.summaryUrl,
        sections: digest.sections.map(s => ({ title: '', content: s.content, url: s.url, category: s.category, featured: s.featured })),
        generatedAt: digest.generatedAt,
      }]);
    }

    // Try to get any recent digest first as fallback
    let fallbackDigest: DigestData | null = null;
    try {
      const recentDigests = await getLatestDigests(mode, 1);
      if (recentDigests.length > 0) {
        fallbackDigest = recentDigests[0];
      }
    } catch (err) {
      console.error('Error fetching fallback digest:', err);
    }

    // Generate new digest
    const allNews = await fetchAllNews(mode, focus);

    if (allNews.length === 0) {
      console.log(`No news fetched for ${mode} mode, checking fallback...`);
      // Return cached digest if available
      if (fallbackDigest) {
        console.log('Returning fallback digest:', fallbackDigest.id);
        return NextResponse.json([{
          date: fallbackDigest.id,
          dateLabel: fallbackDigest.dateLabel,
          summary: fallbackDigest.summary,
          summaryUrl: fallbackDigest.summaryUrl,
          sections: fallbackDigest.sections.map(s => ({ title: '', content: s.content, url: s.url, category: s.category, featured: s.featured })),
          generatedAt: fallbackDigest.generatedAt,
        }]);
      }
      return NextResponse.json({ error: 'No news available' }, { status: 500 });
    }

    let newDigest: DigestData;
    try {
      newDigest = await generateDigest(mode, allNews, focus);
    } catch (genError) {
      console.error('Digest generation failed:', genError);
      // Return fallback if generation fails
      if (fallbackDigest) {
        return NextResponse.json([{
          date: fallbackDigest.id,
          dateLabel: fallbackDigest.dateLabel,
          summary: fallbackDigest.summary,
          summaryUrl: fallbackDigest.summaryUrl,
          sections: fallbackDigest.sections.map(s => ({ title: '', content: s.content, url: s.url, category: s.category, featured: s.featured })),
          generatedAt: fallbackDigest.generatedAt,
        }]);
      }
      throw genError;
    }

    return NextResponse.json([{
      date: newDigest.id,
      dateLabel: newDigest.dateLabel,
      summary: newDigest.summary,
      summaryUrl: newDigest.summaryUrl,
      sections: newDigest.sections.map(s => ({ title: '', content: s.content, url: s.url, category: s.category, featured: s.featured })),
      generatedAt: newDigest.generatedAt,
    }]);

  } catch (error) {
    console.error('Daily digest error:', error);
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}
