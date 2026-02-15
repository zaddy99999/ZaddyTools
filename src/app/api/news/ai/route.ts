import { NextRequest, NextResponse } from 'next/server';

// Sentiment types
export type SentimentType = 'bullish' | 'bearish' | 'neutral';

interface SentimentResult {
  sentiment: SentimentType;
  confidence: number;
}

interface SummaryResult {
  summary: string;
}

// Check if Groq API key is available
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Simple keyword-based sentiment analysis (fallback when no API)
function analyzeWithKeywords(title: string): SentimentResult {
  const lowerTitle = title.toLowerCase();

  const bullishKeywords = [
    'surge', 'soar', 'rally', 'gains', 'bullish', 'breakout', 'all-time high', 'ath',
    'pump', 'moon', 'skyrocket', 'explode', 'boom', 'record high', 'buy', 'long',
    'accumulate', 'adoption', 'partnership', 'launch', 'upgrade', 'growth', 'profit',
    'positive', 'optimistic', 'strong', 'support', 'upside', 'reversal up', 'recovery',
    'outperform', 'etf approved', 'institutional', 'whale buy', 'breakthrough', 'milestone'
  ];

  const bearishKeywords = [
    'crash', 'plunge', 'dump', 'bearish', 'collapse', 'fall', 'drop', 'decline',
    'sell', 'short', 'liquidation', 'hack', 'exploit', 'scam', 'rug', 'fraud',
    'ban', 'lawsuit', 'sec', 'investigation', 'warning', 'risk', 'fear', 'panic',
    'negative', 'weak', 'resistance', 'downside', 'loss', 'outflow', 'correction',
    'bankruptcy', 'insolvency', 'layoff', 'shutdown', 'regulatory crackdown', 'fine'
  ];

  let bullishScore = 0;
  let bearishScore = 0;

  for (const keyword of bullishKeywords) {
    if (lowerTitle.includes(keyword)) bullishScore++;
  }

  for (const keyword of bearishKeywords) {
    if (lowerTitle.includes(keyword)) bearishScore++;
  }

  const totalScore = bullishScore + bearishScore;

  if (totalScore === 0) {
    return { sentiment: 'neutral', confidence: 0.5 };
  }

  if (bullishScore > bearishScore) {
    return {
      sentiment: 'bullish',
      confidence: Math.min(0.5 + (bullishScore - bearishScore) * 0.15, 0.95)
    };
  } else if (bearishScore > bullishScore) {
    return {
      sentiment: 'bearish',
      confidence: Math.min(0.5 + (bearishScore - bullishScore) * 0.15, 0.95)
    };
  }

  return { sentiment: 'neutral', confidence: 0.6 };
}

// AI-powered sentiment analysis using Groq
async function analyzeWithAI(title: string): Promise<SentimentResult> {
  if (!GROQ_API_KEY) {
    return analyzeWithKeywords(title);
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a financial sentiment analyzer. Analyze the sentiment of crypto/finance news headlines.
Respond with ONLY a JSON object in this format: {"sentiment": "bullish" | "bearish" | "neutral", "confidence": 0.0-1.0}
- bullish: positive market implications, price increase likely, good news
- bearish: negative market implications, price decrease likely, bad news
- neutral: informational, mixed signals, or unclear market impact
Be concise and accurate. Consider market psychology.`
          },
          {
            role: 'user',
            content: `Analyze sentiment: "${title}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return analyzeWithKeywords(title);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (['bullish', 'bearish', 'neutral'].includes(parsed.sentiment)) {
        return {
          sentiment: parsed.sentiment as SentimentType,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        };
      }
    }

    return analyzeWithKeywords(title);
  } catch (error) {
    console.error('AI sentiment error:', error);
    return analyzeWithKeywords(title);
  }
}

// AI-powered summary generation using Groq
async function generateSummaryWithAI(title: string, url: string): Promise<SummaryResult> {
  if (!GROQ_API_KEY) {
    return {
      summary: `This article discusses: ${title}. Click to read the full story for more details.`
    };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a crypto/finance news summarizer. Generate a concise 2-3 sentence TL;DR summary based on the headline.
Be factual, informative, and mention key implications for traders/investors if applicable.
Do not start with "This article" or similar phrases. Just provide the summary directly.`
          },
          {
            role: 'user',
            content: `Generate a TL;DR summary for this news headline: "${title}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return { summary: `${title} - Read the full article for more details.` };
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || '';

    if (summary) {
      return { summary };
    }

    return { summary: `${title} - Read the full article for more details.` };
  } catch (error) {
    console.error('AI summary error:', error);
    return { summary: `${title} - Read the full article for more details.` };
  }
}

// Cache for sentiment results (in-memory, resets on server restart)
const sentimentCache = new Map<string, SentimentResult>();
const summaryCache = new Map<string, SummaryResult>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, title, url, id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cacheKey = id || title;

    if (action === 'sentiment') {
      // Check cache first
      if (sentimentCache.has(cacheKey)) {
        return NextResponse.json(sentimentCache.get(cacheKey));
      }

      const result = await analyzeWithAI(title);
      sentimentCache.set(cacheKey, result);

      // Limit cache size
      if (sentimentCache.size > 500) {
        const firstKey = sentimentCache.keys().next().value;
        if (firstKey) sentimentCache.delete(firstKey);
      }

      return NextResponse.json(result);
    }

    if (action === 'summary') {
      // Check cache first
      if (summaryCache.has(cacheKey)) {
        return NextResponse.json(summaryCache.get(cacheKey));
      }

      const result = await generateSummaryWithAI(title, url || '');
      summaryCache.set(cacheKey, result);

      // Limit cache size
      if (summaryCache.size > 200) {
        const firstKey = summaryCache.keys().next().value;
        if (firstKey) summaryCache.delete(firstKey);
      }

      return NextResponse.json(result);
    }

    if (action === 'batch-sentiment') {
      // Batch sentiment analysis for multiple titles
      const { items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
      }

      const results: Record<string, SentimentResult> = {};

      for (const item of items.slice(0, 20)) { // Limit to 20 items
        const itemKey = item.id || item.title;

        if (sentimentCache.has(itemKey)) {
          results[itemKey] = sentimentCache.get(itemKey)!;
        } else {
          // Use keyword analysis for batch to avoid rate limits
          const result = analyzeWithKeywords(item.title);
          sentimentCache.set(itemKey, result);
          results[itemKey] = result;
        }
      }

      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('News AI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check API status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasGroqKey: !!GROQ_API_KEY,
    features: {
      sentiment: true,
      summary: !!GROQ_API_KEY,
    },
  });
}
