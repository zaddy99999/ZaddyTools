import { NextResponse } from 'next/server';
import { getAbstractNews } from '@/lib/sheets';
import Groq from 'groq-sdk';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: {
    title: string;
    id?: string;
    color?: string;
  };
  published_at: string;
  category?: string;
  summary?: string;
}

// Source configurations for Abstract ecosystem
const SOURCE_CONFIG: Record<string, { id: string; color: string }> = {
  'Abstract': { id: 'abstract-official', color: '#2EDB84' },
  'Abstract Blog': { id: 'abstract-blog', color: '#2EDB84' },
  'Abstract Official': { id: 'abstract-official', color: '#2EDB84' },
  '@AbstractChain': { id: 'abstract-twitter', color: '#2EDB84' },
  'Community': { id: 'community', color: '#8B5CF6' },
  'News': { id: 'news', color: '#3B82F6' },
};

function getSourceMeta(sourceName: string): { id: string; color: string } {
  // Check direct match
  if (SOURCE_CONFIG[sourceName]) return SOURCE_CONFIG[sourceName];

  // Check if it's a Twitter handle
  if (sourceName.startsWith('@')) {
    return { id: 'twitter', color: '#1DA1F2' };
  }

  return { id: sourceName.toLowerCase().replace(/\s+/g, ''), color: '#6B7280' };
}

let cache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Summarize content using Groq AI
async function summarizeContent(content: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) return content.slice(0, 150) + (content.length > 150 ? '...' : '');

  try {
    const groq = new Groq({ apiKey: groqApiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a crypto news summarizer. Create a concise 1-2 sentence summary of this tweet or news content. Focus on the key announcement or information. Be direct and informative.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content?.trim() || content.slice(0, 150);
  } catch (error) {
    console.error('Error summarizing content:', error);
    return content.slice(0, 150) + (content.length > 150 ? '...' : '');
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch from Google Sheets
    const sheetNews = await getAbstractNews();

    // Transform sheet data to NewsItem format
    const newsItems: NewsItem[] = await Promise.all(
      sheetNews.map(async (item, idx) => {
        const sourceMeta = getSourceMeta(item.source);

        // Use existing summary or generate one
        let summary = item.summary;
        if (!summary && item.content) {
          summary = await summarizeContent(item.content);
        }

        return {
          id: item.id || `abstract-${idx}`,
          title: summary || item.content.slice(0, 150),
          url: item.sourceUrl || '#',
          source: {
            title: item.source,
            id: sourceMeta.id,
            color: sourceMeta.color,
          },
          published_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          category: item.category || 'News',
          summary: summary,
        };
      })
    );

    // Sort by date (newest first)
    newsItems.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    cache = { data: newsItems, timestamp: Date.now() };
    return NextResponse.json(newsItems);
  } catch (error) {
    console.error('Error fetching Abstract news:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json([]);
  }
}
