import {
  getSheets,
  getSpreadsheetId,
  TABS,
} from './auth';

const MAX_CACHE_SIZE = 100;

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (map.has(key)) map.delete(key);
  while (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, value);
}

// ==================== GAME GUIDE DOCS ====================

export interface GameGuideDoc {
  gameId: string;
  gameName: string;
  title: string;
  content: string;
  sourceUrls?: string[];
}

// Cache for fetched URL content (persists during server runtime)
const urlContentCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Extract URLs from text (handles multiple URLs per cell, newline or comma separated)
function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s,\n]+/g;
  const matches = text.match(urlPattern) || [];
  return matches.map(url => url.trim().replace(/[,;]$/, '')); // Clean trailing punctuation
}

// Convert Google Docs URL to export format
function convertGoogleDocUrl(url: string): string {
  // Match Google Docs URL pattern
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    const docId = docMatch[1];
    return `https://docs.google.com/document/d/${docId}/export?format=txt`;
  }
  return url;
}

// Fetch content from a URL (GitBook, docs sites, etc.) with caching
async function fetchDocContent(url: string): Promise<string> {
  // Convert Google Docs URLs to export format
  const fetchUrl = convertGoogleDocUrl(url);

  // Check cache first
  const cached = urlContentCache.get(fetchUrl);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    return cached.content;
  }
  try {
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZaddyTools/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();

    // Extract text content from HTML (simple extraction)
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // Convert common HTML elements to text
    text = text
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n## $1\n')
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Limit content length to avoid token limits
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '\n\n[Content truncated...]';
    }

    // Cache the result (use original URL as key for consistency)
    setWithLimit(urlContentCache, fetchUrl, { content: text, fetchedAt: Date.now() });

    return text;
  } catch (error) {
    console.error(`Error fetching doc from ${url}:`, error);
    return '';
  }
}

export async function getGameGuideDocs(gameId?: string): Promise<GameGuideDoc[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    // Read all columns (A through Z to capture all content)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.GAME_GUIDE_DOCS}!A:Z`,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) return [];

    // Get header row to determine column mapping
    const header = rows[0].map((h: string) => h?.toLowerCase().trim() || '');

    // Find column indices (flexible matching)
    const gameIdCol = header.findIndex((h: string) => h.includes('game') && h.includes('id')) !== -1
      ? header.findIndex((h: string) => h.includes('game') && h.includes('id'))
      : header.findIndex((h: string) => h === 'id' || h === 'game_id');
    const nameCol = header.findIndex((h: string) => h === 'name' || h === 'game_name' || h === 'game name');
    const contentCol = header.findIndex((h: string) =>
      h.includes('content') || h.includes('docs') || h.includes('documentation') || h.includes('resource')
    );

    const docs: GameGuideDoc[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Get values from mapped columns, with fallbacks
      const docGameId = (gameIdCol >= 0 ? row[gameIdCol] : row[1])?.trim() || '';
      const docName = (nameCol >= 0 ? row[nameCol] : row[0])?.trim() || '';

      // Collect all resource links/content from columns
      const allUrls: string[] = [];
      let directContent = '';

      for (let c = 3; c < row.length; c++) {
        const cellValue = row[c]?.trim() || '';
        if (cellValue) {
          // Extract any URLs from the cell (handles multiple URLs per cell)
          const urls = extractUrls(cellValue);
          allUrls.push(...urls);

          // Also check for non-URL text content
          const textWithoutUrls = cellValue.replace(/https?:\/\/[^\s,\n]+/g, '').trim();
          if (textWithoutUrls) {
            directContent += '\n\n' + textWithoutUrls;
          }
        }
      }

      const doc: GameGuideDoc = {
        gameId: docGameId,
        gameName: docName,
        title: `${docName} Documentation`,
        content: directContent.trim(),
        sourceUrls: allUrls.length > 0 ? allUrls : undefined,
      };

      // Filter by gameId if provided
      if (doc.gameId && (doc.content || doc.sourceUrls?.length)) {
        if (!gameId || doc.gameId === gameId) {
          docs.push(doc);
        }
      }
    }

    return docs;
  } catch (error) {
    console.error('Error fetching game guide docs:', error);
    return [];
  }
}

