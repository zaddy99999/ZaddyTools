// Shareable links for views and filters

export interface ViewState {
  category?: 'all' | 'web2' | 'web3' | 'abstract';
  growthFilter?: 'all' | 'growing' | 'declining' | 'fastest';
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  compareChannels?: string[];
  chartTab?: 'giphy' | 'tiktok' | 'youtube';
}

export function encodeViewState(state: ViewState): string {
  const params = new URLSearchParams();

  if (state.category && state.category !== 'all') {
    params.set('cat', state.category);
  }
  if (state.growthFilter && state.growthFilter !== 'all') {
    params.set('growth', state.growthFilter);
  }
  if (state.sortField) {
    params.set('sort', state.sortField);
  }
  if (state.sortDirection) {
    params.set('dir', state.sortDirection);
  }
  if (state.search) {
    params.set('q', state.search);
  }
  if (state.compareChannels && state.compareChannels.length > 0) {
    params.set('compare', state.compareChannels.join(','));
  }
  if (state.chartTab) {
    params.set('tab', state.chartTab);
  }

  return params.toString();
}

export function decodeViewState(queryString: string): ViewState {
  const params = new URLSearchParams(queryString);
  const state: ViewState = {};

  const cat = params.get('cat');
  if (cat && ['all', 'web2', 'web3', 'abstract'].includes(cat)) {
    state.category = cat as ViewState['category'];
  }

  const growth = params.get('growth');
  if (growth && ['all', 'growing', 'declining', 'fastest'].includes(growth)) {
    state.growthFilter = growth as ViewState['growthFilter'];
  }

  const sort = params.get('sort');
  if (sort) {
    state.sortField = sort;
  }

  const dir = params.get('dir');
  if (dir && ['asc', 'desc'].includes(dir)) {
    state.sortDirection = dir as ViewState['sortDirection'];
  }

  const q = params.get('q');
  if (q) {
    state.search = q;
  }

  const compare = params.get('compare');
  if (compare) {
    state.compareChannels = compare.split(',').filter(Boolean);
  }

  const tab = params.get('tab');
  if (tab && ['giphy', 'tiktok', 'youtube'].includes(tab)) {
    state.chartTab = tab as ViewState['chartTab'];
  }

  return state;
}

export function generateShareableLink(state: ViewState): string {
  const encoded = encodeViewState(state);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return encoded ? `${baseUrl}?${encoded}` : baseUrl;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    });
}
