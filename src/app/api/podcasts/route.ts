import { NextResponse } from 'next/server';

interface Podcast {
  id: string;
  name: string;
  author: string;
  artwork: string;
  url: string;
  feedUrl: string;
  genre: string;
  episodeCount: number;
  category: 'crypto' | 'ai';
}

// Custom podcasts with manual data (not from iTunes)
const customPodcasts: Podcast[] = [
  {
    id: 'podcast-new-wave',
    name: 'New Wave',
    author: 'Elisa (@eeelistar)',
    artwork: 'https://i.scdn.co/image/ab6765630000ba8af3c49112c74d7e2085f53947',
    url: 'https://open.spotify.com/show/0Hi8GzwBmPsBiq14MEocUk',
    feedUrl: '',
    genre: 'Business',
    episodeCount: 3,
    category: 'crypto',
  },
];

// Curated list of top crypto and AI podcasts to fetch
const curatedPodcasts = {
  crypto: [
    'Bankless',
    'Unchained Podcast',
    'What Bitcoin Did',
    'The Pomp Podcast',
    'Coin Bureau Podcast',
    'The Breakdown with NLW',
    'Empire Podcast Blockworks',
    'Epicenter Podcast',
    'The Defiant Podcast',
    'Crypto Critics Corner',
    'Real Vision Crypto',
    'Thinking Crypto',
    'The Wolf Of All Streets',
  ],
  ai: [
    'Lex Fridman Podcast',
    'The AI Podcast NVIDIA',
    'Practical AI',
    'Machine Learning Street Talk',
    'The TWIML AI Podcast',
    'AI Daily Brief',
    'Hard Fork New York Times',
    'The Vergecast',
    'Waveform MKBHD',
    'All-In Podcast',
    'No Priors AI',
    'Latent Space Podcast',
  ],
};

interface iTunesPodcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  artworkUrl600: string;
  collectionViewUrl: string;
  feedUrl: string;
  primaryGenreName: string;
  releaseDate: string;
  trackCount: number;
}

let cache: { data: Podcast[]; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (podcasts don't update frequently)

async function searchPodcast(query: string, category: 'crypto' | 'ai'): Promise<Podcast | null> {
  try {
    const searchQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${searchQuery}&media=podcast&limit=1`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results as iTunesPodcast[];

    if (results.length === 0) return null;

    const podcast = results[0];
    return {
      id: `podcast-${podcast.collectionId}`,
      name: podcast.collectionName,
      author: podcast.artistName,
      artwork: podcast.artworkUrl600 || podcast.artworkUrl100,
      url: podcast.collectionViewUrl,
      feedUrl: podcast.feedUrl || '',
      genre: podcast.primaryGenreName,
      episodeCount: podcast.trackCount,
      category,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch all podcasts in parallel
    const cryptoPromises = curatedPodcasts.crypto.map(name => searchPodcast(name, 'crypto'));
    const aiPromises = curatedPodcasts.ai.map(name => searchPodcast(name, 'ai'));

    const [cryptoResults, aiResults] = await Promise.all([
      Promise.all(cryptoPromises),
      Promise.all(aiPromises),
    ]);

    // Filter out nulls and combine (custom podcasts first)
    const allPodcasts = [
      ...customPodcasts,
      ...cryptoResults.filter((p): p is Podcast => p !== null),
      ...aiResults.filter((p): p is Podcast => p !== null),
    ];

    // Deduplicate by podcast ID
    const seen = new Set<string>();
    const dedupedPodcasts = allPodcasts.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    cache = { data: dedupedPodcasts, timestamp: Date.now() };
    return NextResponse.json(dedupedPodcasts);
  } catch (error) {
    console.error('Error fetching podcasts:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json([]);
  }
}