// Fetch and enrich docs with content from URLs
export async function getGameGuideDocsWithContent(gameId?: string): Promise<GameGuideDoc[]> {
  const docs = await getGameGuideDocs(gameId);

  // Fetch content from all URLs in parallel
  const enrichedDocs = await Promise.all(
    docs.map(async (doc) => {
      let combinedContent = doc.content || '';

      if (doc.sourceUrls && doc.sourceUrls.length > 0) {
        // Fetch all URLs for this doc
        const fetchResults = await Promise.all(
          doc.sourceUrls.map(url => fetchDocContent(url))
        );

        // Combine fetched content
        for (let i = 0; i < doc.sourceUrls.length; i++) {
          if (fetchResults[i]) {
            combinedContent += `\n\n--- Source: ${doc.sourceUrls[i]} ---\n\n${fetchResults[i]}`;
          }
        }
      }

      return {
        ...doc,
        content: combinedContent.trim() || `[Could not fetch content from URLs]`,
      };
    })
  );

  return enrichedDocs.filter(doc => doc.content && !doc.content.startsWith('[Could not'));
}

export async function populateGameGuideGames(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const games = [
    { id: 'general', name: 'General', title: 'Abstract Overview', content: 'Abstract is a Layer 2 blockchain built for consumer crypto applications, particularly gaming and NFTs. It features low fees, fast transactions, and a focus on gaming and consumer apps.' },
    { id: 'gigaverse', name: 'Gigaverse', title: 'Overview', content: '[Add Gigaverse documentation here]' },
    { id: 'moody-madness', name: 'Moody Madness', title: 'Overview', content: '[Add Moody Madness documentation here]' },
    { id: 'hamieverse', name: 'Hamieverse', title: 'Overview', content: '[Add Hamieverse documentation here]' },
    { id: 'ruyui', name: 'Ruyui', title: 'Overview', content: '[Add Ruyui documentation here]' },
    { id: 'cambria', name: 'Cambria', title: 'Overview', content: '[Add Cambria documentation here]' },
    { id: 'duper', name: 'Duper', title: 'Overview', content: '[Add Duper documentation here]' },
    { id: 'onchainheroes', name: 'OnchainHeroes', title: 'Overview', content: '[Add OnchainHeroes documentation here]' },
  ];

  const rows = games.map(g => [g.id, g.name, g.title, g.content]);

  // Clear existing data (except header) and write new games
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.GAME_GUIDE_DOCS}!A2:D100`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.GAME_GUIDE_DOCS}!A2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

// Game Guide FAQ - hardcoded answers from sheet
export interface GameGuideFAQ {
  gameId: string;
  keywords: string[];
  answer: string;
}

export async function getGameGuideFAQs(gameId?: string): Promise<GameGuideFAQ[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.GAME_GUIDE_FAQ}!A:C`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const faqs: GameGuideFAQ[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const keywords = (row[1] || '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
      const answer = row[2]?.trim() || '';

      if (rowGameId && keywords.length > 0 && answer) {
        if (!gameId || rowGameId === gameId) {
          faqs.push({ gameId: rowGameId, keywords, answer });
        }
      }
    }
    return faqs;
  } catch {
    // Tab might not exist yet, that's ok
    return [];
  }
}

export async function findFAQAnswer(gameId: string, question: string): Promise<string | null> {
  const faqs = await getGameGuideFAQs(gameId);
  const questionLower = question.toLowerCase();

  for (const faq of faqs) {
    // Check if any keyword matches the question
    if (faq.keywords.some(kw => questionLower.includes(kw))) {
      return faq.answer;
    }
  }
  return null;
}

