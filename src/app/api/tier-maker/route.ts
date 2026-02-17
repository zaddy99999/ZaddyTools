import { NextResponse } from 'next/server';
import { getTierMakerItems, addTierMakerItems, updateTierMakerItem } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rateLimit';

// Rate limit: 30 requests per minute
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 30,       // 30 requests per minute
};

// Input validation constants
const MAX_NAME_LENGTH = 200;
const MAX_HANDLE_LENGTH = 100;
const MAX_URL_LENGTH = 2000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_ITEMS_PER_REQUEST = 100;

// URL validation regex - allows http/https URLs
const URL_REGEX = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;

// Sanitize string to prevent XSS
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate URL format
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > MAX_URL_LENGTH) return false;
  return URL_REGEX.test(url);
}

// Validate a single tier maker item
function validateItem(item: any): { valid: boolean; error?: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Item must be an object' };
  }

  if (item.name && (typeof item.name !== 'string' || item.name.length > MAX_NAME_LENGTH)) {
    return { valid: false, error: `Name must be a string of ${MAX_NAME_LENGTH} characters or less` };
  }

  if (item.handle && (typeof item.handle !== 'string' || item.handle.length > MAX_HANDLE_LENGTH)) {
    return { valid: false, error: `Handle must be a string of ${MAX_HANDLE_LENGTH} characters or less` };
  }

  if (item.category && (typeof item.category !== 'string' || item.category.length > MAX_CATEGORY_LENGTH)) {
    return { valid: false, error: `Category must be a string of ${MAX_CATEGORY_LENGTH} characters or less` };
  }

  if (item.url && !isValidUrl(item.url)) {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true };
}

// Category sort order (first to last)
const CATEGORY_ORDER = [
  'NFT + Game',
  'Defi',
  'NFT',
  'Game',
  'Social',
  'Infrastructure',
  'Other',
  'Memecoins',
];

// Normalize category names
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  // Combine game,nft and nft,game variations
  if (lower === 'game,nft' || lower === 'nft,game' || lower === 'game, nft' || lower === 'nft, game') {
    return 'NFT + Game';
  }
  // Capitalize first letter of each word
  return category.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Sort items by priority first, then category order
function sortByCategory(items: any[]): any[] {
  return items.sort((a, b) => {
    // Priority items always come first
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;

    // Then sort by category
    const catA = a.category || 'Other';
    const catB = b.category || 'Other';
    const indexA = CATEGORY_ORDER.indexOf(catA);
    const indexB = CATEGORY_ORDER.indexOf(catB);
    // If not in order list, put before Memecoins but after known categories
    const orderA = indexA === -1 ? CATEGORY_ORDER.length - 2 : indexA;
    const orderB = indexB === -1 ? CATEGORY_ORDER.length - 2 : indexB;
    return orderA - orderB;
  });
}

export async function GET(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const items = await getTierMakerItems();
    // Normalize categories
    const normalizedItems = items.map((item: any) => ({
      ...item,
      category: item.category ? normalizeCategory(item.category) : 'Other',
    }));
    // Sort by category order
    const sortedItems = sortByCategory(normalizedItems);
    return NextResponse.json(sortedItems);
  } catch (error) {
    console.error('Error fetching tier maker items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { items } = body;
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    // Limit number of items per request
    if (items.length > MAX_ITEMS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ITEMS_PER_REQUEST} items allowed per request` },
        { status: 400 }
      );
    }

    // Validate and sanitize each item
    const sanitizedItems: { handle: string; name?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const validation = validateItem(items[i]);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Item ${i + 1}: ${validation.error}` },
          { status: 400 }
        );
      }

      // Handle is required for tier maker items
      const handle = items[i].handle ? sanitizeString(items[i].handle) : '';
      if (!handle) {
        return NextResponse.json(
          { error: `Item ${i + 1}: handle is required` },
          { status: 400 }
        );
      }

      sanitizedItems.push({
        handle,
        name: items[i].name ? sanitizeString(items[i].name) : undefined,
      });
    }

    await addTierMakerItems(sanitizedItems);
    return NextResponse.json({ success: true, count: sanitizedItems.length });
  } catch (error) {
    console.error('Error adding tier maker items:', error);
    return NextResponse.json({ error: 'Failed to add items' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { name, newUrl } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required and must be a string' }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `name must be ${MAX_NAME_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Validate newUrl
    if (!newUrl || typeof newUrl !== 'string') {
      return NextResponse.json({ error: 'newUrl is required and must be a string' }, { status: 400 });
    }
    if (!isValidUrl(newUrl)) {
      return NextResponse.json({ error: 'Invalid URL format for newUrl' }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedUrl = sanitizeString(newUrl);

    await updateTierMakerItem(sanitizedName, sanitizedUrl);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tier maker item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
