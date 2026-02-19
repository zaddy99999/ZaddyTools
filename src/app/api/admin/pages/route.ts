import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

// All available pages in the app
const ALL_PAGES = [
  { path: '/', name: 'Social Analytics', category: 'Main' },
  { path: '/market-analysis', name: 'Market Analysis', category: 'Main' },
  { path: '/news', name: 'News / Resources', category: 'Main' },
  { path: '/abstract-dashboard', name: 'Abstract Dashboard', category: 'Abstract' },
  { path: '/xp-card', name: 'ID Card / XP Card', category: 'Abstract' },
  { path: '/tier-maker', name: 'Tier List', category: 'Abstract' },
  { path: '/build-your-team', name: 'Build Your Team', category: 'Abstract' },
  { path: '/wallet-analytics', name: 'Wallet Analysis', category: 'Abstract' },
  { path: '/developer-notes', name: 'Developer Notes', category: 'Other' },
];

export type PageStatus = 'live' | 'paused' | 'testing' | 'maintenance';

interface PageConfig {
  path: string;
  name: string;
  category: string;
  status: PageStatus;
  updatedAt: string;
  message?: string; // Custom message for paused/maintenance pages
}

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

// GET - Fetch all page statuses
export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address')?.toLowerCase();
  const isAdmin = walletAddress === WHITELISTED_WALLET;

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Try to fetch page configs from sheet
    let pageConfigs: PageConfig[] = [];

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'PageStatus!A:F',
      });

      const rows = response.data.values || [];
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) {
          pageConfigs.push({
            path: row[0],
            name: row[1] || '',
            category: row[2] || '',
            status: (row[3] as PageStatus) || 'live',
            updatedAt: row[4] || '',
            message: row[5] || '',
          });
        }
      }
    } catch {
      // Sheet might not exist yet, will create with defaults
    }

    // Merge with ALL_PAGES to ensure all pages are included
    const mergedPages: PageConfig[] = ALL_PAGES.map(page => {
      const existing = pageConfigs.find(p => p.path === page.path);
      return existing || {
        ...page,
        status: 'live' as PageStatus,
        updatedAt: '',
      };
    });

    // Non-admin users only get public info (which pages are paused/maintenance)
    if (!isAdmin) {
      return NextResponse.json({
        pages: mergedPages.map(p => ({
          path: p.path,
          status: p.status,
          message: p.status !== 'live' ? p.message : undefined,
        })),
      });
    }

    return NextResponse.json({ pages: mergedPages });
  } catch (error) {
    console.error('Page status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch page statuses' }, { status: 500 });
  }
}

// POST - Update page status (admin only)
export async function POST(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address')?.toLowerCase();
  if (!walletAddress || walletAddress !== WHITELISTED_WALLET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, status, message } = body;

    if (!path || !status) {
      return NextResponse.json({ error: 'Path and status required' }, { status: 400 });
    }

    const validStatuses: PageStatus[] = ['live', 'paused', 'testing', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const pageInfo = ALL_PAGES.find(p => p.path === path);
    if (!pageInfo) {
      return NextResponse.json({ error: 'Unknown page' }, { status: 400 });
    }

    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure sheet exists with headers
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'PageStatus!A1',
      });
    } catch {
      // Create sheet with headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'PageStatus!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Path', 'Name', 'Category', 'Status', 'UpdatedAt', 'Message']],
        },
      });
    }

    // Get existing data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'PageStatus!A:F',
    });

    const rows = response.data.values || [['Path', 'Name', 'Category', 'Status', 'UpdatedAt', 'Message']];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === path);
    const updatedAt = new Date().toISOString();

    const newRow = [path, pageInfo.name, pageInfo.category, status, updatedAt, message || ''];

    if (rowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `PageStatus!A${rowIndex + 1}:F${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'PageStatus!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [newRow],
        },
      });
    }

    return NextResponse.json({
      success: true,
      page: {
        path,
        name: pageInfo.name,
        category: pageInfo.category,
        status,
        updatedAt,
        message,
      }
    });
  } catch (error) {
    console.error('Page status update error:', error);
    return NextResponse.json({ error: 'Failed to update page status' }, { status: 500 });
  }
}
