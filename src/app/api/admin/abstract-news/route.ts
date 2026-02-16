import { NextResponse } from 'next/server';
import { addAbstractNewsItem, getAbstractNews } from '@/lib/sheets';
import { validateSession, safeCompare } from '@/lib/admin-session';

function isAuthorized(request: Request): boolean {
  // First, check for session token (new secure method)
  const sessionToken = request.headers.get('x-admin-session');
  if (sessionToken && validateSession(sessionToken)) {
    return true;
  }

  // Fallback: check for direct admin key (for backward compatibility)
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.error('ADMIN_KEY environment variable is not configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-key');
  if (!authHeader) {
    return false;
  }

  return safeCompare(authHeader, adminKey);
}

// Parse Untamed Reports format into individual news items
function parseUntamedReport(reportText: string): Array<{
  content: string;
  source: string;
  sourceUrl: string;
  date: string;
  category: string;
}> {
  const items: Array<{
    content: string;
    source: string;
    sourceUrl: string;
    date: string;
    category: string;
  }> = [];

  // Extract title from first line if present
  const titleMatch = reportText.match(/Untamed Report:.*?\("([^"]+)"\)/);
  const reportTitle = titleMatch ? titleMatch[1] : '';

  // Split by bullet points (✳️)
  const bullets = reportText.split('✳️').slice(1); // Skip first split which is header

  for (const bullet of bullets) {
    const cleaned = bullet.trim();
    if (!cleaned || cleaned.startsWith('Gmabs') || cleaned.includes('This report is brought to you')) {
      continue;
    }

    // Skip "(more)" continuation bullets - they're part of previous item
    if (cleaned.startsWith('(more)')) {
      // Append to previous item if exists
      if (items.length > 0) {
        items[items.length - 1].content += ' ' + cleaned.replace('(more)', '').trim();
      }
      continue;
    }

    // Extract @mentions for source
    const mentionMatch = cleaned.match(/@(\w+)/);
    const source = mentionMatch ? `@${mentionMatch[1]}` : '@AbstractChain';

    // Determine category
    let category = 'News';
    if (source === '@AbstractChain') {
      category = 'Official';
    } else if (cleaned.toLowerCase().includes('game') || cleaned.toLowerCase().includes('player')) {
      category = 'Gaming';
    } else if (cleaned.toLowerCase().includes('nft') || cleaned.toLowerCase().includes('collection')) {
      category = 'NFT';
    } else if (cleaned.toLowerCase().includes('token') || cleaned.toLowerCase().includes('airdrop')) {
      category = 'Token';
    }

    items.push({
      content: cleaned.replace(/@\w+/g, (match) => match).trim(),
      source,
      sourceUrl: '', // Would need actual tweet URLs
      date: new Date().toISOString(),
      category,
    });
  }

  return items;
}

export async function GET() {
  try {
    const news = await getAbstractNews();
    return NextResponse.json({ count: news.length, items: news });
  } catch (error) {
    console.error('Error fetching abstract news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { action, items, report } = body;

    // Bulk import from parsed items
    if (action === 'bulk-import' && Array.isArray(items)) {
      const results = await Promise.all(
        items.map((item: {
          content: string;
          source: string;
          sourceUrl?: string;
          date?: string;
          category?: string;
        }) => addAbstractNewsItem({
          content: item.content,
          source: item.source || '@AbstractChain',
          sourceUrl: item.sourceUrl || '',
          date: item.date || new Date().toISOString(),
          category: item.category || 'News',
        }))
      );
      const successCount = results.filter(Boolean).length;
      return NextResponse.json({ success: true, imported: successCount, total: items.length });
    }

    // Parse Untamed Report format and import
    if (action === 'parse-report' && typeof report === 'string') {
      const parsed = parseUntamedReport(report);
      const results = await Promise.all(
        parsed.map((item) => addAbstractNewsItem(item))
      );
      const successCount = results.filter(Boolean).length;
      return NextResponse.json({
        success: true,
        parsed: parsed.length,
        imported: successCount,
        items: parsed,
      });
    }

    // Add single item
    if (action === 'add' && body.content) {
      const success = await addAbstractNewsItem({
        content: body.content,
        source: body.source || '@AbstractChain',
        sourceUrl: body.sourceUrl || '',
        date: body.date || new Date().toISOString(),
        category: body.category || 'News',
      });
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing abstract news:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
