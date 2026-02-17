import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

async function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google credentials not configured');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// POST - Log a page view or tool interaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, page, tool, timestamp } = body;

    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Append to Analytics sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Analytics!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp || new Date().toISOString(),
          type || 'pageview',
          page || '',
          tool || '',
        ]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics log error:', error);
    // Don't fail the request if analytics fails
    return NextResponse.json({ success: false });
  }
}

// GET - Fetch analytics data (admin only)
export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address')?.toLowerCase();
  if (!walletAddress || walletAddress !== WHITELISTED_WALLET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch analytics data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Analytics!A:D',
    });

    const rows = response.data.values || [];

    // Skip header row
    const data = rows.slice(1).map(row => ({
      timestamp: row[0],
      type: row[1],
      page: row[2],
      tool: row[3],
    }));

    // Calculate stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayViews = data.filter(d => new Date(d.timestamp) >= today).length;
    const weekViews = data.filter(d => new Date(d.timestamp) >= weekAgo).length;
    const monthViews = data.filter(d => new Date(d.timestamp) >= monthAgo).length;
    const totalViews = data.length;

    // Page breakdown
    const pageViews: Record<string, number> = {};
    data.forEach(d => {
      if (d.page) {
        pageViews[d.page] = (pageViews[d.page] || 0) + 1;
      }
    });

    // Tool usage breakdown
    const toolUsage: Record<string, number> = {};
    data.filter(d => d.type === 'tool').forEach(d => {
      if (d.tool) {
        toolUsage[d.tool] = (toolUsage[d.tool] || 0) + 1;
      }
    });

    // Daily breakdown for chart (last 14 days)
    const dailyData: { date: string; views: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const views = data.filter(d => {
        const ts = new Date(d.timestamp);
        return ts >= date && ts < nextDate;
      }).length;
      dailyData.push({
        date: date.toISOString().split('T')[0],
        views,
      });
    }

    return NextResponse.json({
      stats: {
        todayViews,
        weekViews,
        monthViews,
        totalViews,
      },
      pageViews: Object.entries(pageViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      toolUsage: Object.entries(toolUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tool, count]) => ({ tool, count })),
      dailyData,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
