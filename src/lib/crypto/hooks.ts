'use client';

import { useRef, useEffect } from 'react';
import useSWR from 'swr';
import type { CoinMarketData, GlobalData, FearGreedData, NewsItem, DeFiProtocol, ChainData } from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  // Check if response is an error object
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(data.error);
  }
  return data;
};

function useLastUpdated<T>(data: T | undefined) {
  const lastUpdated = useRef<string | null>(null);

  useEffect(() => {
    if (data !== undefined) {
      lastUpdated.current = new Date().toISOString();
    }
  }, [data]);

  return lastUpdated.current;
}

interface GasData {
  low: number;
  average: number;
  fast: number;
}

interface GlobalMetricsData {
  global: GlobalData;
  fearGreed: FearGreedData;
  gas: GasData;
}

export function useCryptoPrices() {
  const { data, error, isLoading, mutate } = useSWR<CoinMarketData[]>(
    '/api/crypto/prices',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    prices: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}

export function useGlobalMetrics() {
  const { data, error, isLoading, mutate } = useSWR<GlobalMetricsData>(
    '/api/crypto/global',
    fetcher,
    {
      refreshInterval: 60000,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    global: data?.global,
    fearGreed: data?.fearGreed,
    gas: data?.gas,
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}

export function useNews() {
  const { data, error, isLoading, mutate } = useSWR<NewsItem[]>(
    '/api/crypto/news',
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes
      dedupingInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    news: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useFinanceNews() {
  const { data, error, isLoading, mutate } = useSWR<NewsItem[]>(
    '/api/finance/news',
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes
      dedupingInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    news: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useTVL() {
  const { data, error, isLoading, mutate } = useSWR<DeFiProtocol[]>(
    '/api/crypto/tvl',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    protocols: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useChains() {
  const { data, error, isLoading, mutate } = useSWR<ChainData[]>(
    '/api/crypto/chains',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );
  const lastUpdated = useLastUpdated(data);

  return {
    chains: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    refresh: mutate,
    lastUpdated,
  };
}
