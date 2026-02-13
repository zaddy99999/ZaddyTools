// Favorites management using localStorage
const FAVORITES_KEY = 'zaddytools_favorites';

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFavorite(channelUrl: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(channelUrl)) {
    favorites.push(channelUrl);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  return favorites;
}

export function removeFavorite(channelUrl: string): string[] {
  const favorites = getFavorites().filter(url => url !== channelUrl);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

export function toggleFavorite(channelUrl: string): { favorites: string[]; isFavorite: boolean } {
  const favorites = getFavorites();
  const isFavorite = favorites.includes(channelUrl);
  if (isFavorite) {
    return { favorites: removeFavorite(channelUrl), isFavorite: false };
  } else {
    return { favorites: addFavorite(channelUrl), isFavorite: true };
  }
}

export function isFavorite(channelUrl: string): boolean {
  return getFavorites().includes(channelUrl);
}
